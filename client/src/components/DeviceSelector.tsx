import React from 'react';
import { Mic, Camera, Volume2, RefreshCw, X, AlertCircle } from 'lucide-react';
import type { MediaDeviceLists, MediaDeviceSelection, DeviceSwitchState } from '../types/devices.js';

interface DeviceSelectorProps {
  deviceLists: MediaDeviceLists;
  selectedDevices: MediaDeviceSelection;
  deviceSwitchState: DeviceSwitchState;
  onSwitchMicrophone: (deviceId: string) => void;
  onSwitchCamera: (deviceId: string) => void;
  onSwitchSpeaker: (deviceId: string, element: HTMLMediaElement | null) => void;
  onRefreshDevices: () => void;
  onClose: () => void;
  remoteVideoElement?: HTMLMediaElement | null;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  deviceLists,
  selectedDevices,
  deviceSwitchState,
  onSwitchMicrophone,
  onSwitchCamera,
  onSwitchSpeaker,
  onRefreshDevices,
  onClose,
  remoteVideoElement = null,
}) => {
  const isSwitching = deviceSwitchState.status === 'switching';

  return (
    <div className="device-panel-overlay" role="dialog" aria-label="Device Management Panel">
      <div className="device-panel-card">
        {/* Header */}
        <div className="panel-header">
          <div className="header-title-group">
            <h3>Media Devices</h3>
            <p>Select microphone, camera, and speaker</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-icon-secondary"
              onClick={onRefreshDevices}
              title="Refresh Devices"
              disabled={isSwitching}
            >
              <RefreshCw size={14} className={isSwitching ? 'spin' : ''} />
            </button>
            <button
              type="button"
              className="btn-icon-secondary"
              onClick={onClose}
              title="Close Panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status / Failure Notice */}
        {deviceSwitchState.status === 'failed' && (
          <div className="device-error-banner" role="alert">
            <AlertCircle size={14} className="icon-danger" />
            <span>{deviceSwitchState.error || 'Failed to switch device. Preserving active track.'}</span>
          </div>
        )}

        {/* Device Dropdowns */}
        <div className="device-form-body">
          {/* Microphone Selector */}
          <div className="device-group">
            <label htmlFor="mic-select" className="device-label">
              <Mic size={14} />
              <span>Microphone</span>
            </label>
            <select
              id="mic-select"
              className="device-select"
              value={selectedDevices.audioInputId}
              onChange={(e) => onSwitchMicrophone(e.target.value)}
              disabled={isSwitching || deviceLists.audioInputs.length === 0}
            >
              {deviceLists.audioInputs.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Microphone ${idx + 1}`}
                </option>
              ))}
              {deviceLists.audioInputs.length === 0 && (
                <option value="">No microphone detected</option>
              )}
            </select>
          </div>

          {/* Camera Selector */}
          <div className="device-group">
            <label htmlFor="camera-select" className="device-label">
              <Camera size={14} />
              <span>Camera</span>
            </label>
            <select
              id="camera-select"
              className="device-select"
              value={selectedDevices.videoInputId}
              onChange={(e) => onSwitchCamera(e.target.value)}
              disabled={isSwitching || deviceLists.videoInputs.length === 0}
            >
              {deviceLists.videoInputs.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
              {deviceLists.videoInputs.length === 0 && (
                <option value="">No camera detected</option>
              )}
            </select>
          </div>

          {/* Speaker Selector */}
          <div className="device-group">
            <label htmlFor="speaker-select" className="device-label">
              <Volume2 size={14} />
              <span>Speaker Output</span>
            </label>
            <select
              id="speaker-select"
              className="device-select"
              value={selectedDevices.audioOutputId}
              onChange={(e) => onSwitchSpeaker(e.target.value, remoteVideoElement)}
              disabled={isSwitching || deviceLists.audioOutputs.length === 0}
            >
              {deviceLists.audioOutputs.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Speaker ${idx + 1}`}
                </option>
              ))}
              {deviceLists.audioOutputs.length === 0 && (
                <option value="">Default System Speaker</option>
              )}
            </select>
            <small className="help-note">
              Note: Speaker routing (setSinkId) is supported on Chromium browsers.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};
