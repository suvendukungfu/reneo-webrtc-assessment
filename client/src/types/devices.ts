export interface MediaDeviceSelection {
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
}

export interface MediaDeviceLists {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export type DeviceSwitchStatus = 'idle' | 'switching' | 'success' | 'failed';

export interface DeviceSwitchState {
  status: DeviceSwitchStatus;
  activeType?: 'audio' | 'video' | 'speaker';
  error?: string;
}
