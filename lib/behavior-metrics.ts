/**
 * ============================================================
 * FILE: behavior-metrics.ts
 * PURPOSE: Type definition for the behavioral analysis output
 * ============================================================
 *
 * This file defines the `BehaviorMetrics` type — the final
 * summary object produced by the `BehaviorAccumulator` at the
 * end of a behavior analysis window (i.e., when `stop()` is
 * called on the behavior analyzer).
 *
 * The metrics are computed from many frames of video:
 *  - Face presence data (was a face visible?)
 *  - Face centering (is the candidate framed well?)
 *  - Head movement (excessive motion = nervousness)
 *  - Emotion probabilities (from the ONNX FER+ model)
 *
 * These raw signals are combined into two high-level scores:
 *  - confidenceScore : 0..100 (higher = more confident)
 *  - anxietyScore    : 0..100 (higher = more anxious)
 *
 * Consumers: behavior-analysis.ts, interview page UI
 * ============================================================
 */

/**
 * BehaviorMetrics
 * ---------------
 * The summarized behavioral analysis output for one analysis window.
 * Returned by the `stop()` method of the behavior analyzer created
 * via `createBehaviorAnalyzer()`.
 *
 * All scores are computed from multiple sampled video frames
 * and then aggregated into stable, interpretable values.
 */
// Shape of summarized behavior metrics returned by the analyzer's `stop()`.
export type BehaviorMetrics = {
  /** Total frames processed during the analysis window. */
  frameCount: number;

  /**
   * Number of frames where a face was detected.
   * Lower than `frameCount` if the user was not visible for the full window.
   */
  faceFrameCount: number;

  /**
   * faceFrameCount / frameCount — proportion of frames with a visible face.
   * Value of 1.0 means face was visible in every processed frame.
   * Value below 0.6 is flagged as "low face visibility" by the confidence reporter.
   */
  facePresenceRatio: number;

  /**
   * 0..1 score representing how well the subject is centered in the frame.
   * 1.0 = perfectly centered; 0.0 = face is at the extreme edge.
   * Computed from the average normalized distance of the face center
   * from the midpoint (0.5, 0.5) of the frame.
   */
  avgCenteringScore: number;

  /**
   * Average per-frame head movement magnitude in normalized units.
   * Computed as the Euclidean distance between face center coordinates
   * across consecutive frames. High values indicate restlessness or
   * nervousness during the interview.
   */
  avgHeadMovement: number;

  /**
   * Average probability per emotion label across face-detected frames.
   * Keys correspond to the emotion model's output labels (e.g.,
   * 'neutral', 'happiness', 'anger', 'fear', 'sadness', etc.).
   * Values are floats in [0, 1].
   */
  emotionAverages: Record<string, number>;

  /**
   * 0..100 numeric confidence score aggregated from multiple signals:
   * face presence, centering, head movement, and positive emotion ratios.
   * This is the primary score displayed to the user after an interview session.
   */
  confidenceScore: number;

  /**
   * Optional human-friendly label for the confidence level.
   * Examples: "Very confident", "Confident", "Somewhat confident",
   * "Low confidence", "Very low confidence".
   * Derived by `describeConfidence()` in behavior-analysis.ts.
   */
  confidenceLabel?: string;

  /**
   * Optional short summary explaining the confidence label.
   * Includes specific reasons (e.g., "low face visibility", "signs of anxiety").
   * Example: "Confident — off-center framing."
   */
  confidenceSummary?: string;

  /**
   * 0..100 score representing estimated anxiety or negative emotional affect.
   * Computed as a weighted blend of negative emotion probabilities
   * (anger, fear, sadness, disgust, contempt) and centering quality.
   */
  anxietyScore: number;
};
