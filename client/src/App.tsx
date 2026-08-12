import { useWebRTC } from './hooks/useWebRTC.js';
import { JoinForm } from './components/JoinForm.js';
import { VideoGrid } from './components/VideoGrid.js';
import { CallControls } from './components/CallControls.js';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import { QualityPanel } from './components/QualityPanel.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import './styles.css';

export function App() {
  const {
    connectionState,
    statusMessage,
    localStream,
    remoteStream,
    mediaError,
    mediaControls,
    qualityMetrics,
    joinCall,
    hangUp,
    toggleAudio,
    toggleVideo,
    clearError,
  } = useWebRTC();

  const isIdle = connectionState === 'idle';
  const isJoining = connectionState === 'joining';

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-title">
          <h1>Reneo WebRTC Assessment</h1>
          <span className="badge-tag">2-Party Native WebRTC</span>
        </div>
        {!isIdle && (
          <button type="button" className="btn btn-secondary" onClick={hangUp}>
            Leave Call
          </button>
        )}
      </header>

      {/* Global Error Banner */}
      {mediaError && <ErrorBanner error={mediaError} onDismiss={clearError} />}

      {/* Connection Status Bar */}
      <ConnectionStatus state={connectionState} message={statusMessage} />

      {/* Main Content View */}
      {isIdle || isJoining ? (
        <JoinForm onJoin={joinCall} isLoading={isJoining} />
      ) : (
        <>
          <VideoGrid
            localStream={localStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
            isVideoDisabled={mediaControls.isVideoDisabled}
            isAudioMuted={mediaControls.isAudioMuted}
          />

          <CallControls
            controls={mediaControls}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onHangUp={hangUp}
          />

          <QualityPanel metrics={qualityMetrics} isConnected={connectionState === 'connected'} />
        </>
      )}
    </div>
  );
}

export default App;
