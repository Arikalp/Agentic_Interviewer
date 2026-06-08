import type { BehaviorMetrics } from '@/lib/behavior-metrics';

// Configuration shape expected by the behavior analyzer factory.
// Consumers can override model paths, runtime modes, emotion labels and
// performance-related options (fps, wasm base URLs). `onError` allows
// callers to be notified when the analyzer encounters a runtime problem.
type BehaviorAnalyzerConfig = {
  emotionModelPath: string;
  faceModelPath: string;
  faceRunningMode?: 'VIDEO' | 'IMAGE';
  emotionLabels: string[];
  fps: number;
  ortWasmBaseUrl: string;
  visionWasmBaseUrl: string;
  emotionInputOverride?: {
    channels: number;
    width: number;
    height: number;
  };
  onError?: (error: Error) => void;
};

// Describes the ONNX model input/output names and expected dimensions.
type InputSpec = {
  inputName: string;
  outputName: string;
  channels: number;
  width: number;
  height: number;
};

// Container for loaded vision assets: mediapipe face landmarker,
// ONNX inference session and the resolved input spec for the model.
type VisionAssets = {
  faceLandmarker: any;
  emotionSession: any;
  ort: any;
  inputSpec: InputSpec;
};

// Normalized center point expressed in [0,1] coordinates relative to frame.
type CenterPoint = {
  x: number;
  y: number;
};

// Keep label order in sync with the emotion model output indices.
// These labels correspond to the indices produced by the emotion model.
const DEFAULT_EMOTION_LABELS = [
  'neutral',
  'happiness',
  'surprise',
  'sadness',
  'anger',
  'disgust',
  'fear',
  'contempt',
];

// Reasonable defaults for running the analyzer in the browser.
const DEFAULT_CONFIG: BehaviorAnalyzerConfig = {
  emotionModelPath: '/models/ferplus.onnx',
  faceModelPath: '/models/face_landmarker.task',
  faceRunningMode: 'IMAGE',
  emotionLabels: DEFAULT_EMOTION_LABELS,
  fps: 5,
  ortWasmBaseUrl: '/wasm/onnxruntime/',
  visionWasmBaseUrl: '/wasm/mediapipe',
  emotionInputOverride: {
    channels: 1,
    width: 64,
    height: 64,
  },
};

// Patterns used to filter noisy MediaPipe logs that are not actionable
// for end users (these come from underlying wasm/runtime libraries).
const MEDIA_PIPE_LOG_PATTERNS = [
  /XNNPACK delegate/i,
  /FaceBlendshapesGraph acceleration/i,
  /OpenGL error checking is disabled/i,
  /Feedback manager requires a model/i,
];

const LOG_FILTER_FLAG = '__mpLogFilterInstalled';

// Helper to detect MediaPipe runtime log messages that should be suppressed.
function shouldSuppressMediaPipeLog(args: unknown[]) {
  const first = args[0];
  if (typeof first !== 'string') {
    return false;
  }

  return MEDIA_PIPE_LOG_PATTERNS.some((pattern) => pattern.test(first));
}

// Replace console.warn/error with filters so noisy library logs don't
// flood the console during development. This is safe to call multiple
// times — it will only install the filter once.
function installMediaPipeLogFilter() {
  const globalAny = globalThis as typeof globalThis & {
    [LOG_FILTER_FLAG]?: boolean;
  };

  if (globalAny[LOG_FILTER_FLAG]) {
    return;
  }

  globalAny[LOG_FILTER_FLAG] = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    if (shouldSuppressMediaPipeLog(args)) {
      return;
    }
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    if (shouldSuppressMediaPipeLog(args)) {
      return;
    }
    originalWarn(...args);
  };
}

class BehaviorAccumulator {
  private readonly emotionLabels: string[];
  private frameCount = 0;
  private faceFrameCount = 0;
  private emotionSums: number[];
  private centerDistanceSum = 0;
  private headMovementSum = 0;
  private headMovementCount = 0;
  private lastCenter: CenterPoint | null = null;

  // Accumulates per-frame statistics for a short analysis window.
  // The accumulator tracks how often a face appears, average centering,
  // head movement magnitude and cumulative emotion scores so we can
  // synthesize higher-level metrics when the window ends.
  constructor(emotionLabels: string[]) {
    this.emotionLabels = emotionLabels;
    this.emotionSums = new Array(emotionLabels.length).fill(0);
  }

