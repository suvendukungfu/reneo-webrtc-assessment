import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Activity, Info, PhoneOff } from 'lucide-react';
import type { MediaControlsState } from '../types/webrtc.js';

interface CallControlsProps {
  controls: MediaControlsState;
  isQualityOpen: boolean;
  isTechOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleQuality: () => void;
  onToggleTech: () => void;
  onHangUp: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  controls,
  isQualityOpen,
  isTechOpen,
  onToggleAudio,
  onToggleVideo,
  onToggleQuality,
  onToggleTech,
  onHangUp,
}) => {
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const handleLeaveClick = () => {
    setShowConfirmLeave(true);
  };

  const handleConfirmLeave = () => {
    setShowConfirmLeave(false);
    onHangUp();
  };

  const handleCancelLeave = () => {
    setShowConfirmLeave(false);
  };

  return (
    <div className="controls-bar-container">
      {/* Leave Call Confirmation Popup */}
      {showConfirmLeave && (
        <div className="confirm-leave-popover">
          <span className="confirm-text">Leave this call?</span>
          <div className="confirm-buttons">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleCancelLeave}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleConfirmLeave}
            >
              Leave Call
            </button>
          </div>
        </div>
      )}

      <div className="call-controls">
        {/* Microphone Toggle */}
        <button
          type="button"
          className={`ctrl-icon-btn ${controls.isAudioMuted ? 'active-danger' : 'active-normal'}`}
          onClick={onToggleAudio}
          aria-label={controls.isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          title={controls.isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {controls.isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          className={`ctrl-icon-btn ${controls.isVideoDisabled ? 'active-danger' : 'active-normal'}`}
          onClick={onToggleVideo}
          aria-label={controls.isVideoDisabled ? 'Turn camera on' : 'Turn camera off'}
          title={controls.isVideoDisabled ? 'Turn camera on' : 'Turn camera off'}
        >
          {controls.isVideoDisabled ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Quality Panel Toggle */}
        <button
          type="button"
          className={`ctrl-icon-btn ${isQualityOpen ? 'active-accent' : 'active-normal'}`}
          onClick={onToggleQuality}
          aria-label="Toggle connection quality panel"
          title="Connection metrics (Part B3)"
        >
          <Activity size={20} />
        </button>

        {/* Technical Details Toggle */}
        <button
          type="button"
          className={`ctrl-icon-btn ${isTechOpen ? 'active-accent' : 'active-normal'}`}
          onClick={onToggleTech}
          aria-label="Toggle technical diagnostic details"
          title="Technical architecture details"
        >
          <Info size={20} />
        </button>

        <div className="ctrl-divider" />

        {/* Leave Call Button */}
        <button
          type="button"
          className="ctrl-icon-btn btn-hangup"
          onClick={handleLeaveClick}
          aria-label="Leave call"
          title="Leave call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};
