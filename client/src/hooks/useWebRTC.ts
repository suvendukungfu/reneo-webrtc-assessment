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

  // Call Duration Timer
  const [callDuration, setCallDuration] = useState<number>(0);
  const [lastCallDuration, setLastCallDuration] = useState<number>(0);

  // Persistent References
  const isInitiatorRef = useRef<boolean>(false);
  const roomIdRef = useRef<string | null>(null);
  const displayNameRef = useRef<string>('Anonymous');
  const clientIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const iceRestartCountRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const maxIceRestarts = 2;

  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const statsServiceRef = useRef<StatsService>(new StatsService());

  const connectionStateRef = useRef<AppConnectionState>(connectionState);
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  // Update UI status message based on AppConnectionState
  const updateState = useCallback((newState: AppConnectionState, customMessage?: string) => {
    setConnectionState(newState);
    connectionStateRef.current = newState;
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
      case 'ended':
        setStatusMessage('Call ended.');
        break;
    }
  }, []);

  const updateStateRef = useRef(updateState);
  useEffect(() => {
    updateStateRef.current = updateState;
  }, [updateState]);

  // Call Duration Timer Management
  const stopDurationTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setCallDuration(0);
    timerIntervalRef.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [stopDurationTimer]);

  // Set up signaling hooks with callbacks
  const signaling = useSignaling({
    onJoined: (payload) => {
      clientIdRef.current = payload.clientId;
      isInitiatorRef.current = payload.isInitiator;
      if (payload.isInitiator) {
        updateStateRef.current('waiting');
      }
    },

    onPeerJoined: async (payload) => {
      peerIdRef.current = payload.peerId;
      updateStateRef.current('connecting');

      // If we are the initiator (Participant A), create offer and send to Peer B
      if (isInitiatorRef.current && webrtcServiceRef.current) {
        try {
          const offer = await webrtcServiceRef.current.createOffer();
          sendSignalRef.current({
            type: 'OFFER',
            payload: { sdp: offer },
          });
        } catch (err) {
          console.error('[useWebRTC] Error creating offer:', err);
          updateStateRef.current('failed', 'Failed to create WebRTC offer.');
        }
      }
    },

    onOffer: async (payload) => {
      peerIdRef.current = payload.senderId;
      updateStateRef.current('connecting');

      if (!webrtcServiceRef.current) return;

      try {
        await webrtcServiceRef.current.setRemoteDescription(payload.sdp);
        const answer = await webrtcServiceRef.current.createAnswer();
        sendSignalRef.current({
          type: 'ANSWER',
          payload: { sdp: answer },
        });
      } catch (err) {
        console.error('[useWebRTC] Error handling SDP offer:', err);
        updateStateRef.current('failed', 'Failed to handle remote offer.');
      }
    },

    onAnswer: async (payload) => {
      if (!webrtcServiceRef.current) return;

      try {
        await webrtcServiceRef.current.setRemoteDescription(payload.sdp);
      } catch (err) {
        console.error('[useWebRTC] Error handling SDP answer:', err);
        updateStateRef.current('failed', 'Failed to set remote description answer.');
      }
    },

    onIceCandidate: async (payload) => {
      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.addIceCandidate(payload.candidate);
      }
    },

    onPeerLeft: (payload) => {
      peerIdRef.current = null;
      setRemoteStream(null);
      statsServiceRef.current.stopPolling();
      setQualityMetrics(null);
      stopDurationTimer();

      // Promote remaining peer to initiator
      if (payload.isInitiator !== undefined) {
        isInitiatorRef.current = payload.isInitiator;
      } else {
        isInitiatorRef.current = true;
      }

      // Re-initialize peer connection with active local stream
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.initializeConnection(localStreamRef.current);
      }

      setMediaError({
        type: 'PEER_LEFT',
        title: 'Participant Left',
        message: 'The other participant left the room.',
      });

      updateStateRef.current('waiting');
    },

    onRoomFull: (payload) => {
      setMediaError({
        type: 'ROOM_FULL',
        title: 'Room Full',
        message: payload.message,
      });
      cleanupCall(false);
      updateStateRef.current('idle');
    },

    onError: (payload) => {
      setMediaError({
        type: 'SIGNALING_UNAVAILABLE',
        title: 'Signaling Error',
        message: payload.message,
      });
    },

    onSignalingDisconnected: () => {
      if (connectionStateRef.current !== 'ended') {
        updateStateRef.current('disconnected');
      }
    },
  });

  // Keep a stable ref to sendSignal to prevent effect re-subscriptions
  const sendSignalRef = useRef(signaling.sendSignal);
  useEffect(() => {
    sendSignalRef.current = signaling.sendSignal;
  }, [signaling.sendSignal]);

  // Handle ICE Failure and trigger bounded ICE Restart
  const handleIceFailure = useCallback(async () => {
    if (iceRestartCountRef.current >= maxIceRestarts) {
      console.warn('[useWebRTC] Maximum ICE restarts reached. Transitioning to failed state.');
      updateStateRef.current('failed', 'Connection failed after multiple recovery attempts.');
      return;
    }

    iceRestartCountRef.current += 1;
    updateStateRef.current(
      'reconnecting',
      `Re-establishing network path (${iceRestartCountRef.current}/${maxIceRestarts})...`
    );

    if (isInitiatorRef.current && webrtcServiceRef.current) {
      try {
        const offer = await webrtcServiceRef.current.restartIce();
        sendSignalRef.current({
          type: 'OFFER',
          payload: { sdp: offer },
        });
      } catch (err) {
        console.error('[useWebRTC] Error during ICE restart offer:', err);
        updateStateRef.current('failed', 'ICE restart failed.');
      }
    }
  }, []);

  const handleIceFailureRef = useRef(handleIceFailure);
  useEffect(() => {
    handleIceFailureRef.current = handleIceFailure;
  }, [handleIceFailure]);

  // Stable initialization of WebRTCService instance (mount once)
  useEffect(() => {
    const service = new WebRTCService({
      onIceCandidate: (candidate) => {
        sendSignalRef.current({
          type: 'ICE_CANDIDATE',
          payload: { candidate },
        });
      },
      onTrack: (stream) => {
        setRemoteStream(stream);
      },
      onConnectionStateChange: (state, iceState) => {
        if (state === 'connected' || iceState === 'connected' || iceState === 'completed') {
          updateStateRef.current('connected');
          iceRestartCountRef.current = 0; // Reset restart counter on clean connect
          startDurationTimer();

          // Start getStats observability polling
          const pc = webrtcServiceRef.current?.getPeerConnection();
          if (pc) {
            statsServiceRef.current.startPolling(pc, (metrics) => {
              setQualityMetrics(metrics);
            });
          }
        } else if (state === 'connecting' || iceState === 'checking') {
          updateStateRef.current('connecting');
        } else if (iceState === 'disconnected') {
          updateStateRef.current('reconnecting');
        } else if (state === 'failed' || iceState === 'failed') {
          stopDurationTimer();
          handleIceFailureRef.current();
        } else if (state === 'closed' || iceState === 'closed') {
          stopDurationTimer();
          if (connectionStateRef.current !== 'ended') {
            updateStateRef.current('disconnected');
          }
        }
      },
      onIceFailureNeeded: () => {
        handleIceFailureRef.current();
      },
    });

    webrtcServiceRef.current = service;

    return () => {
      service.close();
      statsServiceRef.current.stopPolling();
      stopDurationTimer();
    };
  }, [startDurationTimer, stopDurationTimer]);

  // Request Local Media (Camera & Microphone)
  const acquireLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMediaError({
        type: 'PERMISSION_DENIED',
        title: 'Browser Security Restriction (Insecure Context)',
        message: 'Camera & microphone access requires HTTPS or localhost. Browsers block media APIs when accessed over plain HTTP IP addresses (e.g. http://192.168.1.100).',
        details: 'Solution: Use an HTTPS tunnel (npx localtunnel --port 3000) or test on localhost.',
      });
      updateState('idle');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      localStreamRef.current = stream;
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
          title: 'Camera and microphone access is required',
          message: 'Please allow access in your browser settings and try again.',
          details: err.message,
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMediaError({
          type: 'DEVICE_NOT_FOUND',
          title: 'No media device detected',
          message: 'No camera or microphone was found on this device. Please connect a media device.',
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

  // Full Cleanup on Hang Up / Transition
  const cleanupCall = useCallback((toEndedState: boolean = true) => {
    stopDurationTimer();
    setLastCallDuration(callDuration);
    setCallDuration(0);
    statsServiceRef.current.stopPolling();
    setQualityMetrics(null);

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
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

    // Reset references
    isInitiatorRef.current = false;
    clientIdRef.current = null;
    peerIdRef.current = null;
    iceRestartCountRef.current = 0;

    setMediaControls({ isAudioMuted: false, isVideoDisabled: false });
    if (toEndedState) {
      updateState('ended');
    } else {
      updateState('idle');
    }
  }, [callDuration, remoteStream, signaling, stopDurationTimer, updateState]);

  // Join Call Flow
  const joinCall = useCallback(
    async (roomId: string, displayName?: string, customServerUrl?: string) => {
      setMediaError(null);
      roomIdRef.current = roomId;
      displayNameRef.current = displayName || 'Anonymous';

      // 1. Acquire Camera & Microphone
      const stream = await acquireLocalMedia();
      if (!stream) return;

      // 2. Connect to WebSocket Signaling Server
      const serverUrl = customServerUrl || `ws://${window.location.hostname || 'localhost'}:8080`;
      signaling.connect(serverUrl, roomId, displayName);
    },
    [acquireLocalMedia, signaling]
  );

  // Mute / Unmute Audio (Toggle track.enabled without rebuilding connection)
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMediaControls((prev) => ({ ...prev, isAudioMuted: !audioTrack.enabled }));
    }
  }, []);

  // Disable / Enable Video (Toggle track.enabled without rebuilding connection)
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setMediaControls((prev) => ({ ...prev, isVideoDisabled: !videoTrack.enabled }));
    }
  }, []);

  const clearError = useCallback(() => {
    setMediaError(null);
  }, []);

  const resetToHome = useCallback(() => {
    cleanupCall(false);
    updateState('idle');
  }, [cleanupCall, updateState]);

  return {
    connectionState,
    statusMessage,
    localStream,
    remoteStream,
    mediaError,
    mediaControls,
    qualityMetrics,
    callDuration,
    lastCallDuration,
    roomId: roomIdRef.current || 'reneo-room-001',
    displayName: displayNameRef.current,
    signalingStatus: signaling.status,
    joinCall,
    hangUp: () => cleanupCall(true),
    resetToHome,
    toggleAudio,
    toggleVideo,
    clearError,
    acquireLocalMedia,
  };
}
