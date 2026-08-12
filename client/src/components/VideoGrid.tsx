import React, { useRef, useEffect } from 'react';
import type { AppConnectionState } from '../types/webrtc.js';
import { getInitials } from '../utils/formatters.js';
import { Mic, MicOff, VideoOff, Copy, Check, Monitor } from 'lucide-react';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: AppConnectionState;
  isVideoDisabled: boolean;
  isAudioMuted: boolean;
  isScreenSharing?: boolean;
  roomId: string;
  displayName: string;
  onRemoteVideoElementRef?: (el: HTMLVideoElement | null) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  remoteStream,
  connectionState,
  isVideoDisabled,
  isAudioMuted,
  isScreenSharing = false,
  roomId,
  displayName,
  onRemoteVideoElementRef,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      if (onRemoteVideoElementRef) {
        onRemoteVideoElementRef(remoteVideoRef.current);
      }
    }
  }, [remoteStream, onRemoteVideoElementRef]);

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isConnected = connectionState === 'connected';

  return (
    <div className="video-stage">
      {/* Remote Video Primary Surface */}
      <div className="remote-video-container">
        {remoteStream && isConnected ? (
          <video
            ref={(el) => {
              remoteVideoRef.current = el;
              if (onRemoteVideoElementRef) {
                onRemoteVideoElementRef(el);
              }
            }}
            autoPlay
            playsInline
            className="remote-video-element"
          />
        ) : (
          <div className="remote-empty-state">
            <div className="avatar-circle">{getInitials('Peer B')}</div>
            <h3 className="empty-title">
              {connectionState === 'waiting'
                ? 'Waiting for participant'
                : connectionState === 'connecting'
                ? 'Establishing network connection...'
                : connectionState === 'reconnecting'
                ? 'Re-establishing network path...'
                : 'No remote participant'}
            </h3>
            <p className="empty-subtitle">
              {connectionState === 'waiting'
                ? 'Share the room ID with the person you want to call.'
                : 'Your call will begin when media packets start flowing.'}
            </p>

            {connectionState === 'waiting' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm copy-room-btn"
                onClick={handleCopyRoom}
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                <span>{copied ? 'Copied Room ID' : `Copy Room ID: ${roomId}`}</span>
              </button>
            )}
          </div>
        )}

        {/* Remote Overlay Information */}
        <div className="remote-overlay">
          <div className="overlay-pill">
            <span className={`status-dot-sm ${isConnected ? 'dot-online' : 'dot-waiting'}`} />
            <span className="overlay-name">
              {isConnected ? 'Remote Peer' : 'Participant B'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Picture-in-Picture Local Video Card */}
      <div className="local-pip-card">
        {localStream ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`local-video-element ${isVideoDisabled && !isScreenSharing ? 'hidden' : ''}`}
            />
            {isVideoDisabled && !isScreenSharing && (
              <div className="local-disabled-placeholder">
                <div className="avatar-sm">{getInitials(displayName)}</div>
                <div className="disabled-text-row">
                  <VideoOff size={14} className="text-danger" />
                  <span>Camera off</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="local-disabled-placeholder">
            <span className="placeholder-sub">Camera Offline</span>
          </div>
        )}

        {/* Local Card Overlay Badge */}
        <div className="pip-overlay">
          <span className="pip-name">{displayName || 'You'}</span>
          <div className="pip-status-icons">
            {isScreenSharing && <Monitor size={12} className="text-accent" />}
            {isAudioMuted ? (
              <MicOff size={12} className="text-danger" />
            ) : (
              <Mic size={12} className="text-success" />
            )}
            {isVideoDisabled && !isScreenSharing && <VideoOff size={12} className="text-danger" />}
          </div>
        </div>
      </div>
    </div>
  );
};
