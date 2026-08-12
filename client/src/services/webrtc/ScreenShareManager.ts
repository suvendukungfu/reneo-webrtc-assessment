import { WebRTCManager } from './WebRTCManager.js';
import { MediaManager } from './MediaManager.js';

export interface ScreenShareCallbacks {
  onStateChange: (isSharing: boolean, statusText?: string) => void;
  onError: (title: string, message: string) => void;
}

export class ScreenShareManager {
  private displayStream: MediaStream | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private isSharingState: boolean = false;
  private webRTCManager: WebRTCManager;
  private mediaManager: MediaManager;
  private callbacks: ScreenShareCallbacks;

  constructor(
    webRTCManager: WebRTCManager,
    mediaManager: MediaManager,
    callbacks: ScreenShareCallbacks
  ) {
    this.webRTCManager = webRTCManager;
    this.mediaManager = mediaManager;
    this.callbacks = callbacks;
  }

  /**
   * Starts screen sharing using getDisplayMedia without tearing down RTCPeerConnection or renegotiating
   */
  public async startScreenShare(): Promise<boolean> {
    if (this.isSharingState) return true;

    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.callbacks.onError(
        'Screen Share Unsupported',
        'Screen sharing is not supported by your browser.'
      );
      return false;
    }

    try {
      this.callbacks.onStateChange(false, 'Requesting screen selection...');

      // 1. Acquire display media (video only)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      if (!track) {
        throw new Error('No video track found in display stream.');
      }

      this.displayStream = stream;
      this.screenTrack = track;
      this.isSharingState = true;

      // 2. Handle native browser "Stop sharing" button click
      track.onended = () => {
        console.log('[ScreenShareManager] Screen track ended via browser UI.');
        this.stopScreenShare();
      };

      // 3. Replace outgoing video track on existing RTCRtpSender via replaceTrack()
      // Zero createOffer(), Zero createAnswer(), Zero peer connection rebuild!
      await this.webRTCManager.replaceVideoTrack(track);

      this.callbacks.onStateChange(true, 'You are sharing your screen');
      return true;
    } catch (err: unknown) {
      console.warn('[ScreenShareManager] getDisplayMedia error/cancel:', err);

      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        // User cancelled screen picker - non-blocking notification
        this.callbacks.onStateChange(false, 'Screen sharing cancelled');
      } else {
        this.callbacks.onError(
          'Unable to Start Screen Sharing',
          errorObj.message || 'Could not acquire screen share stream.'
        );
        this.callbacks.onStateChange(false, 'Ready');
      }
      return false;
    }
  }

  /**
   * Stops screen sharing and automatically restores original camera track
   */
  public async stopScreenShare(): Promise<void> {
    if (!this.isSharingState && !this.screenTrack) return;

    // 1. Stop screen track resources
    if (this.screenTrack) {
      this.screenTrack.onended = null;
      this.screenTrack.stop();
      this.screenTrack = null;
    }
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((t) => t.stop());
      this.displayStream = null;
    }

    this.isSharingState = false;

    // 2. Restore preserved camera track to active RTCRtpSender
    const cameraTrack = this.mediaManager.getCameraTrack();
    if (cameraTrack) {
      await this.webRTCManager.replaceVideoTrack(cameraTrack);
    }

    this.callbacks.onStateChange(false, 'Connected');
  }

  public getDisplayStream(): MediaStream | null {
    return this.displayStream;
  }

  public getScreenTrack(): MediaStreamTrack | null {
    return this.screenTrack;
  }

  public isSharing(): boolean {
    return this.isSharingState;
  }

  /**
   * Cleans up all screen share resources on call termination
   */
  public cleanup(): void {
    if (this.screenTrack) {
      this.screenTrack.onended = null;
      this.screenTrack.stop();
      this.screenTrack = null;
    }
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((t) => t.stop());
      this.displayStream = null;
    }
    this.isSharingState = false;
  }
}
