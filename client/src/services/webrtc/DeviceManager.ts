import { WebRTCManager } from './WebRTCManager.js';
import { MediaManager } from './MediaManager.js';
import type { MediaDeviceLists, MediaDeviceSelection } from '../../types/devices.js';

export interface DeviceManagerCallbacks {
  onDevicesUpdated: (deviceLists: MediaDeviceLists) => void;
  onDeviceSwitchState: (isSwitching: boolean, message?: string) => void;
  onError: (title: string, message: string) => void;
}

export class DeviceManager {
  private webRTCManager: WebRTCManager;
  private mediaManager: MediaManager;
  private callbacks: DeviceManagerCallbacks;

  private selectedDevices: MediaDeviceSelection = {
    audioInputId: '',
    videoInputId: '',
    audioOutputId: '',
  };

  private deviceLists: MediaDeviceLists = {
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  };

  private isSwitchingState: boolean = false;

  constructor(
    webRTCManager: WebRTCManager,
    mediaManager: MediaManager,
    callbacks: DeviceManagerCallbacks
  ) {
    this.webRTCManager = webRTCManager;
    this.mediaManager = mediaManager;
    this.callbacks = callbacks;

    this.setupDeviceChangeListener();
  }

  /**
   * Listens for USB/Bluetooth device hot-plugging events
   */
  private setupDeviceChangeListener(): void {
    if (navigator?.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        console.log('[DeviceManager] Hardware devicechange detected. Refreshing device list.');
        await this.enumerateDevices();
      });
    }
  }

  /**
   * Enumerates available input and output devices
   */
  public async enumerateDevices(): Promise<MediaDeviceLists> {
    if (!navigator?.mediaDevices?.enumerateDevices) {
      return this.deviceLists;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      this.deviceLists = { audioInputs, videoInputs, audioOutputs };

      // Set default selected IDs if not already set
      if (!this.selectedDevices.audioInputId && audioInputs.length > 0) {
        this.selectedDevices.audioInputId = audioInputs[0].deviceId;
      }
      if (!this.selectedDevices.videoInputId && videoInputs.length > 0) {
        this.selectedDevices.videoInputId = videoInputs[0].deviceId;
      }
      if (!this.selectedDevices.audioOutputId && audioOutputs.length > 0) {
        this.selectedDevices.audioOutputId = audioOutputs[0].deviceId;
      }

      this.callbacks.onDevicesUpdated(this.deviceLists);
      return this.deviceLists;
    } catch (err) {
      console.error('[DeviceManager] Error enumerating devices:', err);
      return this.deviceLists;
    }
  }

  private activeMicRequestId: number = 0;
  private activeCameraRequestId: number = 0;

  /**
   * Switches active microphone device without tearing down RTCPeerConnection
   */
  public async switchMicrophone(deviceId: string): Promise<boolean> {
    if (deviceId === this.selectedDevices.audioInputId) {
      return true;
    }

    const currentRequestId = ++this.activeMicRequestId;
    this.isSwitchingState = true;
    this.callbacks.onDeviceSwitchState(true, 'Switching microphone...');

    const oldTrack = this.mediaManager.getMicTrack();

    try {
      // 1. Acquire new microphone track FIRST before stopping old track
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });

      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) {
        throw new Error('Could not acquire new audio track.');
      }

      // Race condition check: If a newer request was initiated while waiting for getUserMedia
      if (currentRequestId !== this.activeMicRequestId) {
        console.warn('[DeviceManager] Obsolete microphone switch discarded:', currentRequestId);
        newTrack.stop();
        return false;
      }

      // Preserve audio muted state
      if (oldTrack) {
        newTrack.enabled = oldTrack.enabled;
      }

      // 2. Replace track on active RTCRtpSender
      await this.webRTCManager.replaceAudioTrack(newTrack);

      // 3. Update MediaManager track reference & stop old track AFTER replacement
      this.mediaManager.setMicTrack(newTrack);
      this.selectedDevices.audioInputId = deviceId;

      this.callbacks.onDeviceSwitchState(false, 'Microphone switched successfully');
      this.isSwitchingState = false;
      return true;
    } catch (err: unknown) {
      if (currentRequestId !== this.activeMicRequestId) return false;
      console.error('[DeviceManager] Error switching microphone:', err);
      const errorObj = err instanceof Error ? err : new Error(String(err));

      this.callbacks.onError(
        'Microphone Switch Failed',
        `Could not switch to selected microphone: ${errorObj.message}`
      );

      this.callbacks.onDeviceSwitchState(false, 'Microphone switch failed');
      this.isSwitchingState = false;
      return false;
    }
  }

  /**
   * Switches active camera device without tearing down RTCPeerConnection
   */
  public async switchCamera(deviceId: string, isScreenSharing: boolean = false): Promise<boolean> {
    if (deviceId === this.selectedDevices.videoInputId) {
      return true;
    }

    const currentRequestId = ++this.activeCameraRequestId;
    this.isSwitchingState = true;
    this.callbacks.onDeviceSwitchState(true, 'Switching camera...');

    const oldTrack = this.mediaManager.getCameraTrack();

    try {
      // 1. Acquire new camera track FIRST before stopping old track
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback for mobile cameras
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: false,
        });
      }

      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) {
        throw new Error('Could not acquire new video track.');
      }

      // Race condition check: Discard stale request if a newer camera switch was triggered
      if (currentRequestId !== this.activeCameraRequestId) {
        console.warn('[DeviceManager] Obsolete camera switch discarded:', currentRequestId);
        newTrack.stop();
        return false;
      }

      // Preserve video disabled state
      if (oldTrack) {
        newTrack.enabled = oldTrack.enabled;
      }

      // 2. If camera is currently streaming (not screen sharing), replace active track on RTCRtpSender
      if (!isScreenSharing) {
        await this.webRTCManager.replaceVideoTrack(newTrack);
      }

      // 3. Update MediaManager track reference & stop old track AFTER replacement
      this.mediaManager.setCameraTrack(newTrack);
      this.selectedDevices.videoInputId = deviceId;

      this.callbacks.onDeviceSwitchState(false, 'Camera switched successfully');
      this.isSwitchingState = false;
      return true;
    } catch (err: unknown) {
      if (currentRequestId !== this.activeCameraRequestId) return false;
      console.error('[DeviceManager] Error switching camera:', err);
      const errorObj = err instanceof Error ? err : new Error(String(err));

      this.callbacks.onError(
        'Camera Switch Failed',
        `Could not switch to selected camera: ${errorObj.message}`
      );

      this.callbacks.onDeviceSwitchState(false, 'Camera switch failed');
      this.isSwitchingState = false;
      return false;
    }
  }

  /**
   * Switches speaker output device if supported by the browser (setSinkId)
   */
  public async switchSpeaker(
    deviceId: string,
    targetElement: HTMLMediaElement | null
  ): Promise<{ supported: boolean; success: boolean }> {
    if (!targetElement) {
      return { supported: true, success: false };
    }

    // Check HTMLMediaElement.prototype.setSinkId browser support
    const setSinkIdAvailable = typeof (targetElement as any).setSinkId === 'function';

    if (!setSinkIdAvailable) {
      this.callbacks.onError(
        'Speaker Selection Not Supported',
        'Speaker selection (setSinkId) is not supported by your current browser.'
      );
      return { supported: false, success: false };
    }

    try {
      await (targetElement as any).setSinkId(deviceId);
      this.selectedDevices.audioOutputId = deviceId;
      this.callbacks.onDeviceSwitchState(false, 'Speaker output updated');
      return { supported: true, success: true };
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.callbacks.onError(
        'Speaker Switch Failed',
        `Unable to set audio output device: ${errorObj.message}`
      );
      return { supported: true, success: false };
    }
  }

  public getSelectedDevices(): MediaDeviceSelection {
    return { ...this.selectedDevices };
  }

  public getDeviceLists(): MediaDeviceLists {
    return { ...this.deviceLists };
  }

  public isSwitching(): boolean {
    return this.isSwitchingState;
  }
}
