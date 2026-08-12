import React, { useState } from 'react';
import { Video, Copy, Check, Clock } from 'lucide-react';
import type { AppConnectionState } from '../types/webrtc.js';
import { formatDuration } from '../utils/formatters.js';

interface HeaderProps {
  roomId: string;
  connectionState: AppConnectionState;
  callDuration: number;
  isCallActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  connectionState,
  callDuration,
  isCallActive,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return { text: 'Connected', dotClass: 'dot-success', icon: '●' };
      case 'connecting':
      case 'joining':
        return { text: 'Connecting...', dotClass: 'dot-warning', icon: '◌' };
      case 'waiting':
        return { text: 'Waiting for Peer', dotClass: 'dot-warning', icon: '◌' };
      case 'reconnecting':
        return { text: 'Reconnecting...', dotClass: 'dot-orange', icon: '↻' };
      case 'disconnected':
        return { text: 'Disconnected', dotClass: 'dot-danger', icon: '!' };
      case 'failed':
        return { text: 'Connection Failed', dotClass: 'dot-danger', icon: '!' };
      case 'idle':
      default:
        return { text: 'Ready', dotClass: 'dot-neutral', icon: '●' };
    }
  };

  const status = getStatusBadge();

  return (
    <header className="app-topbar">
      {/* Brand / Logo */}
      <div className="topbar-brand">
        <div className="brand-logo-icon">
          <Video size={18} />
        </div>
        <span className="brand-name">Reneo</span>
      </div>

      {isCallActive && (
        <div className="topbar-meta">
          {/* Room ID Badge with Copy */}
          <div className="meta-item room-badge">
            <span className="meta-label">Room:</span>
            <span className="meta-value">{roomId}</span>
            <button
              type="button"
              className="btn-copy-icon"
              onClick={handleCopyRoom}
              title="Copy Room ID"
            >
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>

          {/* Connection Status Indicator */}
          <div className="meta-item status-badge">
            <span className={`status-icon-dot ${status.dotClass}`}>{status.icon}</span>
            <span className="status-text">{status.text}</span>
          </div>

          {/* Call Duration Timer */}
          <div className="meta-item timer-badge">
            <Clock size={12} className="timer-icon" />
            <span className="timer-value">{formatDuration(callDuration)}</span>
          </div>
        </div>
      )}
    </header>
  );
};
