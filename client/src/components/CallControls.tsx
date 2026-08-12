import React from 'react';
import type { MediaControlsState } from '../types/webrtc.js';

interface CallControlsProps {
  controls: MediaControlsState;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onHangUp: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  controls,
  onToggleAudio,
  onToggleVideo,
  onHangUp,
}) => {
  return (
    <div className="call-controls">
      <button
        type="button"
        className={`ctrl-btn ${controls.isAudioMuted ? 'btn-danger' : 'btn-secondary'}`}
        onClick={onToggleAudio}
        title={controls.isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        <span className="ctrl-icon">{controls.isAudioMuted ? '🎙️❌' : '🎙️'}</span>
        <span className="ctrl-label">{controls.isAudioMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        type="button"
        className={`ctrl-btn ${controls.isVideoDisabled ? 'btn-danger' : 'btn-secondary'}`}
        onClick={onToggleVideo}
        title={controls.isVideoDisabled ? 'Enable Camera' : 'Disable Camera'}
      >
        <span className="ctrl-icon">{controls.isVideoDisabled ? '📷❌' : '📷'}</span>
        <span className="ctrl-label">{controls.isVideoDisabled ? 'Start Video' : 'Stop Video'}</span>
      </button>

      <button
        type="button"
        className="ctrl-btn btn-hangup"
        onClick={onHangUp}
        title="Leave / Hang Up Call"
      >
        <span className="ctrl-icon">📞</span>
        <span className="ctrl-label">Hang Up</span>
      </button>
    </div>
  );
};
