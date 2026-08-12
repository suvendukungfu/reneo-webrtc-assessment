import type { QualityMetrics } from '../types/stats.js';

export class StatsService {
  private prevBytesReceived: number | null = null;
  private prevTimestamp: number | null = null;
  private timerId: number | null = null;

  /**
   * Starts periodic getStats polling (default interval 1000ms)
   */
  public startPolling(
    pc: RTCPeerConnection,
    onMetrics: (metrics: QualityMetrics) => void,
    intervalMs: number = 1000
  ): void {
    this.stopPolling();

    this.timerId = window.setInterval(async () => {
      if (
        pc.connectionState !== 'connected' &&
        pc.iceConnectionState !== 'completed' &&
        pc.iceConnectionState !== 'connected'
      ) {
        return;
      }
      try {
        const stats = await pc.getStats();
        const metrics = this.extractMetrics(stats);
        onMetrics(metrics);
      } catch (err) {
        console.error('[StatsService] Error fetching getStats:', err);
      }
    }, intervalMs);
  }

  /**
   * Stops active polling and resets baseline metrics
   */
  public stopPolling(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.prevBytesReceived = null;
    this.prevTimestamp = null;
  }

  /**
   * Parses RTCStatsReport into a clean QualityMetrics object across Chrome, Firefox, and Safari
   */
  private extractMetrics(stats: RTCStatsReport): QualityMetrics {
    let rttMs: number | null = null;
    let packetsLost: number | null = null;
    let inboundBitrateKbps: number | null = null;
    let jitterMs: number | null = null;
    let resolution: { width: number; height: number } | null = null;
    let fps: number | null = null;
    let currentBytes: number | null = null;
    let timestamp = Date.now();

    stats.forEach((report) => {
      // Extract active candidate-pair RTT (compatible with Chrome, Firefox, Safari)
      if (
        report.type === 'candidate-pair' &&
        (report.state === 'succeeded' || report.nominated === true || report.selected === true)
      ) {
        if (typeof report.currentRoundTripTime === 'number') {
          rttMs = Math.round(report.currentRoundTripTime * 1000);
        }
      }

      // Extract video inbound-rtp metrics
      if (
        report.type === 'inbound-rtp' &&
        (report.kind === 'video' || report.mediaType === 'video')
      ) {
        timestamp = report.timestamp || Date.now();

        if (typeof report.packetsLost === 'number') {
          packetsLost = report.packetsLost;
        }

        if (typeof report.jitter === 'number') {
          jitterMs = Math.round(report.jitter * 1000);
        }

        if (typeof report.frameWidth === 'number' && typeof report.frameHeight === 'number') {
          if (report.frameWidth > 0 && report.frameHeight > 0) {
            resolution = {
              width: report.frameWidth,
              height: report.frameHeight,
            };
          }
        }

        if (typeof report.framesPerSecond === 'number') {
          fps = Math.round(report.framesPerSecond);
        }

        if (typeof report.bytesReceived === 'number') {
          currentBytes = report.bytesReceived;
        }
      }
    });

    // Calculate inbound video bitrate delta
    if (currentBytes !== null) {
      if (this.prevBytesReceived !== null && this.prevTimestamp !== null) {
        const deltaBytes = currentBytes - this.prevBytesReceived;
        const deltaTimeMs = timestamp - this.prevTimestamp;

        if (deltaTimeMs > 0 && deltaBytes >= 0) {
          // (bytes * 8 bits/byte) / (ms / 1000 ms/sec) / 1000 bits/kbps = (bytes * 8) / ms
          inboundBitrateKbps = Math.round((deltaBytes * 8) / deltaTimeMs);
        }
      }
      this.prevBytesReceived = currentBytes;
      this.prevTimestamp = timestamp;
    }

    return {
      rttMs,
      packetsLost,
      inboundBitrateKbps,
      jitterMs,
      resolution,
      fps,
      timestamp,
    };
  }
}
