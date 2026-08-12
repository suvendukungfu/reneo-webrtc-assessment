import React from 'react';
import type { QualityMetrics } from '../types/stats.js';
import { getMetricQuality } from '../utils/quality.js';
import { Activity, Info } from 'lucide-react';

interface QualityPanelProps {
  metrics: QualityMetrics | null;
  isConnected: boolean;
  isOpen: boolean;
  isTechOpen: boolean;
  onClose: () => void;
}

export const QualityPanel: React.FC<QualityPanelProps> = ({
  metrics,
  isConnected,
  isOpen,
  isTechOpen,
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

  const rttQuality = getMetricQuality('rtt', metrics?.rttMs ?? null);
  const bitrateQuality = getMetricQuality('bitrate', metrics?.inboundBitrateKbps ?? null);
  const lostQuality = getMetricQuality('packetsLost', metrics?.packetsLost ?? null);
  const fpsQuality = getMetricQuality('fps', metrics?.fps ?? null);
  const jitterQuality = getMetricQuality('jitter', metrics?.jitterMs ?? null);

  const rttText = metrics?.rttMs !== null && metrics?.rttMs !== undefined ? `${metrics.rttMs} ms` : '—';
  const lostText = metrics?.packetsLost !== null && metrics?.packetsLost !== undefined ? metrics.packetsLost.toLocaleString() : '—';
  const jitterText = metrics?.jitterMs !== null && metrics?.jitterMs !== undefined ? `${metrics.jitterMs} ms` : '—';
  const fpsText = metrics?.fps !== null && metrics?.fps !== undefined ? `${metrics.fps} fps` : '—';

  return (
    <div className="quality-modal-overlay">
      <div className="quality-panel-card">
        {isOpen && (
          <div className="panel-section">
            <div className="panel-section-header">
              <div className="section-title">
                <Activity size={16} className="text-accent" />
                <h4>Connection Quality (Part B3)</h4>
              </div>
              <span className="panel-notice-pill">
                Connected does not necessarily mean good quality.
              </span>
            </div>

            <div className="metrics-grid">
              {/* RTT */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Round-Trip Time</span>
                  {metrics?.rttMs !== null && metrics?.rttMs !== undefined && (
                    <span className={`quality-tag ${rttQuality.cssClass}`}>
                      {rttQuality.rating}
                    </span>
                  )}
                </div>
                <span className="box-value">{rttText}</span>
              </div>

              {/* Bitrate */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Inbound Bitrate</span>
                  {metrics?.inboundBitrateKbps !== null && metrics?.inboundBitrateKbps !== undefined && (
                    <span className={`quality-tag ${bitrateQuality.cssClass}`}>
                      {bitrateQuality.rating}
                    </span>
                  )}
                </div>
                <span className="box-value">{formatBitrate(metrics?.inboundBitrateKbps ?? null)}</span>
              </div>

              {/* Packets Lost */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Packets Lost</span>
                  {metrics?.packetsLost !== null && metrics?.packetsLost !== undefined && (
                    <span className={`quality-tag ${lostQuality.cssClass}`}>
                      {lostQuality.rating}
                    </span>
                  )}
                </div>
                <span className="box-value">{lostText}</span>
              </div>

              {/* Jitter */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Jitter</span>
                  {metrics?.jitterMs !== null && metrics?.jitterMs !== undefined && (
                    <span className={`quality-tag ${jitterQuality.cssClass}`}>
                      {jitterQuality.rating}
                    </span>
                  )}
                </div>
                <span className="box-value">{jitterText}</span>
              </div>

              {/* Resolution */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Resolution</span>
                </div>
                <span className="box-value">
                  {metrics?.resolution
                    ? `${metrics.resolution.width} × ${metrics.resolution.height}`
                    : '—'}
                </span>
              </div>

              {/* FPS */}
              <div className="metric-box">
                <div className="box-header">
                  <span className="box-label">Frame Rate</span>
                  {metrics?.fps !== null && metrics?.fps !== undefined && (
                    <span className={`quality-tag ${fpsQuality.cssClass}`}>
                      {fpsQuality.rating}
                    </span>
                  )}
                </div>
                <span className="box-value">{fpsText}</span>
              </div>
            </div>
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
                <span className="tech-val val-success">Connected (WebSocket)</span>
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
                <span className="tech-val val-info">Configured (Google STUN)</span>
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
