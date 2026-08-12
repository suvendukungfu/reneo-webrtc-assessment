import type {
  QualityMetrics,
  QualityAssessment,
  QualityHistorySample,
} from '../../types/stats.js';

export class StatsManager {
  private prevBytesReceived: number | null = null;
  private prevTimestamp: number | null = null;
  private timerId: number | null = null;
  private historyWindow: QualityHistorySample[] = [];
  private maxHistorySamples: number = 30;

  /**
   * Starts periodic getStats polling (default interval 1000ms)
   */
  public startPolling(
    pc: RTCPeerConnection,
    onMetrics: (metrics: QualityMetrics, assessment: QualityAssessment) => void,
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
        const assessment = this.assessQuality(metrics);

        // Store sample in rolling history
        this.addHistorySample({
          timestamp: metrics.timestamp,
          bitrateKbps: metrics.inboundBitrateKbps,
          rttMs: metrics.rttMs,
          lossPercent: metrics.packetLossPercent,
        });

        onMetrics(metrics, assessment);
      } catch (err) {
        console.error('[StatsManager] Error fetching getStats:', err);
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
    this.historyWindow = [];
  }

  /**
   * Parses RTCStatsReport into a normalized QualityMetrics object
   */
  private extractMetrics(stats: RTCStatsReport): QualityMetrics {
    let rttMs: number | null = null;
    let packetsLost: number | null = null;
    let packetsReceived: number | null = null;
    let packetLossPercent: number | null = null;
    let inboundBitrateKbps: number | null = null;
    let jitterMs: number | null = null;
    let resolution: { width: number; height: number } | null = null;
    let fps: number | null = null;
    let currentBytes: number | null = null;
    let timestamp = Date.now();

    stats.forEach((report) => {
      // Candidate-pair RTT (Chrome, Firefox, Safari)
      if (
        report.type === 'candidate-pair' &&
        (report.state === 'succeeded' || report.nominated === true || report.selected === true)
      ) {
        if (typeof report.currentRoundTripTime === 'number') {
          rttMs = Math.round(report.currentRoundTripTime * 1000);
        }
      }

      // Inbound video RTP statistics
      if (
        report.type === 'inbound-rtp' &&
        (report.kind === 'video' || report.mediaType === 'video')
      ) {
        timestamp = report.timestamp || Date.now();

        if (typeof report.packetsLost === 'number') {
          packetsLost = Math.max(0, report.packetsLost);
        }

        if (typeof report.packetsReceived === 'number') {
          packetsReceived = Math.max(0, report.packetsReceived);
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

    // Calculate Inbound Bitrate Delta
    if (currentBytes !== null) {
      if (this.prevBytesReceived !== null && this.prevTimestamp !== null) {
        const deltaBytes = currentBytes - this.prevBytesReceived;
        const deltaTimeMs = timestamp - this.prevTimestamp;

        if (deltaTimeMs > 0 && deltaBytes >= 0) {
          inboundBitrateKbps = Math.round((deltaBytes * 8) / deltaTimeMs);
        }
      }
      this.prevBytesReceived = currentBytes;
      this.prevTimestamp = timestamp;
    }

    // Calculate Packet Loss Percentage
    if (packetsLost !== null && packetsReceived !== null) {
      const totalPackets = packetsLost + packetsReceived;
      if (totalPackets > 0) {
        packetLossPercent = parseFloat(((packetsLost / totalPackets) * 100).toFixed(1));
      } else {
        packetLossPercent = 0;
      }
    }

    return {
      rttMs,
      packetsLost,
      packetLossPercent,
      inboundBitrateKbps,
      jitterMs,
      resolution,
      fps,
      timestamp,
    };
  }

  /**
   * Assesses media quality based on real-time WebRTC transport metrics
   */
  public assessQuality(metrics: QualityMetrics): QualityAssessment {
    const { rttMs, packetLossPercent, inboundBitrateKbps } = metrics;

    if (rttMs === null && inboundBitrateKbps === null) {
      return {
        rating: 'Unavailable',
        color: 'var(--text-muted)',
        summary: 'Collecting connection statistics...',
      };
    }

    const rtt = rttMs ?? 0;
    const loss = packetLossPercent ?? 0;
    const bitrate = inboundBitrateKbps ?? 0;

    if (loss > 8 || rtt > 400 || (bitrate > 0 && bitrate < 150)) {
      return {
        rating: 'Poor',
        color: 'var(--danger)',
        summary: 'High packet loss or latency detected. Video may stutter.',
      };
    }

    if (loss > 3 || rtt > 200 || bitrate < 500) {
      return {
        rating: 'Fair',
        color: 'var(--warning)',
        summary: 'Moderate network latency or packet loss.',
      };
    }

    if (rtt <= 100 && loss < 1.0 && bitrate >= 1200) {
      return {
        rating: 'Excellent',
        color: 'var(--success)',
        summary: 'Optimal real-time media quality.',
      };
    }

    return {
      rating: 'Good',
      color: 'var(--success)',
      summary: 'Stable video and audio transmission.',
    };
  }

  private addHistorySample(sample: QualityHistorySample): void {
    this.historyWindow.push(sample);
    if (this.historyWindow.length > this.maxHistorySamples) {
      this.historyWindow.shift();
    }
  }

  public getHistory(): QualityHistorySample[] {
    return [...this.historyWindow];
  }
}
