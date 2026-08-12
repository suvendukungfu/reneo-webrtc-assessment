import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Activity, Info, PhoneOff, Sliders } from 'lucide-react';
import type { MediaControlsState } from '../types/webrtc.js';
import type { ScreenShareState } from '../types/screenshare.js';
import { ScreenShareControl } from './ScreenShareControl.js';

interface CallControlsProps {
  controls: MediaControlsState;
  screenShareState: ScreenShareState;
  isQualityOpen: boolean;
  isTechOpen: boolean;
  isDevicesOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleDevices: () => void;
  onToggleQuality: () => void;
  onToggleTech: () => void;
  onHangUp: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  controls,
  screenShareState,
  isQualityOpen,
  isTechOpen,
  isDevicesOpen,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDevices,
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
      {/* Leave Call Confirmation Popover */}
      {showConfirmLeave && (
        <div className="confirm-leave-popover" role="dialog" aria-label="Confirm Leave Call">
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

        {/* B1 Screen Sharing Toggle */}
        <ScreenShareControl
          screenShareState={screenShareState}
          onToggleScreenShare={onToggleScreenShare}
        />

        {/* B2 Media Devices Selector Toggle */}
        <button
          type="button"
          className={`ctrl-icon-btn ${isDevicesOpen ? 'active-accent' : 'active-normal'}`}
          onClick={onToggleDevices}
          aria-label="Open device settings"
          title="Select Microphone, Camera & Speaker (Enhancement B2)"
        >
          <Sliders size={20} />
        </button>

        {/* B3 Quality Panel Toggle (Selected Part B) */}
        <button
          type="button"
          className={`ctrl-icon-btn ${isQualityOpen ? 'active-accent' : 'active-normal'}`}
          onClick={onToggleQuality}
          aria-label="Open connection quality panel"
          title="Connection metrics getStats (Selected Part B3)"
        >
          <Activity size={20} />
        </button>

        {/* Technical Details Toggle */}
        <button
          type="button"
          className={`ctrl-icon-btn ${isTechOpen ? 'active-accent' : 'active-normal'}`}
          onClick={onToggleTech}
          aria-label="Open technical architecture details"
          title="Technical WebRTC details"
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