  addFrame(input: {
    center: CenterPoint | null;
    emotionProbs: number[] | null;
  }) {
    this.frameCount += 1;

    // If no face center is provided, count the frame as lacking a face
    // and clear lastCenter so subsequent movement is not computed.
    if (!input.center) {
      this.lastCenter = null;
      return;
    }

    this.faceFrameCount += 1;

    // Distance from the normalized center (0.5, 0.5). Smaller is better.
    const centerDistance = Math.hypot(input.center.x - 0.5, input.center.y - 0.5);
    this.centerDistanceSum += centerDistance;

    // Compute per-frame head movement as Euclidean difference between
    // the facial center points across consecutive frames. This yields
    // a simple magnitude of motion to inform the movement score.
    if (this.lastCenter) {
      const movement = Math.hypot(
        input.center.x - this.lastCenter.x,
        input.center.y - this.lastCenter.y,
      );
      this.headMovementSum += movement;
      this.headMovementCount += 1;
    }

    this.lastCenter = input.center;

    // Accumulate raw emotion probabilities (or 0 when missing) per-label.
    if (input.emotionProbs) {
      for (let i = 0; i < this.emotionSums.length; i += 1) {
        this.emotionSums[i] += input.emotionProbs[i] ?? 0;
      }
    }
  }

  summarize(): BehaviorMetrics | null {
    if (this.frameCount === 0) {
      return null;
    }

    const facePresenceRatio = this.faceFrameCount / this.frameCount;
    const avgCenterDistance =
      this.faceFrameCount > 0 ? this.centerDistanceSum / this.faceFrameCount : 1;
    const avgCenteringScore = 1 - clamp(avgCenterDistance / 0.5, 0, 1);
    const avgHeadMovement =
      this.headMovementCount > 0 ? this.headMovementSum / this.headMovementCount : 0;

    const emotionAverages: Record<string, number> = {};
    for (let i = 0; i < this.emotionLabels.length; i += 1) {
      emotionAverages[this.emotionLabels[i]] =
        this.faceFrameCount > 0 ? this.emotionSums[i] / this.faceFrameCount : 0;
    }

    const neutral = emotionAverages.neutral ?? 0;
    const happiness = emotionAverages.happiness ?? 0;
    const negative =
      (emotionAverages.anger ?? 0) +
      (emotionAverages.fear ?? 0) +
      (emotionAverages.sadness ?? 0) +
      (emotionAverages.disgust ?? 0) +
      (emotionAverages.contempt ?? 0);

    // Combine signals into interpretable scores:
    // - movementScore: penalizes excessive head motion
    // - baseConfidence: weighted blend of presence, centering, movement, and positive emotions
    // - confidencePenalty: penalize missing faces and negative emotions
    // The exponent applied to confidenceBlend sharpens high confidence values.
    const movementScore = 1 - clamp(avgHeadMovement / 0.15, 0, 1);
    const baseConfidence =
      facePresenceRatio * 0.35 +
      avgCenteringScore * 0.2 +
      movementScore * 0.2 +
      (neutral + happiness) * 0.25;
    const confidencePenalty = (1 - facePresenceRatio) * 0.25 + negative * 0.4;
    const adjustedConfidence = clamp(baseConfidence - confidencePenalty, 0, 1);
    const confidenceBlend = Math.pow(adjustedConfidence, 1.6);
    const anxietyBlend = negative * 0.7 + (1 - avgCenteringScore) * 0.3;

    const numericConfidence = Math.round(clamp(confidenceBlend, 0, 1) * 100);
    const numericAnxiety = Math.round(clamp(anxietyBlend, 0, 1) * 100);

    const { label: confidenceLabel, summary: confidenceSummary } = describeConfidence(
      numericConfidence,
      facePresenceRatio,
      numericAnxiety,
      avgCenteringScore,
      emotionAverages,
    );

    return {
      frameCount: this.frameCount,
      faceFrameCount: this.faceFrameCount,
      facePresenceRatio,
      avgCenteringScore,
      avgHeadMovement,
      emotionAverages,
      confidenceScore: numericConfidence,
      confidenceLabel,
      confidenceSummary,
      anxietyScore: numericAnxiety,
    };
  }
}

// Simple clamp helper to bound a number between min and max.
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Build a human-readable confidence label and short summary using
// the numeric score and auxiliary signals. The heuristics here prefer
// face visibility and centering; negative emotion presence reduces
// the confidence label and adds reasons to the summary.
function describeConfidence(
  score: number,
  facePresenceRatio: number,
  anxietyScore: number,
  avgCenteringScore: number,
  emotionAverages: Record<string, number>,
) {
  let label = 'Moderate';
  if (score >= 85) label = 'Very confident';
  else if (score >= 70) label = 'Confident';
  else if (score >= 50) label = 'Somewhat confident';
  else if (score >= 30) label = 'Low confidence';
  else label = 'Very low confidence';

  // Build a short descriptive sentence using a few signals.
  const reasons: string[] = [];
  if (facePresenceRatio < 0.6) reasons.push('low face visibility');
  if (avgCenteringScore < 0.6) reasons.push('off-center framing');
  if (anxietyScore > 65) reasons.push('signs of anxiety');

  // Look for dominant negative emotion
  const negativeEmotions = ['anger', 'fear', 'sadness', 'disgust', 'contempt'];
  let dominantNegative = '';
  for (const e of negativeEmotions) {
    if ((emotionAverages[e] ?? 0) > 0.4) {
      dominantNegative = e;
      break;
    }
  }
  if (dominantNegative) reasons.push(`noticeable ${dominantNegative}`);

  const reasonText = reasons.length > 0 ? ` — ${reasons.join(', ')}` : '';

  const summary = `${label}${reasonText}.`;

  return { label, summary };
}

