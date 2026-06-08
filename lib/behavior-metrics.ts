// Shape of summarized behavior metrics returned by the analyzer's `stop()`.
export type BehaviorMetrics = {
  // Total frames processed during the analysis window.
  frameCount: number;
  // Number of frames where a face was detected.
  faceFrameCount: number;
  // faceFrameCount / frameCount — proportion of frames with a visible face.
  facePresenceRatio: number;
  // 0..1 score representing how well the subject is centered in the frame.
  avgCenteringScore: number;
  // Average per-frame head movement magnitude (normalized units).
  avgHeadMovement: number;
  // Average probability per emotion label across face frames.
  emotionAverages: Record<string, number>;
  // 0..100 numeric confidence score aggregated from multiple signals.
  confidenceScore: number;
  // Optional human-friendly label for the confidence (e.g., "Confident").
  confidenceLabel?: string;
  // Optional short summary explaining the confidence label.
  confidenceSummary?: string;
  // 0..100 score representing estimated anxiety/negative-affect.
  anxietyScore: number;
};
