export class MediaManager {
  private localStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private micTrack: MediaStreamTrack | null = null;
  private isAudioMutedState: boolean = false;
  private isVideoDisabledState: boolean = false;

  /**
   * Acquires initial local camera and microphone stream
   */
  public async acquireLocalMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('BROWSER_INSECURE_CONTEXT');
    }

    const defaultConstraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: true,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);

    this.localStream = stream;
    this.cameraTrack = stream.getVideoTracks()[0] || null;
    this.micTrack = stream.getAudioTracks()[0] || null;

    this.isAudioMutedState = false;
    this.isVideoDisabledState = false;

    return stream;
  }

  /**
   * Returns current active MediaStream
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Returns active camera track (preserved during screen share)
   */
  public getCameraTrack(): MediaStreamTrack | null {
    return this.cameraTrack;
  }

  /**
   * Returns active microphone track
   */
  public getMicTrack(): MediaStreamTrack | null {
    return this.micTrack;
  }

  /**
   * Sets new camera track and updates local stream
   */
  public setCameraTrack(newTrack: MediaStreamTrack | null): void {
    if (this.cameraTrack && this.cameraTrack !== newTrack) {
      this.cameraTrack.stop();
    }
    this.cameraTrack = newTrack;

    if (this.localStream && newTrack) {
      // Remove existing video tracks from localStream
      this.localStream.getVideoTracks().forEach((t) => this.localStream?.removeTrack(t));
      this.localStream.addTrack(newTrack);
    }
  }

  /**
   * Sets new microphone track and updates local stream
   */
  public setMicTrack(newTrack: MediaStreamTrack | null): void {
    if (this.micTrack && this.micTrack !== newTrack) {
      this.micTrack.stop();
    }
    this.micTrack = newTrack;

    if (this.localStream && newTrack) {
      this.localStream.getAudioTracks().forEach((t) => this.localStream?.removeTrack(t));
      this.localStream.addTrack(newTrack);
    }
  }

  /**
   * Mutes or unmutes microphone audio without destroying track or connection
   */
  public toggleAudio(): boolean {
    if (this.micTrack) {
      this.micTrack.enabled = !this.micTrack.enabled;
      this.isAudioMutedState = !this.micTrack.enabled;
      return this.isAudioMutedState;
    }
    return this.isAudioMutedState;
  }

  /**
   * Disables or enables camera video without destroying track or connection
   */
  public toggleVideo(): boolean {
    if (this.cameraTrack) {
      this.cameraTrack.enabled = !this.cameraTrack.enabled;
      this.isVideoDisabledState = !this.cameraTrack.enabled;
      return this.isVideoDisabledState;
    }
    return this.isVideoDisabledState;
  }

  public isAudioMuted(): boolean {
    return this.isAudioMutedState;
  }

  public isVideoDisabled(): boolean {
    return this.isVideoDisabledState;
  }

  /**
   * Stops all local media tracks and cleans up references
   */
  public stopAllTracks(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.cameraTrack) {
      this.cameraTrack.stop();
      this.cameraTrack = null;
    }
    if (this.micTrack) {
      this.micTrack.stop();
      this.micTrack = null;
    }
    this.isAudioMutedState = false;
    this.isVideoDisabledState = false;
  }
}
