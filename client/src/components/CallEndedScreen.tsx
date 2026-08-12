import React from 'react';
import { PhoneOff, RefreshCw, Home, Clock, Hash } from 'lucide-react';
import { formatDuration } from '../utils/formatters.js';

interface CallEndedScreenProps {
  roomId: string;
  durationSeconds: number;
  onJoinAgain: () => void;
  onReturnHome: () => void;
}

export const CallEndedScreen: React.FC<CallEndedScreenProps> = ({
  roomId,
  durationSeconds,
  onJoinAgain,
  onReturnHome,
}) => {
  return (
    <div className="ended-screen">
      <div className="ended-card">
        <div className="ended-icon-wrapper">
          <PhoneOff size={28} className="ended-icon" />
        </div>

        <h2 className="ended-title">Call ended</h2>
        <p className="ended-subtitle">Your peer-to-peer WebRTC session has concluded.</p>

        <div className="ended-summary-grid">
          <div className="summary-item">
            <span className="summary-label">
              <Hash size={14} /> Room ID
            </span>
            <span className="summary-value">{roomId}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">
              <Clock size={14} /> Duration
            </span>
            <span className="summary-value">{formatDuration(durationSeconds)}</span>
          </div>
        </div>

        <div className="ended-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onJoinAgain}>
            <RefreshCw size={16} /> Join Again
          </button>

          <button type="button" className="btn btn-secondary btn-block" onClick={onReturnHome}>
            <Home size={16} /> Return Home
          </button>
        </div>
      </div>
    </div>
  );
};
