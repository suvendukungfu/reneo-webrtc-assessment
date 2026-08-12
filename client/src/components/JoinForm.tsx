import React, { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import { getInitialSignalingUrl } from '../utils/signalingUrl.js';

interface JoinFormProps {
  onJoin: (roomId: string, displayName: string, serverUrl: string) => void;
  isLoading: boolean;
  signalingStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const JoinForm: React.FC<JoinFormProps> = ({
  onJoin,
  isLoading,
  signalingStatus = 'disconnected',
}) => {
  const [roomId, setRoomId] = useState('reneo-room-001');
  const [displayName, setDisplayName] = useState('Candidate User');
  const [serverUrl, setServerUrl] = useState(() => getInitialSignalingUrl());
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    onJoin(roomId.trim(), displayName.trim(), serverUrl.trim());
  };

  const handleCopyRoom = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isServerReady = signalingStatus === 'connected' || signalingStatus === 'disconnected';

  return (
    <div className="join-card">
      <form onSubmit={handleSubmit} className="join-form">
        <div className="form-group">
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alice"
            maxLength={32}
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <div className="label-row">
            <label htmlFor="roomId">Room ID</label>
            <button
              type="button"
              className="btn-copy-sm"
              onClick={handleCopyRoom}
              title="Copy Room ID"
            >
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <input
            id="roomId"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="e.g. reneo-room-001"
            required
            maxLength={64}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="serverUrl">Signaling Server URL</label>
          <input
            id="serverUrl"
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="ws://localhost:8080"
            required
            disabled={isLoading}
          />
          <small className="help-note" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Info size={12} className="text-accent" />
              Target local server (ws://localhost:8080) or hosted WebSocket endpoint.
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: '0.1rem' }}>
              📱 Mobile browser? Enter your laptop's local LAN IP (e.g. <code>ws://192.168.x.x:8080</code>).
            </span>
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg"
          disabled={isLoading || !roomId.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner" /> Joining Call...
            </>
          ) : (
            'Join Call'
          )}
        </button>
      </form>

      {/* Live Server Indicator */}
      <div className="server-status-bar">
        <span
          className={`status-dot ${isServerReady ? 'status-online' : 'status-offline'}`}
        />
        <span className="server-status-text">
          {isServerReady ? 'Signaling server ready' : 'Signaling server unavailable'}
        </span>
      </div>
    </div>
  );
};
