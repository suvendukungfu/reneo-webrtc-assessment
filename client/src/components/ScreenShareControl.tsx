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
  const isSharing = screenShareState.isSharing;
  const isStarting = screenShareState.status === 'starting';
  const isStopping = screenShareState.status === 'stopping';

  return (
    <div className="screenshare-control-wrapper">
      <button
        type="button"
        className={`ctrl-icon-btn ${isSharing ? 'btn-active-screenshare' : ''}`}
        onClick={onToggleScreenShare}
        disabled={disabled || isStarting || isStopping}
        title={isSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        aria-label={isSharing ? 'Stop screen sharing' : 'Share screen'}
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
