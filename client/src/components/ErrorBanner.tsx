import React from 'react';
import type { UserMediaError } from '../types/webrtc.js';

interface ErrorBannerProps {
  error: UserMediaError;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss }) => {
  const getIcon = () => {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return '🚫';
      case 'DEVICE_NOT_FOUND':
        return '📷❌';
      case 'ROOM_FULL':
        return '👥❌';
      case 'PEER_LEFT':
        return '👋';
      case 'SIGNALING_UNAVAILABLE':
      case 'CONNECTION_FAILED':
      default:
        return '⚠️';
    }
  };

  return (
    <div className={`error-banner banner-${error.type.toLowerCase()}`}>
      <div className="banner-content">
        <span className="banner-icon">{getIcon()}</span>
        <div className="banner-text">
          <strong className="banner-title">{error.title}</strong>
          <p className="banner-message">{error.message}</p>
          {error.details && <small className="banner-details">Details: {error.details}</small>}
        </div>
      </div>
      <button type="button" className="banner-dismiss" onClick={onDismiss} title="Dismiss warning">
        ✕
      </button>
    </div>
  );
};
