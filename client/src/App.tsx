import { useState, useRef } from 'react';
import { useWebRTC } from './hooks/useWebRTC.js';
import { Header } from './components/Header.js';
import { JoinScreen } from './components/JoinScreen.js';
import { VideoGrid } from './components/VideoGrid.js';
import { CallControls } from './components/CallControls.js';
import { QualityPanel } from './components/QualityPanel.js';
import { DeviceSelector } from './components/DeviceSelector.js';
import { CallEndedScreen } from './components/CallEndedScreen.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import './styles.css';

export function App() {
  const {
    connectionState,
    statusMessage,
    localStream,
    remoteStream,
    mediaError,
    mediaControls,

    // B3 Quality Metrics
    qualityMetrics,
    qualityAssessment,
    qualityHistory,

    // B1 Screen Sharing
    isScreenSharing,
    screenShareState,
    toggleScreenShare,

    // B2 Device Switching
    deviceLists,
    selectedDevices,
    deviceSwitchState,
    switchMicrophone,
    switchCamera,
    switchSpeaker,
    refreshDevices,

    // General Call Controls
    callDuration,
    lastCallDuration,
    roomId,
    displayName,
    signalingStatus,
    joinCall,
    hangUp,
    resetToHome,
    toggleAudio,
    toggleVideo,
    clearError,
    acquireLocalMedia,
  } = useWebRTC();

  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isTechOpen, setIsTechOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);

  const remoteVideoElementRef = useRef<HTMLMediaElement | null>(null);

  const isCallActive =
    connectionState !== 'idle' &&
    connectionState !== 'joining' &&
    connectionState !== 'ended';

  const isEnded = connectionState === 'ended';

  const handleToggleQuality = () => {
    setIsQualityOpen((prev) => !prev);
    setIsTechOpen(false);
    setIsDevicesOpen(false);
  };

  const handleToggleTech = () => {
    setIsTechOpen((prev) => !prev);
    setIsQualityOpen(false);
    setIsDevicesOpen(false);
  };

  const handleToggleDevices = () => {
    setIsDevicesOpen((prev) => !prev);
    setIsQualityOpen(false);
    setIsTechOpen(false);
  };

  const handleClosePanels = () => {
    setIsQualityOpen(false);
    setIsTechOpen(false);
    setIsDevicesOpen(false);
  };

  return (
    <div className="app-root">
      {/* Top Navigation Bar */}
      <Header
        roomId={roomId}
        connectionState={connectionState}
        statusMessage={statusMessage}
        callDuration={callDuration}
        isCallActive={isCallActive}
      />

      {/* Global Error & Recovery Banners */}
      {mediaError && (
        <ErrorBanner
          error={mediaError}
          onDismiss={clearError}
          onRetry={() => {
            clearError();
            acquireLocalMedia();
          }}
        />
      )}

      {/* STATE 1: Join Screen */}
      {!isCallActive && !isEnded && (
        <JoinScreen
          onJoin={joinCall}
          isLoading={connectionState === 'joining'}
          signalingStatus={signalingStatus}
        />
      )}

      {/* STATE 2: Active Call Workspace */}
      {isCallActive && (
        <main className="call-workspace">
          {/* Live User-Facing Connection State & Recovery Explanation Banner */}
          {connectionState !== 'connected' && (
            <ConnectionStatus
              state={connectionState}
              message={statusMessage}
              variant="banner"
            />
          )}

          {/* Video Grid Surface */}
          <VideoGrid
            localStream={localStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
            isVideoDisabled={mediaControls.isVideoDisabled}
            isAudioMuted={mediaControls.isAudioMuted}
            isScreenSharing={isScreenSharing}
            roomId={roomId}
            displayName={displayName}
            onRemoteVideoElementRef={(el) => {
              remoteVideoElementRef.current = el;
            }}
          />

          {/* B2 Device Switching Overlay Modal */}
          {isDevicesOpen && (
            <DeviceSelector
              deviceLists={deviceLists}
              selectedDevices={selectedDevices}
              deviceSwitchState={deviceSwitchState}
              onSwitchMicrophone={switchMicrophone}
              onSwitchCamera={switchCamera}
              onSwitchSpeaker={switchSpeaker}
              onRefreshDevices={refreshDevices}
              onClose={() => setIsDevicesOpen(false)}
              remoteVideoElement={remoteVideoElementRef.current}
            />
          )}

          {/* B3 Quality & Technical Details Overlay Panel */}
          <QualityPanel
            metrics={qualityMetrics}
            assessment={qualityAssessment}
            history={qualityHistory}
            isConnected={connectionState === 'connected'}
            isOpen={isQualityOpen}
            isTechOpen={isTechOpen}
            onClose={handleClosePanels}
          />

          {/* Bottom Control Bar */}
          <CallControls
            controls={mediaControls}
            screenShareState={screenShareState}
            isQualityOpen={isQualityOpen}
            isTechOpen={isTechOpen}
            isDevicesOpen={isDevicesOpen}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onToggleDevices={handleToggleDevices}
            onToggleQuality={handleToggleQuality}
            onToggleTech={handleToggleTech}
            onHangUp={hangUp}
          />
        </main>
      )}

      {/* STATE 3: Post-Call / Call Ended Screen */}
      {isEnded && (
        <CallEndedScreen
          roomId={roomId}
          durationSeconds={lastCallDuration}
          onJoinAgain={() => joinCall(roomId, displayName)}
          onReturnHome={resetToHome}
        />
      )}
    </div>
  );
}

export default App;
