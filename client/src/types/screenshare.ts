export type ScreenShareStatus =
  | 'idle'
  | 'starting'
  | 'sharing'
  | 'stopping'
  | 'failed';

export interface ScreenShareState {
  isSharing: boolean;
  status: ScreenShareStatus;
  error?: string;
}
