export interface WebRTCManagerCallbacks {
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onTrack: (remoteStream: MediaStream) => void;
  onConnectionStateChange: (
    connectionState: RTCPeerConnectionState,
    iceState: RTCIceConnectionState
  ) => void;
  onIceFailureNeeded: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
};

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private callbacks: WebRTCManagerCallbacks;
  private isHandlingFailure: boolean = false;

  constructor(callbacks: WebRTCManagerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Initializes the native RTCPeerConnection instance
   */
  public initializeConnection(localStream?: MediaStream | null): RTCPeerConnection {
    this.close(); // Clean up existing connection if any
    this.isHandlingFailure = false;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnection = pc;
    this.remoteStream = new MediaStream();

    // Attach local tracks if provided
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle ICE Candidate generation (Trickle ICE)
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate(event.candidate.toJSON());
      }
    };

    // Handle Remote Track arrival
    pc.ontrack = (event: RTCTrackEvent) => {
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (this.remoteStream && !this.remoteStream.getTracks().includes(track)) {
            this.remoteStream.addTrack(track);
          }
        });
      } else if (event.track) {
        if (this.remoteStream && !this.remoteStream.getTracks().includes(event.track)) {
          this.remoteStream.addTrack(event.track);
        }
      }
      if (this.remoteStream) {
        this.callbacks.onTrack(this.remoteStream);
      }
    };

    // Monitor Connection and ICE states
    const handleStateUpdate = () => {
      if (!this.peerConnection) return;
      const connState = this.peerConnection.connectionState;
      const iceState = this.peerConnection.iceConnectionState;

      this.callbacks.onConnectionStateChange(connState, iceState);

      if ((connState === 'failed' || iceState === 'failed') && !this.isHandlingFailure) {
        this.isHandlingFailure = true;
        this.callbacks.onIceFailureNeeded();
      } else if (connState === 'connected' || iceState === 'connected') {
        this.isHandlingFailure = false;
      }
    };

    pc.onconnectionstatechange = handleStateUpdate;
    pc.oniceconnectionstatechange = handleStateUpdate;

    return pc;
  }

  /**
   * Returns current RTCPeerConnection instance
   */
  public getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  /**
   * Finds existing video RTCRtpSender
   */
  public getVideoSender(): RTCRtpSender | null {
    if (!this.peerConnection) return null;
    const senders = this.peerConnection.getSenders();
    return senders.find((s) => s.track?.kind === 'video') || null;
  }

  /**
   * Finds existing audio RTCRtpSender
   */
  public getAudioSender(): RTCRtpSender | null {
    if (!this.peerConnection) return null;
    const senders = this.peerConnection.getSenders();
    return senders.find((s) => s.track?.kind === 'audio') || null;
  }

  /**
   * Replaces the video track on the active RTCRtpSender without tearing down RTCPeerConnection or renegotiating
   */
  public async replaceVideoTrack(newTrack: MediaStreamTrack | null): Promise<boolean> {
    if (!this.peerConnection) return false;
    const sender = this.getVideoSender();

    if (sender) {
      await sender.replaceTrack(newTrack);
      return true;
    } else if (newTrack) {
      // If no video sender exists yet, add track
      const stream = new MediaStream([newTrack]);
      this.peerConnection.addTrack(newTrack, stream);
      return true;
    }
    return false;
  }

  /**
   * Replaces the audio track on the active RTCRtpSender without tearing down RTCPeerConnection or renegotiating
   */
  public async replaceAudioTrack(newTrack: MediaStreamTrack | null): Promise<boolean> {
    if (!this.peerConnection) return false;
    const sender = this.getAudioSender();

    if (sender) {
      await sender.replaceTrack(newTrack);
      return true;
    } else if (newTrack) {
      const stream = new MediaStream([newTrack]);
      this.peerConnection.addTrack(newTrack, stream);
      return true;
    }
    return false;
  }

  /**
   * Creates an SDP Offer, sets local description, and returns the offer
   */
  public async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('RTCPeerConnection is not initialized.');
    }
    const offer = await this.peerConnection.createOffer(options);
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Creates an SDP Answer, sets local description, and returns the answer
   */
  public async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('RTCPeerConnection is not initialized.');
    }
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Sets remote description and flushes queued ICE candidates
   */
  public async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('RTCPeerConnection is not initialized.');
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    await this.drainPendingIceCandidates();
  }

  /**
   * Safely adds an ICE Candidate or queues it if remote description is not set yet
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTCManager] Error adding ICE candidate:', err);
      }
    } else {
      this.pendingIceCandidates.push(candidate);
    }
  }

  /**
   * Drains queued ICE candidates
   */
  private async drainPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection) return;
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTCManager] Error adding queued candidate:', err);
        }
      }
    }
  }

  /**
   * Performs an ICE Restart by generating a new offer with { iceRestart: true }
   */
  public async restartIce(): Promise<RTCSessionDescriptionInit> {
    return this.createOffer({ iceRestart: true });
  }

  /**
   * Closes the RTCPeerConnection and cleans up connection state
   */
  public close(): void {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;

      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    this.pendingIceCandidates = [];
    this.isHandlingFailure = false;
  }
}
