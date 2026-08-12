import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppConnectionState, UserMediaError, MediaControlsState } from '../types/webrtc.js';
import type { QualityMetrics } from '../types/stats.js';
import { WebRTCService } from '../services/webrtc.service.js';
import { StatsService } from '../services/stats.service.js';
import { useSignaling } from './useSignaling.js';

export function useWebRTC() {
  const [connectionState, setConnectionState] = useState<AppConnectionState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to join.');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<UserMediaError | null>(null);
  const [mediaControls, setMediaControls] = useState<MediaControlsState>({
    isAudioMuted: false,
    isVideoDisabled: false,
  });
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);

  // References to maintain persistent state across callbacks
  const isInitiatorRef = useRef<boolean>(false);
  const roomIdRef = useRef<string | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const iceRestartCountRef = useRef<number>(0);
  const maxIceRestarts = 2;

  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const statsServiceRef = useRef<StatsService>(new StatsService());

  // Update UI status message based on AppConnectionState
  const updateState = useCallback((newState: AppConnectionState, customMessage?: string) => {
    setConnectionState(newState);
    if (customMessage) {
      setStatusMessage(customMessage);
      return;
    }
    switch (newState) {
      case 'idle':
        setStatusMessage('Ready to join.');
        break;
      case 'joining':
        setStatusMessage('Requesting camera and microphone access...');
        break;
      case 'waiting':
        setStatusMessage('Waiting for another participant to join...');
        break;
      case 'connecting':
        setStatusMessage('Establishing peer connection...');
        break;
      case 'connected':
        setStatusMessage('Connected');
        break;
      case 'reconnecting':
        setStatusMessage('Connection interrupted. Trying to recover...');
        break;
      case 'disconnected':
        setStatusMessage('Disconnected');
        break;
      case 'failed':
        setStatusMessage('Connection failed. Please try again.');
        break;
    }
  }, []);

  // Set up signaling hooks with callbacks
  const signaling = useSignaling({
    onJoined: (payload) => {
      clientIdRef.current = payload.clientId;
      isInitiatorRef.current = payload.isInitiator;
      if (payload.isInitiator) {
        updateState('waiting');
      }
    },

    onPeerJoined: async (payload) => {
      peerIdRef.current = payload.peerId;
      updateState('connecting');

      // If we are the initiator (Participant A), create offer and send to Peer B
      if (isInitiatorRef.current && webrtcServiceRef.current) {
        try {
          const offer = await webrtcServiceRef.current.createOffer();
          signaling.sendSignal({
            type: 'OFFER',
            payload: { sdp: offer },
          });
        } catch (err) {
          console.error('[useWebRTC] Error creating offer:', err);
          updateState('failed', 'Failed to create WebRTC offer.');
        }
      }
    },

    onOffer: async (payload) => {
      peerIdRef.current = payload.senderId;
      updateState('connecting');

      if (!webrtcServiceRef.current) return;

      try {
        await webrtcServiceRef.current.setRemoteDescription(payload.sdp);
        const answer = await webrtcServiceRef.current.createAnswer();
        signaling.sendSignal({
          type: 'ANSWER',
          payload: { sdp: answer },
        });
      } catch (err) {
        console.error('[useWebRTC] Error handling SDP offer:', err);
        updateState('failed', 'Failed to handle remote offer.');
      }
    },

    onAnswer: async (payload) => {
      if (!webrtcServiceRef.current) return;

      try {
        await webrtcServiceRef.current.setRemoteDescription(payload.sdp);
      } catch (err) {
        console.error('[useWebRTC] Error handling SDP answer:', err);
        updateState('failed', 'Failed to set remote description answer.');
      }
    },

    onIceCandidate: async (payload) => {
      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.addIceCandidate(payload.candidate);
      }
    },

    onPeerLeft: () => {
      peerIdRef.current = null;
      setRemoteStream(null);
      statsServiceRef.current.stopPolling();
      setQualityMetrics(null);

      // Re-initialize peer connection for when a new peer joins
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.initializeConnection(localStream);
      }

      setMediaError({
        type: 'PEER_LEFT',
        title: 'Participant Left',
        message: 'The other participant left the room.',
      });

      updateState('waiting');
    },

    onRoomFull: (payload) => {
      setMediaError({
        type: 'ROOM_FULL',
        title: 'Room Full',
        message: payload.message,
      });
      cleanupCall();
      updateState('idle');
    },

    onError: (payload) => {
      setMediaError({
        type: 'SIGNALING_UNAVAILABLE',
        title: 'Signaling Error',
        message: payload.message,
      });
      if (connectionState === 'connecting' || connectionState === 'joining') {
        updateState('failed', payload.message);
      }
    },

    onSignalingDisconnected: () => {
      if (connectionState !== 'idle') {
        updateState('disconnected');
      }
    },
  });

  // Handle ICE Failure and trigger bounded ICE Restart
  const handleIceFailure = useCallback(async () => {
    if (iceRestartCountRef.current >= maxIceRestarts) {
      console.warn('[useWebRTC] Maximum ICE restarts reached. Transitioning to failed state.');
      updateState('failed', 'Connection failed after multiple recovery attempts.');
      return;
    }

    iceRestartCountRef.current += 1;
    updateState('reconnecting', `Attempting ICE restart (${iceRestartCountRef.current}/${maxIceRestarts})...`);

    if (isInitiatorRef.current && webrtcServiceRef.current) {
      try {
        const offer = await webrtcServiceRef.current.restartIce();
        signaling.sendSignal({
          type: 'OFFER',
          payload: { sdp: offer },
        });
      } catch (err) {
        console.error('[useWebRTC] Error during ICE restart offer:', err);
        updateState('failed', 'ICE restart failed.');
      }
    }
  }, [signaling, updateState]);

  // Initialize WebRTCService instance
  useEffect(() => {
    const service = new WebRTCService({
      onIceCandidate: (candidate) => {
        signaling.sendSignal({
          type: 'ICE_CANDIDATE',
          payload: { candidate },
        });
      },
      onTrack: (stream) => {
        setRemoteStream(stream);
      },
      onConnectionStateChange: (state, iceState) => {
        if (state === 'connected' || iceState === 'connected' || iceState === 'completed') {
          updateState('connected');
          iceRestartCountRef.current = 0; // Reset restart counter on clean connect

          // Start getStats observability polling
          const pc = webrtcServiceRef.current?.getPeerConnection();
          if (pc) {
            statsServiceRef.current.startPolling(pc, (metrics) => {
              setQualityMetrics(metrics);
            });
          }
        } else if (state === 'connecting' || iceState === 'checking') {
          updateState('connecting');
        } else if (iceState === 'disconnected') {
          updateState('reconnecting');
        } else if (state === 'failed' || iceState === 'failed') {
          handleIceFailure();
        } else if (state === 'closed' || iceState === 'closed') {
          updateState('disconnected');
        }
      },
      onIceFailureNeeded: () => {
        handleIceFailure();
      },
    });

    webrtcServiceRef.current = service;

    return () => {
      service.close();
      statsServiceRef.current.stopPolling();
    };
  }, [handleIceFailure, signaling, updateState]);

  // Request Local Media (Camera & Microphone)
  const acquireLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    updateState('joining');
    setMediaError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      setLocalStream(stream);
      setMediaControls({ isAudioMuted: false, isVideoDisabled: false });

      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.initializeConnection(stream);
      }

      return stream;
    } catch (err: any) {
      console.error('[useWebRTC] getUserMedia error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError({
          type: 'PERMISSION_DENIED',
          title: 'Permission Denied',
          message: 'Camera and microphone access was denied. Please allow media permissions in your browser settings and try again.',
          details: err.message,
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMediaError({
          type: 'DEVICE_NOT_FOUND',
          title: 'Media Device Missing',
          message: 'No camera or microphone was found on this device. Please connect a camera and microphone to continue.',
          details: err.message,
        });
      } else {
        setMediaError({
          type: 'UNKNOWN',
          title: 'Media Capture Error',
          message: err.message || 'An unexpected error occurred while accessing media devices.',
        });
      }

      updateState('idle');
      return null;
    }
  }, [updateState]);

  // Full Cleanup on Hang Up
  const cleanupCall = useCallback(() => {
    statsServiceRef.current.stopPolling();
    setQualityMetrics(null);

    // Stop local media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Clear remote media stream
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    // Close RTCPeerConnection
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.close();
    }

    // Close WebSocket
    signaling.disconnect();

    // Reset references and states
    isInitiatorRef.current = false;
    roomIdRef.current = null;
    clientIdRef.current = null;
    peerIdRef.current = null;
    iceRestartCountRef.current = 0;

    setMediaControls({ isAudioMuted: false, isVideoDisabled: false });
    updateState('idle');
  }, [localStream, remoteStream, signaling, updateState]);

  // Join Call Flow
  const joinCall = useCallback(
    async (roomId: string, displayName?: string, customServerUrl?: string) => {
      setMediaError(null);
      roomIdRef.current = roomId;

      // 1. Acquire Camera & Microphone
      const stream = await acquireLocalMedia();
      if (!stream) return;

      // 2. Connect to WebSocket Signaling Server
      const serverUrl = customServerUrl || `ws://${window.location.hostname}:8080`;
      signaling.connect(serverUrl, roomId, displayName);
    },
    [acquireLocalMedia, signaling]
  );

  // Mute / Unmute Audio (Toggle track.enabled without rebuilding connection)
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMediaControls((prev) => ({ ...prev, isAudioMuted: !audioTrack.enabled }));
    }
  }, [localStream]);

  // Disable / Enable Video (Toggle track.enabled without rebuilding connection)
  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setMediaControls((prev) => ({ ...prev, isVideoDisabled: !videoTrack.enabled }));
    }
  }, [localStream]);

  const clearError = useCallback(() => {
    setMediaError(null);
  }, []);

  return {
    connectionState,
    statusMessage,
    localStream,
    remoteStream,
    mediaError,
    mediaControls,
    qualityMetrics,
    signalingStatus: signaling.status,
    joinCall,
    hangUp: cleanupCall,
    toggleAudio,
    toggleVideo,
    clearError,
  };
}
