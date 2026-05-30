export type BehaviorMetrics = {
  frameCount: number;
  faceFrameCount: number;
  facePresenceRatio: number;
  avgCenteringScore: number;
  avgHeadMovement: number;
  emotionAverages: Record<string, number>;
  confidenceScore: number;
  anxietyScore: number;
};
