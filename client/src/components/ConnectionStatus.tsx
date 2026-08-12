import React from 'react';
import type { AppConnectionState } from '../types/webrtc.js';

interface ConnectionStatusProps {
  state: AppConnectionState;
  message: string;
  variant?: 'topbar' | 'banner';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state,
  message,
  variant = 'topbar',
}) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'connected':
        return { dotClass: 'dot-success', label: 'Connected', icon: '●' };
      case 'connecting':
      case 'joining':
        return { dotClass: 'dot-warning', label: 'Connecting...', icon: '◌' };
      case 'waiting':
        return { dotClass: 'dot-warning', label: 'Waiting for Peer', icon: '◌' };
      case 'reconnecting':
        return { dotClass: 'dot-orange', label: 'Reconnecting...', icon: '↻' };
      case 'disconnected':
        return { dotClass: 'dot-danger', label: 'Disconnected', icon: '!' };
      case 'failed':
        return { dotClass: 'dot-danger', label: 'Connection Failed', icon: '!' };
      case 'idle':
      default:
        return { dotClass: 'dot-neutral', label: 'Ready', icon: '●' };
    }
  };

  const config = getBadgeConfig();

  if (variant === 'banner') {
    return (
      <div className={`connection-banner banner-${state}`}>
        <span className={`banner-dot ${config.dotClass}`}>{config.icon}</span>
        <span className="banner-message">{message}</span>
      </div>
    );
  }

  return (
    <div className="meta-item status-badge" title={message}>
      <span className={`status-icon-dot ${config.dotClass}`}>{config.icon}</span>
      <span className="status-text">{config.label}</span>
    </div>
  );
};
