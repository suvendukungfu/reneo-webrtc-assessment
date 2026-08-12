import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppConnectionState, UserMediaError, MediaControlsState } from '../types/webrtc.js';

import { WebRTCManager } from '../services/webrtc/WebRTCManager.js';
import { MediaManager } from '../services/webrtc/MediaManager.js';
import { ScreenShareManager } from '../services/webrtc/ScreenShareManager.js';
import { DeviceManager } from '../services/webrtc/DeviceManager.js';
import { StatsManager } from '../services/webrtc/StatsManager.js';

import { useSignaling } from './useSignaling.js';
import { useDevices } from './useDevices.js';
import { useScreenShare } from './useScreenShare.js';
import { useConnectionStats } from './useConnectionStats.js';

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

  // Call Duration Timer State
  const [callDuration, setCallDuration] = useState<number>(0);
  const [lastCallDuration, setLastCallDuration] = useState<number>(0);

  // Persistent References
  const isInitiatorRef = useRef<boolean>(false);
  const roomIdRef = useRef<string | null>(null);
  const displayNameRef = useRef<string>('Anonymous');
  const clientIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const iceRestartCountRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const maxIceRestarts = 2;

  // WebRTC Service Managers
  const mediaManagerRef = useRef<MediaManager>(new MediaManager());
  const statsManagerRef = useRef<StatsManager>(new StatsManager());
  const webRTCManagerRef = useRef<WebRTCManager | null>(null);
  const screenShareManagerRef = useRef<ScreenShareManager | null>(null);
  const deviceManagerRef = useRef<DeviceManager | null>(null);

  // Sub-hooks for modular features
  const devices = useDevices(deviceManagerRef);
  const screenShare = useScreenShare(screenShareManagerRef);
  const stats = useConnectionStats();

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

  // Set up signaling hook with event handlers
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

      if (isInitiatorRef.current && webRTCManagerRef.current) {
        try {
          const offer = await webRTCManagerRef.current.createOffer();
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

      if (!webRTCManagerRef.current) return;

      try {
        await webRTCManagerRef.current.setRemoteDescription(payload.sdp);
        const answer = await webRTCManagerRef.current.createAnswer();
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
      if (!webRTCManagerRef.current) return;

      try {
        await webRTCManagerRef.current.setRemoteDescription(payload.sdp);
      } catch (err) {
        console.error('[useWebRTC] Error handling SDP answer:', err);
        updateStateRef.current('failed', 'Failed to set remote description answer.');
      }
    },

    onIceCandidate: async (payload) => {
      if (webRTCManagerRef.current) {
        await webRTCManagerRef.current.addIceCandidate(payload.candidate);
      }
    },

    onPeerLeft: (payload) => {
      peerIdRef.current = null;
      setRemoteStream(null);
      statsManagerRef.current.stopPolling();
      stats.resetStats();
      stopDurationTimer();

      // Promote remaining peer to initiator
      if (payload.isInitiator !== undefined) {
        isInitiatorRef.current = payload.isInitiator;
      } else {
        isInitiatorRef.current = true;
      }

      // Re-initialize peer connection with active local stream
      if (webRTCManagerRef.current) {
        webRTCManagerRef.current.initializeConnection(mediaManagerRef.current.getLocalStream());
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

    if (isInitiatorRef.current && webRTCManagerRef.current) {
      try {
        const offer = await webRTCManagerRef.current.restartIce();
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

  // Stable initialization of WebRTCManager, ScreenShareManager, and DeviceManager
  useEffect(() => {
    const webRTCManager = new WebRTCManager({
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
          iceRestartCountRef.current = 0;
          startDurationTimer();

          // Start getStats polling
          const pc = webRTCManagerRef.current?.getPeerConnection();
          if (pc) {
            statsManagerRef.current.startPolling(pc, (metrics, assessment) => {
              stats.handleMetricsUpdate(metrics, assessment, statsManagerRef.current.getHistory());
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

    const screenShareManager = new ScreenShareManager(
      webRTCManager,
      mediaManagerRef.current,
      {
        onStateChange: (isSharing, statusText) => {
          if (statusText) {
            setStatusMessage(statusText);
          }
          screenShare.setScreenShareState({
            isSharing,
            status: isSharing ? 'sharing' : 'idle',
          });
        },
        onError: (title, message) => {
          setMediaError({
            type: 'UNKNOWN',
            title,
            message,
          });
        },
      }
    );

    const deviceManager = new DeviceManager(
      webRTCManager,
      mediaManagerRef.current,
      {
        onDevicesUpdated: (lists) => {
          devices.setDeviceLists(lists);
          devices.setSelectedDevices(deviceManager.getSelectedDevices());
        },
        onDeviceSwitchState: (isSwitching, message) => {
          if (message) {
            setStatusMessage(message);
          }
          devices.setSwitchState({
            status: isSwitching ? 'switching' : 'idle',
          });
        },
        onError: (title, message) => {
          setMediaError({
            type: 'UNKNOWN',
            title,
            message,
          });
        },
      }
    );

    webRTCManagerRef.current = webRTCManager;
    screenShareManagerRef.current = screenShareManager;
    deviceManagerRef.current = deviceManager;

    return () => {
      webRTCManager.close();
      screenShareManager.cleanup();
      statsManagerRef.current.stopPolling();
      stopDurationTimer();
    };
  }, [startDurationTimer, stopDurationTimer]);

  // Request Local Media (Camera & Microphone)
  const acquireLocalMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await mediaManagerRef.current.acquireLocalMedia();
      setLocalStream(stream);
      setMediaControls({ isAudioMuted: false, isVideoDisabled: false });

      if (webRTCManagerRef.current) {
        webRTCManagerRef.current.initializeConnection(stream);
      }

      // Enumerate devices again after media permission has been granted
      if (deviceManagerRef.current) {
        await deviceManagerRef.current.enumerateDevices();
      }

      return stream;
    } catch (err: unknown) {
      console.error('[useWebRTC] acquireLocalMedia error:', err);

      const errorObj = err instanceof Error ? err : new Error(String(err));
      const errName = errorObj.name;
      const errMessage = errorObj.message;

      if (errMessage === 'BROWSER_INSECURE_CONTEXT') {
        setMediaError({
          type: 'PERMISSION_DENIED',
          title: 'Browser Security Restriction (Insecure Context)',
          message: 'Camera & microphone access requires HTTPS or localhost. Browsers block media APIs when accessed over plain HTTP IP addresses.',
          details: 'Solution: Access via localhost:3000 or use an HTTPS tunnel.',
        });
      } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setMediaError({
          type: 'PERMISSION_DENIED',
          title: 'Camera and microphone access is required',
          message: 'Please allow access in your browser settings and try again.',
          details: errMessage,
        });
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setMediaError({
          type: 'DEVICE_NOT_FOUND',
          title: 'No media device detected',
          message: 'No camera or microphone was found on this device. Please connect a media device.',
          details: errMessage,
        });
      } else {
        setMediaError({
          type: 'UNKNOWN',
          title: 'Media Capture Error',
          message: errMessage || 'An unexpected error occurred while accessing media devices.',
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
    statsManagerRef.current.stopPolling();
    stats.resetStats();

    // Clean up screen sharing resources
    if (screenShareManagerRef.current) {
      screenShareManagerRef.current.cleanup();
    }

    // Stop local media tracks
    mediaManagerRef.current.stopAllTracks();
    setLocalStream(null);

    // Clear remote media stream
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    // Close RTCPeerConnection
    if (webRTCManagerRef.current) {
      webRTCManagerRef.current.close();
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
  }, [callDuration, remoteStream, signaling, stats, stopDurationTimer, updateState]);

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
    const isMuted = mediaManagerRef.current.toggleAudio();
    setMediaControls((prev) => ({ ...prev, isAudioMuted: isMuted }));
  }, []);

  // Disable / Enable Video (Toggle track.enabled without rebuilding connection)
  const toggleVideo = useCallback(() => {
    const isDisabled = mediaManagerRef.current.toggleVideo();
    setMediaControls((prev) => ({ ...prev, isVideoDisabled: isDisabled }));
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

    // B3 Quality Metrics & Assessment
    qualityMetrics: stats.qualityMetrics,
    qualityAssessment: stats.qualityAssessment,
    qualityHistory: stats.qualityHistory,

    // B1 Screen Sharing
    isScreenSharing: screenShare.isSharing,
    screenShareState: screenShare.screenShareState,
    toggleScreenShare: screenShare.toggleScreenShare,
    startScreenShare: screenShare.startScreenShare,
    stopScreenShare: screenShare.stopScreenShare,

    // B2 Device Switching
    deviceLists: devices.deviceLists,
    selectedDevices: devices.selectedDevices,
    deviceSwitchState: devices.switchState,
    switchMicrophone: devices.switchMicrophone,
    switchCamera: (deviceId: string) => devices.switchCamera(deviceId, screenShare.isSharing),
    switchSpeaker: devices.switchSpeaker,
    refreshDevices: devices.refreshDevices,

    // General Call Controls
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
