import { useState, useCallback, useRef, useEffect } from 'react';
import type { ClientSignalMessage, ServerSignalMessage } from '../types/signaling.js';

export type SignalingStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseSignalingCallbacks {
  onJoined?: (payload: { clientId: string; roomId: string; isInitiator: boolean }) => void;
  onPeerJoined?: (payload: { peerId: string }) => void;
  onPeerLeft?: (payload: { peerId: string; isInitiator?: boolean }) => void;
  onOffer?: (payload: { sdp: RTCSessionDescriptionInit; senderId: string }) => void;
  onAnswer?: (payload: { sdp: RTCSessionDescriptionInit; senderId: string }) => void;
  onIceCandidate?: (payload: { candidate: RTCIceCandidateInit; senderId: string }) => void;
  onRoomFull?: (payload: { roomId: string; message: string }) => void;
  onError?: (payload: { message: string; code?: string }) => void;
  onSignalingDisconnected?: () => void;
}

export function useSignaling(callbacks: UseSignalingCallbacks) {
  const [status, setStatus] = useState<SignalingStatus>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef<UseSignalingCallbacks>(callbacks);

  // Keep callbacksRef up to date without triggering re-connects
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const sendSignal = useCallback((message: ClientSignalMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[useSignaling] Cannot send message: WebSocket is not open.');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'LEAVE' }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(
    (serverUrl: string, roomId: string, displayName?: string) => {
      disconnect(); // Ensure clean state before connecting

      setStatus('connecting');
      let ws: WebSocket;
      try {
        ws = new WebSocket(serverUrl);
      } catch {
        setStatus('error');
        callbacksRef.current.onError?.({
          message: `Failed to connect to signaling server at ${serverUrl}`,
        });
        return;
      }

      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        // Automatically send JOIN message once WebSocket opens
        ws.send(
          JSON.stringify({
            type: 'JOIN',
            payload: { roomId, displayName },
          } satisfies ClientSignalMessage)
        );
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: ServerSignalMessage = JSON.parse(event.data);
          switch (msg.type) {
            case 'JOINED':
              callbacksRef.current.onJoined?.(msg.payload);
              break;
            case 'PEER_JOINED':
              callbacksRef.current.onPeerJoined?.(msg.payload);
              break;
            case 'PEER_LEFT':
              callbacksRef.current.onPeerLeft?.(msg.payload);
              break;
            case 'OFFER':
              callbacksRef.current.onOffer?.(msg.payload);
              break;
            case 'ANSWER':
              callbacksRef.current.onAnswer?.(msg.payload);
              break;
            case 'ICE_CANDIDATE':
              callbacksRef.current.onIceCandidate?.(msg.payload);
              break;
            case 'ROOM_FULL':
              callbacksRef.current.onRoomFull?.(msg.payload);
              break;
            case 'ERROR':
              callbacksRef.current.onError?.(msg.payload);
              break;
          }
        } catch (err) {
          console.error('[useSignaling] Error parsing incoming WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        callbacksRef.current.onError?.({
          message: 'WebSocket signaling server connection error.',
        });
      };

      ws.onclose = () => {
        setStatus('disconnected');
        callbacksRef.current.onSignalingDisconnected?.();
      };
    },
    [disconnect]
  );

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    sendSignal,
  };
}
