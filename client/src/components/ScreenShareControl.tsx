import React from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
import type { ScreenShareState } from '../types/screenshare.js';

interface ScreenShareControlProps {
  screenShareState: ScreenShareState;
  onToggleScreenShare: () => void;
  disabled?: boolean;
}

export const ScreenShareControl: React.FC<ScreenShareControlProps> = ({
  screenShareState,
  onToggleScreenShare,
  disabled = false,
}) => {
  const isSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);
  const isSharing = screenShareState.isSharing;
  const isStarting = screenShareState.status === 'starting';
  const isStopping = screenShareState.status === 'stopping';

  const getTooltip = () => {
    if (!isSupported) return 'Screen sharing is available on desktop browsers';
    if (isSharing) return 'Stop Screen Sharing';
    return 'Share Screen';
  };

  return (
    <div className="screenshare-control-wrapper">
      <button
        type="button"
        className={`ctrl-icon-btn ${isSharing ? 'btn-active-screenshare' : ''}`}
        onClick={onToggleScreenShare}
        disabled={disabled || !isSupported || isStarting || isStopping}
        title={getTooltip()}
        aria-label={getTooltip()}
      >
        {isStarting || isStopping ? (
          <span className="spinner-sm" />
        ) : isSharing ? (
          <MonitorOff size={20} className="icon-danger" />
        ) : (
          <Monitor size={20} />
        )}
      </button>

      {isSharing && (
        <div className="screenshare-status-indicator" role="status">
          <span className="live-dot" />
          <span>You are sharing your screen</span>
        </div>
      )}
    </div>
  );
};
