import React from 'react';
import type { UserMediaError } from '../types/webrtc.js';
import { AlertTriangle, ShieldAlert, CameraOff, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  error: UserMediaError;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss, onRetry }) => {
  const getIcon = () => {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return <ShieldAlert size={20} className="banner-icon-svg" />;
      case 'DEVICE_NOT_FOUND':
        return <CameraOff size={20} className="banner-icon-svg" />;
      case 'SIGNALING_UNAVAILABLE':
      case 'CONNECTION_FAILED':
      default:
        return <AlertTriangle size={20} className="banner-icon-svg" />;
    }
  };

  return (
    <div className={`app-alert-banner alert-${error.type.toLowerCase()}`}>
      <div className="alert-content">
        <div className="alert-icon-col">{getIcon()}</div>
        <div className="alert-text-col">
          <strong className="alert-title">{error.title}</strong>
          <p className="alert-message">{error.message}</p>
          {error.details && <small className="alert-details">{error.details}</small>}
        </div>
      </div>

      <div className="alert-actions">
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline" onClick={onRetry}>
            <RefreshCw size={12} /> Try Again
          </button>
        )}
        <button
          type="button"
          className="alert-dismiss-btn"
          onClick={onDismiss}
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
