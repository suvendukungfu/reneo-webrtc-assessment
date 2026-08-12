import { useState, useCallback } from 'react';
import { DeviceManager } from '../services/webrtc/DeviceManager.js';
import type { MediaDeviceLists, MediaDeviceSelection, DeviceSwitchState } from '../types/devices.js';

export function useDevices(deviceManagerRef: React.MutableRefObject<DeviceManager | null>) {
  const [deviceLists, setDeviceLists] = useState<MediaDeviceLists>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });

  const [selectedDevices, setSelectedDevices] = useState<MediaDeviceSelection>({
    audioInputId: '',
    videoInputId: '',
    audioOutputId: '',
  });

  const [switchState, setSwitchState] = useState<DeviceSwitchState>({
    status: 'idle',
  });

  const refreshDevices = useCallback(async () => {
    if (deviceManagerRef.current) {
      const lists = await deviceManagerRef.current.enumerateDevices();
      setDeviceLists(lists);
      setSelectedDevices(deviceManagerRef.current.getSelectedDevices());
    }
  }, [deviceManagerRef]);

  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      if (deviceManagerRef.current) {
        setSwitchState({ status: 'switching', activeType: 'audio' });
        const success = await deviceManagerRef.current.switchMicrophone(deviceId);
        if (success) {
          setSelectedDevices(deviceManagerRef.current.getSelectedDevices());
          setSwitchState({ status: 'success', activeType: 'audio' });
        } else {
          setSwitchState({
            status: 'failed',
            activeType: 'audio',
            error: 'Failed to switch microphone.',
          });
        }
      }
    },
    [deviceManagerRef]
  );

  const switchCamera = useCallback(
    async (deviceId: string, isScreenSharing: boolean = false) => {
      if (deviceManagerRef.current) {
        setSwitchState({ status: 'switching', activeType: 'video' });
        const success = await deviceManagerRef.current.switchCamera(deviceId, isScreenSharing);
        if (success) {
          setSelectedDevices(deviceManagerRef.current.getSelectedDevices());
          setSwitchState({ status: 'success', activeType: 'video' });
        } else {
          setSwitchState({
            status: 'failed',
            activeType: 'video',
            error: 'Failed to switch camera.',
          });
        }
      }
    },
    [deviceManagerRef]
  );

  const switchSpeaker = useCallback(
    async (deviceId: string, targetElement: HTMLMediaElement | null) => {
      if (deviceManagerRef.current) {
        setSwitchState({ status: 'switching', activeType: 'speaker' });
        const res = await deviceManagerRef.current.switchSpeaker(deviceId, targetElement);
        if (res.success) {
          setSelectedDevices(deviceManagerRef.current.getSelectedDevices());
          setSwitchState({ status: 'success', activeType: 'speaker' });
        } else {
          setSwitchState({
            status: 'failed',
            activeType: 'speaker',
            error: res.supported ? 'Failed to set speaker.' : 'Speaker selection not supported.',
          });
        }
        return res;
      }
      return { supported: false, success: false };
    },
    [deviceManagerRef]
  );

  return {
    deviceLists,
    selectedDevices,
    switchState,
    refreshDevices,
    switchMicrophone,
    switchCamera,
    switchSpeaker,
    setDeviceLists,
    setSelectedDevices,
    setSwitchState,
  };
}
