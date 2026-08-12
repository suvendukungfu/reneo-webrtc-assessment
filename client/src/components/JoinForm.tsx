import React, { useState, useEffect } from 'react';
import { Copy, Check, Info, Link as LinkIcon } from 'lucide-react';
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
  const [linkCopied, setLinkCopied] = useState(false);

  // Auto-detect Room ID from URL search query (?room=... or ?roomId=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room') || params.get('roomId');
      if (urlRoom && urlRoom.trim()) {
        setRoomId(urlRoom.trim());
      }
    }
  }, []);

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

  const handleCopyInviteLink = () => {
    if (!roomId) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareableUrl = `${origin}?room=${encodeURIComponent(roomId.trim())}`;
    navigator.clipboard.writeText(shareableUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
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
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn-copy-sm"
                onClick={handleCopyInviteLink}
                title="Copy Shareable Invite Link"
              >
                {linkCopied ? <Check size={12} className="text-success" /> : <LinkIcon size={12} />}
                <span>{linkCopied ? 'Link Copied' : 'Copy Invite Link'}</span>
              </button>
              <button
                type="button"
                className="btn-copy-sm"
                onClick={handleCopyRoom}
                title="Copy Room ID"
              >
                {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                <span>{copied ? 'Copied ID' : 'Copy ID'}</span>
              </button>
            </div>
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
            placeholder="wss://reneo-webrtc-signaling.loca.lt"
            required
            disabled={isLoading}
          />
          <small className="help-note" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Info size={12} className="text-accent" />
              Connected to Live Public Secure Signaling Relay (wss://...).
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
