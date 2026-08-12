import React, { useState } from 'react';
import { Video, Copy, Check, Clock } from 'lucide-react';
import type { AppConnectionState } from '../types/webrtc.js';
import { ConnectionStatus } from './ConnectionStatus.js';
import { formatDuration } from '../utils/formatters.js';

interface HeaderProps {
  roomId: string;
  connectionState: AppConnectionState;
  statusMessage: string;
  callDuration: number;
  isCallActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  connectionState,
  statusMessage,
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

          {/* Connection Status Component */}
          <ConnectionStatus state={connectionState} message={statusMessage} />

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
