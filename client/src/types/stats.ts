export type QualityRating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unavailable';

export interface QualityMetrics {
  rttMs: number | null;
  packetsLost: number | null;
  packetLossPercent: number | null;
  inboundBitrateKbps: number | null;
  jitterMs: number | null;
  resolution: { width: number; height: number } | null;
  fps: number | null;
  timestamp: number;
}

export interface QualityAssessment {
  rating: QualityRating;
  color: string;
  summary: string;
}

export interface QualityHistorySample {
  timestamp: number;
  bitrateKbps: number | null;
  rttMs: number | null;
  lossPercent: number | null;
}
