import React from 'react';
import type { AppConnectionState } from '../types/webrtc.js';

interface ConnectionStatusProps {
  state: AppConnectionState;
  message: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state, message }) => {
  const getBadgeClass = () => {
    switch (state) {
      case 'connected':
        return 'badge-success';
      case 'connecting':
      case 'joining':
      case 'waiting':
        return 'badge-warning';
      case 'reconnecting':
        return 'badge-orange';
      case 'disconnected':
      case 'failed':
        return 'badge-danger';
      case 'idle':
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div className="connection-status-bar">
      <div className="status-indicator">
        <span className={`status-dot ${getBadgeClass()}`} />
        <span className="status-state-name">{state.toUpperCase()}</span>
      </div>
      <div className="status-message">{message}</div>
    </div>
  );
};
