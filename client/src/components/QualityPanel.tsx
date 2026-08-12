import React from 'react';
import type { QualityMetrics } from '../types/stats.js';

interface QualityPanelProps {
  metrics: QualityMetrics | null;
  isConnected: boolean;
}

export const QualityPanel: React.FC<QualityPanelProps> = ({ metrics, isConnected }) => {
  if (!isConnected) {
    return null;
  }

  const formatBitrate = (kbps: number | null): string => {
    if (kbps === null) return '—';
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(2)} Mbps`;
    }
    return `${kbps} kbps`;
  };

  const formatRtt = (rttMs: number | null): string => {
    if (rttMs === null) return '—';
    return `${rttMs} ms`;
  };

  const formatJitter = (jitterMs: number | null): string => {
    if (jitterMs === null) return '—';
    return `${jitterMs} ms`;
  };

  const formatPacketsLost = (lost: number | null): string => {
    if (lost === null) return '—';
    return lost.toLocaleString();
  };

  const formatResolution = (res: { width: number; height: number } | null): string => {
    if (!res) return '—';
    return `${res.width} × ${res.height}`;
  };

  const formatFps = (fps: number | null): string => {
    if (fps === null) return '—';
    return `${fps} fps`;
  };

  return (
    <div className="quality-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">📊</span>
          <h3>WebRTC Connection Quality (Part B3)</h3>
        </div>
        <div className="panel-notice">
          ℹ️ <em>Connected does not necessarily mean good quality.</em>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Round-Trip Time (RTT)</span>
          <span className="metric-value">{formatRtt(metrics?.rttMs ?? null)}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Inbound Bitrate</span>
          <span className="metric-value">{formatBitrate(metrics?.inboundBitrateKbps ?? null)}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Packets Lost</span>
          <span className="metric-value">{formatPacketsLost(metrics?.packetsLost ?? null)}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Jitter</span>
          <span className="metric-value">{formatJitter(metrics?.jitterMs ?? null)}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Video Resolution</span>
          <span className="metric-value">{formatResolution(metrics?.resolution ?? null)}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Frame Rate (FPS)</span>
          <span className="metric-value">{formatFps(metrics?.fps ?? null)}</span>
        </div>
      </div>
    </div>
  );
};
