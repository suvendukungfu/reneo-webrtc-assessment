export type AppConnectionState =
  | 'idle'
  | 'joining'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed'
  | 'ended';

export interface ConnectionStateInfo {
  state: AppConnectionState;
  message: string;
}

export type MediaErrorType =
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'SIGNALING_UNAVAILABLE'
  | 'ROOM_FULL'
  | 'PEER_LEFT'
  | 'CONNECTION_FAILED'
  | 'UNKNOWN';

export interface UserMediaError {
  type: MediaErrorType;
  title: string;
  message: string;
  details?: string;
}

export interface MediaControlsState {
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
}
