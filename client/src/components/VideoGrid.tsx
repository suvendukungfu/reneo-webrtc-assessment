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

const VideoGridComponent: React.FC<VideoGridProps> = ({
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

  // 1. Attach local stream safely WITHOUT unnecessary srcObject reassignment
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) return;

    if (videoEl.srcObject !== localStream) {
      videoEl.srcObject = localStream;
      if (localStream) {
        videoEl.play().catch((err: unknown) => {
          const error = err as { name?: string };
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.warn('[VideoGrid] Local video play error:', err);
          }
        });
      }
    }
  }, [localStream]);

  // 2. Attach remote stream safely WITHOUT unnecessary srcObject reassignment
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (!videoEl) return;

    if (onRemoteVideoElementRef) {
      onRemoteVideoElementRef(videoEl);
    }

    if (videoEl.srcObject !== remoteStream) {
      videoEl.srcObject = remoteStream;
      if (remoteStream) {
        videoEl.play().catch((err: unknown) => {
          const error = err as { name?: string };
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.warn('[VideoGrid] Remote video play error:', err);
          }
        });
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
  const showRemoteEmptyOverlay = !remoteStream || !isConnected;
  const showLocalDisabledOverlay = isVideoDisabled && !isScreenSharing;

  return (
    <div className="video-stage">
      {/* Primary Surface: Remote Video Tile */}
      <div className="remote-video-container">
        {/* CRITICAL STABILITY RULE: <video> element is PERMANENTLY MOUNTED in the DOM */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`remote-video-element ${showRemoteEmptyOverlay ? 'video-hidden' : ''}`}
        />

        {/* Persistent Overlay for Waiting / Connecting / Empty State */}
        {showRemoteEmptyOverlay && (
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

        {/* Remote Participant Status Overlay */}
        <div className="remote-overlay">
          <div className="overlay-pill">
            <span className={`status-dot-sm ${isConnected ? 'dot-online' : 'dot-waiting'}`} />
            <span className="overlay-name">
              {isConnected ? 'Remote Peer' : 'Participant B'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Picture-in-Picture Local Video Surface */}
      <div className="local-pip-card">
        {/* CRITICAL STABILITY RULE: Local <video> element is PERMANENTLY MOUNTED */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={`local-video-element ${showLocalDisabledOverlay || !localStream ? 'video-hidden' : ''}`}
        />

        {/* Persistent Camera Off / Offline Overlay */}
        {(showLocalDisabledOverlay || !localStream) && (
          <div className="local-disabled-placeholder">
            {localStream ? (
              <>
                <div className="avatar-sm">{getInitials(displayName)}</div>
                <div className="disabled-text-row">
                  <VideoOff size={14} className="text-danger" />
                  <span>Camera off</span>
                </div>
              </>
            ) : (
              <span className="placeholder-sub">Camera Offline</span>
            )}
          </div>
        )}

        {/* Local Card Overlay Information */}
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

/**
 * Custom React.memo comparator ensuring VideoGrid re-renders ONLY when media streams or UI states change,
 * completely isolating video stage rendering from 1000ms telemetry/getStats updates.
 */
export const VideoGrid = React.memo(VideoGridComponent, (prevProps, nextProps) => {
  return (
    prevProps.localStream === nextProps.localStream &&
    prevProps.remoteStream === nextProps.remoteStream &&
    prevProps.connectionState === nextProps.connectionState &&
    prevProps.isVideoDisabled === nextProps.isVideoDisabled &&
    prevProps.isAudioMuted === nextProps.isAudioMuted &&
    prevProps.isScreenSharing === nextProps.isScreenSharing &&
    prevProps.roomId === nextProps.roomId &&
    prevProps.displayName === nextProps.displayName
  );
});
