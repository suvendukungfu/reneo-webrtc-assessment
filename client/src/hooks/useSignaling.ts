import { useState, useRef, useCallback, useEffect } from 'react';
import type { ClientSignalMessage, ServerSignalMessage } from '../types/signaling.js';

export type SignalingStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SignalingCallbacks {
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

export function useSignaling(callbacks: SignalingCallbacks) {
  const [status, setStatus] = useState<SignalingStatus>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);

  // Store latest callbacks in ref to prevent unnecessary re-subscriptions
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Clean up event listeners before closing to prevent memory leaks / stale state updates
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      socketRef.current.onclose = null;
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'LEAVE' }));
        } catch {
          // Socket already closing
        }
      }
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(
    async (serverUrl: string, roomId: string, displayName?: string) => {
      disconnect(); // Ensure clean state before connecting

      setStatus('connecting');

      // Pre-flight bypass for localtunnel / tunnel proxies to skip interstitial landing pages
      if (serverUrl.includes('loca.lt')) {
        const httpUrl = serverUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
        try {
          await fetch(httpUrl, {
            headers: { 'bypass-tunnel-reminder': 'true' },
            mode: 'no-cors',
          });
        } catch {
          // Ignore CORS response errors; bypass request header registration settles session
        }
      }

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
          message: `WebSocket signaling connection error at ${serverUrl}. If testing locally, ensure your server is running via 'npm run dev:server'.`,
        });
      };

      ws.onclose = () => {
        setStatus('disconnected');
        callbacksRef.current.onSignalingDisconnected?.();
      };
    },
    [disconnect]
  );

  const sendMessage = useCallback((message: ClientSignalMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[useSignaling] Cannot send message: WebSocket is not open.');
    }
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
    sendSignal: sendMessage,
  };
}
