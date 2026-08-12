import React, { useRef, useEffect } from 'react';
import type { AppConnectionState } from '../types/webrtc.js';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: AppConnectionState;
  isVideoDisabled: boolean;
  isAudioMuted: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  remoteStream,
  connectionState,
  isVideoDisabled,
  isAudioMuted,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

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
    }
  }, [remoteStream]);

  const isConnected = connectionState === 'connected';

  return (
    <div className="video-grid">
      {/* Remote Video Tile */}
      <div className="video-tile remote-tile">
        {remoteStream && isConnected ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-element"
          />
        ) : (
          <div className="video-placeholder">
            <div className="placeholder-avatar">👤</div>
            <p className="placeholder-text">
              {connectionState === 'waiting'
                ? 'Waiting for participant B to join...'
                : connectionState === 'connecting'
                ? 'Establishing peer connection...'
                : connectionState === 'reconnecting'
                ? 'Reconnecting peer stream...'
                : 'No remote participant'}
            </p>
          </div>
        )}
        <div className="tile-badge remote-badge">
          Remote Peer {isConnected ? '• Live' : ''}
        </div>
      </div>

      {/* Local Video Tile */}
      <div className="video-tile local-tile">
        {localStream ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`video-element ${isVideoDisabled ? 'hidden' : ''}`}
            />
            {isVideoDisabled && (
              <div className="video-placeholder">
                <div className="placeholder-avatar">📷</div>
                <p className="placeholder-text">Camera Off</p>
              </div>
            )}
          </>
        ) : (
          <div className="video-placeholder">
            <p className="placeholder-text">Camera Not Initialized</p>
          </div>
        )}
        <div className="tile-badge local-badge">
          You {isAudioMuted ? '(Muted)' : ''}
        </div>
      </div>
    </div>
  );
};
