export interface QualityMetrics {
  rttMs: number | null;
  packetsLost: number | null;
  inboundBitrateKbps: number | null;
  jitterMs: number | null;
  resolution: {
    width: number;
    height: number;
  } | null;
  fps: number | null;
  timestamp: number;
}
