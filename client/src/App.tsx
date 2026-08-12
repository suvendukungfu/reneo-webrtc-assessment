import { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC.js';
import { Header } from './components/Header.js';
import { JoinScreen } from './components/JoinScreen.js';
import { VideoGrid } from './components/VideoGrid.js';
import { CallControls } from './components/CallControls.js';
import { QualityPanel } from './components/QualityPanel.js';
import { CallEndedScreen } from './components/CallEndedScreen.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import './styles.css';

export function App() {
  const {
    connectionState,
    localStream,
    remoteStream,
    mediaError,
    mediaControls,
    qualityMetrics,
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

  const isCallActive =
    connectionState !== 'idle' &&
    connectionState !== 'joining' &&
    connectionState !== 'ended';

  const isEnded = connectionState === 'ended';

  const handleToggleQuality = () => {
    setIsQualityOpen((prev) => !prev);
    setIsTechOpen(false);
  };

  const handleToggleTech = () => {
    setIsTechOpen((prev) => !prev);
    setIsQualityOpen(false);
  };

  const handleClosePanels = () => {
    setIsQualityOpen(false);
    setIsTechOpen(false);
  };

  return (
    <div className="app-root">
      {/* Top Navigation Bar */}
      <Header
        roomId={roomId}
        connectionState={connectionState}
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
          <VideoGrid
            localStream={localStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
            isVideoDisabled={mediaControls.isVideoDisabled}
            isAudioMuted={mediaControls.isAudioMuted}
            roomId={roomId}
            displayName={displayName}
          />

          {/* Part B3 Quality & Technical Details Overlay Panel */}
          <QualityPanel
            metrics={qualityMetrics}
            isConnected={connectionState === 'connected'}
            isOpen={isQualityOpen}
            isTechOpen={isTechOpen}
            onClose={handleClosePanels}
          />

          {/* Bottom Control Bar */}
          <CallControls
            controls={mediaControls}
            isQualityOpen={isQualityOpen}
            isTechOpen={isTechOpen}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
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