// Numerically-stable softmax implementation for model logits.
// Subtracting the max value avoids overflow for large logits.
function softmax(input: Float32Array) {
  let maxValue = -Infinity;
  for (const value of input) {
    if (value > maxValue) {
      maxValue = value;
    }
  }

  const expValues = input.map((value) => Math.exp(value - maxValue));
  let sum = 0;
  for (const value of expValues) {
    sum += value;
  }

  return expValues.map((value) => value / sum);
}

// Ensure the model-provided dimension is usable; otherwise, fall back.
function normalizeDimension(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveInputSpec(
  session: any,
  fallbackSize = 224,
  override?: { channels: number; width: number; height: number },
): InputSpec {
  const inputName = session.inputNames?.[0] ?? 'input';
  const outputName = session.outputNames?.[0] ?? 'output';
  const metadata = session.inputMetadata?.[inputName];
  const dims = Array.isArray(metadata?.dimensions) ? metadata.dimensions : [];

  const channels = override?.channels ?? normalizeDimension(dims[1], 3);
  const height = override?.height ?? normalizeDimension(dims[2], fallbackSize);
  const width = override?.width ?? normalizeDimension(dims[3], fallbackSize);

  return {
    inputName,
    outputName,
    channels,
    width,
    height,
  };
}

function buildInputTensor(
  imageData: ImageData,
  spec: InputSpec,
  ort: any,
) {
  const { width, height, channels } = spec;
  const pixelData = imageData.data;
  const frameSize = width * height;
  const tensorData = new Float32Array(frameSize * channels);

  for (let i = 0; i < frameSize; i += 1) {
    const pixelIndex = i * 4;
    const r = pixelData[pixelIndex] / 255;
    const g = pixelData[pixelIndex + 1] / 255;
    const b = pixelData[pixelIndex + 2] / 255;

    if (channels === 1) {
      tensorData[i] = (r + g + b) / 3;
    } else {
      tensorData[i] = r;
      tensorData[i + frameSize] = g;
      tensorData[i + frameSize * 2] = b;
    }
  }

  return new ort.Tensor('float32', tensorData, [1, channels, height, width]);
}

function computeBoundingBox(landmarks: Array<{ x: number; y: number }>) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const landmark of landmarks) {
    minX = Math.min(minX, landmark.x);
    minY = Math.min(minY, landmark.y);
    maxX = Math.max(maxX, landmark.x);
    maxY = Math.max(maxY, landmark.y);
  }

  // Add a small padding around the face box so the emotion model gets
  // a slightly larger crop. Results are clamped to normalized [0,1]
  // coordinates to avoid sampling outside the frame.
  const padding = 0.15;
  return {
    minX: clamp(minX - padding, 0, 1),
    minY: clamp(minY - padding, 0, 1),
    maxX: clamp(maxX + padding, 0, 1),
    maxY: clamp(maxY + padding, 0, 1),
  };
}

function averageLandmark(landmarks: Array<{ x: number; y: number }>): CenterPoint {
  let xSum = 0;
  let ySum = 0;

  for (const landmark of landmarks) {
    xSum += landmark.x;
    ySum += landmark.y;
  }

  const count = Math.max(landmarks.length, 1);

  return {
    x: xSum / count,
    y: ySum / count,
  };
}

