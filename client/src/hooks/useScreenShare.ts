import { useState, useCallback } from 'react';
import { ScreenShareManager } from '../services/webrtc/ScreenShareManager.js';
import type { ScreenShareState } from '../types/screenshare.js';

export function useScreenShare(
  screenShareManagerRef: React.MutableRefObject<ScreenShareManager | null>
) {
  const [screenShareState, setScreenShareState] = useState<ScreenShareState>({
    isSharing: false,
    status: 'idle',
  });

  const startScreenShare = useCallback(async () => {
    if (screenShareManagerRef.current) {
      setScreenShareState({ isSharing: false, status: 'starting' });
      const success = await screenShareManagerRef.current.startScreenShare();
      if (success) {
        setScreenShareState({ isSharing: true, status: 'sharing' });
      } else {
        setScreenShareState({ isSharing: false, status: 'failed' });
      }
    }
  }, [screenShareManagerRef]);

  const stopScreenShare = useCallback(async () => {
    if (screenShareManagerRef.current) {
      setScreenShareState({ isSharing: true, status: 'stopping' });
      await screenShareManagerRef.current.stopScreenShare();
      setScreenShareState({ isSharing: false, status: 'idle' });
    }
  }, [screenShareManagerRef]);

  const toggleScreenShare = useCallback(async () => {
    if (screenShareState.isSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [screenShareState.isSharing, startScreenShare, stopScreenShare]);

  return {
    isSharing: screenShareState.isSharing,
    screenShareState,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    setScreenShareState,
  };
}
