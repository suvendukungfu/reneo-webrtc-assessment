import React from 'react';
import type { QualityMetrics, QualityAssessment, QualityHistorySample } from '../types/stats.js';
import { Activity, Info, X } from 'lucide-react';

interface QualityPanelProps {
  metrics: QualityMetrics | null;
  assessment?: QualityAssessment;
  history?: QualityHistorySample[];
  isConnected: boolean;
  isOpen: boolean;
  isTechOpen: boolean;
  onClose: () => void;
}

const QualityPanelComponent: React.FC<QualityPanelProps> = ({
  metrics,
  assessment,
  history = [],
  isConnected,
  isOpen,
  isTechOpen,
  onClose,
}) => {
  if (!isOpen && !isTechOpen) {
    return null;
  }

  const formatBitrate = (kbps: number | null): string => {
    if (kbps === null) return '—';
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(2)} Mbps`;
    }
    return `${kbps} kbps`;
  };

  const rttText = metrics?.rttMs !== null && metrics?.rttMs !== undefined ? `${metrics.rttMs} ms` : '—';
  const lossText =
    metrics?.packetLossPercent !== null && metrics?.packetLossPercent !== undefined
      ? `${metrics.packetLossPercent}% (${metrics.packetsLost ?? 0} lost)`
      : '—';
  const jitterText = metrics?.jitterMs !== null && metrics?.jitterMs !== undefined ? `${metrics.jitterMs} ms` : '—';
  const fpsText = metrics?.fps !== null && metrics?.fps !== undefined ? `${metrics.fps} FPS` : '—';
  const resText = metrics?.resolution
    ? `${metrics.resolution.width} × ${metrics.resolution.height}`
    : '—';

  const ratingLabel = assessment?.rating || 'Unavailable';
  const ratingColor = assessment?.color || 'var(--text-muted)';
  const summaryText = assessment?.summary || 'Collecting telemetry...';

  return (
    <div className="quality-modal-overlay" role="dialog" aria-label="Connection Quality & Diagnostics Panel">
      <div className="quality-panel-card">
        {/* Modal Close Action */}
        <div className="modal-header-bar">
          <div className="modal-title-group">
            <Activity size={16} className="text-accent" />
            <h4>WebRTC Telemetry & Diagnostics</h4>
          </div>
          <button type="button" className="btn-icon-secondary" onClick={onClose} title="Close Diagnostics">
            <X size={16} />
          </button>
        </div>

        {isOpen && (
          <div className="panel-section">
            {/* Overall Rating Header */}
            <div className="panel-section-header">
              <div className="rating-badge-group">
                <span className="rating-pill" style={{ backgroundColor: ratingColor }}>
                  ● Quality: {ratingLabel}
                </span>
                <span className="summary-text">{summaryText}</span>
              </div>
              <span className="panel-notice-pill">
                Connected does not necessarily mean good quality.
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
              {/* RTT */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Round-Trip Time (RTT)</span>
                </div>
                <span className="box-value">{rttText}</span>
              </div>

              {/* Inbound Bitrate */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Inbound Bitrate</span>
                </div>
                <span className="box-value">{formatBitrate(metrics?.inboundBitrateKbps ?? null)}</span>
              </div>

              {/* Packet Loss */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Packet Loss</span>
                </div>
                <span className="box-value">{lossText}</span>
              </div>

              {/* Jitter */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Jitter</span>
                </div>
                <span className="box-value">{jitterText}</span>
              </div>

              {/* Resolution */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Video Resolution</span>
                </div>
                <span className="box-value">{resText}</span>
              </div>

              {/* FPS */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Frame Rate</span>
                </div>
                <span className="box-value">{fpsText}</span>
              </div>
            </div>

            {/* Micro rolling trend bars (last 30 samples) */}
            {history.length > 1 && (
              <div className="history-trend-section">
                <span className="trend-label">Rolling Bitrate Trend (Last {history.length}s)</span>
                <div className="trend-bar-chart">
                  {history.map((sample, idx) => {
                    const kbps = sample.bitrateKbps || 0;
                    const heightPercent = Math.min(100, Math.max(10, (kbps / 2500) * 100));
                    return (
                      <div
                        key={idx}
                        className="trend-bar"
                        style={{ height: `${heightPercent}%` }}
                        title={`${sample.bitrateKbps || 0} kbps @ ${new Date(sample.timestamp).toLocaleTimeString()}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {isTechOpen && (
          <div className="panel-section tech-section">
            <div className="panel-section-header">
              <div className="section-title">
                <Info size={16} className="text-accent" />
                <h4>Technical Architecture Details</h4>
              </div>
            </div>

            <div className="tech-details-list">
              <div className="tech-row">
                <span className="tech-label">Signaling</span>
                <span className="tech-val val-success">Connected (WebSocket ws://localhost:8080)</span>
              </div>
              <div className="tech-row">
                <span className="tech-label">ICE Transport</span>
                <span className={`tech-val ${isConnected ? 'val-success' : 'val-warn'}`}>
                  {isConnected ? 'Connected' : 'Gathering / Checking'}
                </span>
              </div>
              <div className="tech-row">
                <span className="tech-label">Peer Connection</span>
                <span className={`tech-val ${isConnected ? 'val-success' : 'val-warn'}`}>
                  {isConnected ? 'Connected (Direct P2P)' : 'Connecting'}
                </span>
              </div>
              <div className="tech-row">
                <span className="tech-label">STUN Server</span>
                <span className="tech-val val-info">Configured (stun:stun.l.google.com:19302)</span>
              </div>
              <div className="tech-row">
                <span className="tech-label">TURN Server</span>
                <span className="tech-val val-muted">
                  Not configured in this assessment prototype
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const QualityPanel = React.memo(QualityPanelComponent);