export function createBehaviorAnalyzer(configOverrides: Partial<BehaviorAnalyzerConfig> = {}) {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  let assetsPromise: Promise<VisionAssets> | null = null;
  let assets: VisionAssets | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let processing = false;
  let accumulator: BehaviorAccumulator | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let frameCanvas: HTMLCanvasElement | null = null;
  let frameCtx: CanvasRenderingContext2D | null = null;
  let lastError: Error | null = null;

  // Internal helper to normalize and report errors to the provided handler
  // while ensuring the analyzer stops running and clears the interval.
  const reportError = (error: unknown) => {
    const normalized =
      error instanceof Error ? error : new Error('Behavior analysis failed to run.');
    lastError = normalized;
    if (config.onError) {
      config.onError(normalized);
    }

    running = false;
    processing = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const loadAssets = async () => {
    if (assetsPromise) {
      return assetsPromise;
    }

    assetsPromise = (async () => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        installMediaPipeLogFilter();
      }

      const [{ FaceLandmarker, FilesetResolver }, ort] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        import('onnxruntime-web'),
      ]);

      if (config.ortWasmBaseUrl) {
        ort.env.wasm.wasmPaths = config.ortWasmBaseUrl;
      }

      const visionFileset = await FilesetResolver.forVisionTasks(
        config.visionWasmBaseUrl,
      );
      const faceLandmarker = await FaceLandmarker.createFromOptions(visionFileset, {
        baseOptions: {
          modelAssetPath: config.faceModelPath,
        },
        runningMode: config.faceRunningMode ?? 'IMAGE',
        numFaces: 1,
      });

      const emotionSession = await ort.InferenceSession.create(config.emotionModelPath, {
        executionProviders: ['wasm'],
      });

      const inputSpec = resolveInputSpec(
        emotionSession,
        224,
        config.emotionInputOverride,
      );

      return {
        faceLandmarker,
        emotionSession,
        ort,
        inputSpec,
      };
    })();

    return assetsPromise;
  };

  const processFrame = async () => {
    if (!running || processing || !assets || !videoElement || !ctx) {
      return;
    }

    if (videoElement.readyState < 2) {
      return;
    }

    if (videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
      return;
    }

    processing = true;

    try {
      const runningMode = config.faceRunningMode ?? 'IMAGE';
      let detection;

      if (runningMode === 'VIDEO') {
        detection = assets.faceLandmarker.detectForVideo(videoElement, performance.now());
      } else {
        if (!frameCanvas) {
          frameCanvas = document.createElement('canvas');
          frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
        }

        if (!frameCtx || !frameCanvas) {
          throw new Error('Unable to access frame canvas for face detection.');
        }

        const frameWidth = videoElement.videoWidth;
        const frameHeight = videoElement.videoHeight;
        if (frameCanvas.width !== frameWidth || frameCanvas.height !== frameHeight) {
          frameCanvas.width = frameWidth;
          frameCanvas.height = frameHeight;
        }

        frameCtx.drawImage(videoElement, 0, 0, frameWidth, frameHeight);
        const frameData = frameCtx.getImageData(0, 0, frameWidth, frameHeight);
        detection = assets.faceLandmarker.detect(frameData);
      }
      const landmarks = detection?.faceLandmarks?.[0] ?? null;

      if (!landmarks || landmarks.length === 0) {
        accumulator?.addFrame({ center: null, emotionProbs: null });
        return;
      }

      const center = averageLandmark(landmarks);
      const bbox = computeBoundingBox(landmarks);

      const videoWidth = videoElement.videoWidth || videoElement.clientWidth;
      const videoHeight = videoElement.videoHeight || videoElement.clientHeight;

      const sx = Math.floor(bbox.minX * videoWidth);
      const sy = Math.floor(bbox.minY * videoHeight);
      const sWidth = Math.max(1, Math.floor((bbox.maxX - bbox.minX) * videoWidth));
      const sHeight = Math.max(1, Math.floor((bbox.maxY - bbox.minY) * videoHeight));

      if (!canvas || !ctx) {
        throw new Error('Frame canvas is not available for emotion inference.');
      }

      const { width, height } = assets.inputSpec;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.drawImage(videoElement, sx, sy, sWidth, sHeight, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const inputTensor = buildInputTensor(imageData, assets.inputSpec, assets.ort);

      const output = await assets.emotionSession.run({
        [assets.inputSpec.inputName]: inputTensor,
      });

      const outputTensor = output[assets.inputSpec.outputName];
      const rawScores = outputTensor?.data as Float32Array | undefined;
      const emotionProbs = rawScores ? Array.from(softmax(rawScores)) : null;

      accumulator?.addFrame({ center, emotionProbs });
    } catch (error) {
      reportError(error);
    } finally {
      processing = false;
    }
  };

  const start = async (video: HTMLVideoElement) => {
    if (running) {
      return;
    }

    try {
      assets = await loadAssets();
    } catch (error) {
      reportError(error);
      return;
    }
    videoElement = video;

    if (!canvas) {
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    }

    if (!ctx) {
      reportError(new Error('Unable to access canvas rendering context.'));
      return;
    }

    accumulator = new BehaviorAccumulator(config.emotionLabels);
    running = true;

    const intervalMs = Math.max(1000 / config.fps, 120);
    intervalId = setInterval(() => {
      void processFrame();
    }, intervalMs);
  };

  const stop = () => {
    running = false;
    processing = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    const summary = accumulator?.summarize() ?? null;
    accumulator = null;

    return summary;
  };

  return {
    prepare: async () => {
      await loadAssets();
    },
    start,
    stop,
    isRunning: () => running,
  };
}
