import React, { useState } from 'react';

interface JoinFormProps {
  onJoin: (roomId: string, displayName: string, serverUrl: string) => void;
  isLoading: boolean;
}

export const JoinForm: React.FC<JoinFormProps> = ({ onJoin, isLoading }) => {
  const [roomId, setRoomId] = useState('reneo-room-001');
  const [displayName, setDisplayName] = useState('Candidate User');
  const [serverUrl, setServerUrl] = useState(`ws://${window.location.hostname}:8080`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    onJoin(roomId.trim(), displayName.trim(), serverUrl.trim());
  };

  return (
    <div className="join-card">
      <div className="card-header">
        <h2>Join Video Room</h2>
        <p>Enter a room ID to establish a 2-party WebRTC peer connection.</p>
      </div>

      <form onSubmit={handleSubmit} className="join-form">
        <div className="form-group">
          <label htmlFor="roomId">Room ID</label>
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
          <small className="help-text">Share this room ID with the second participant.</small>
        </div>

        <div className="form-group">
          <label htmlFor="displayName">Your Name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alice"
            maxLength={32}
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
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading || !roomId.trim()}>
          {isLoading ? (
            <>
              <span className="spinner" /> Joining Room...
            </>
          ) : (
            'Join Room'
          )}
        </button>
      </form>
    </div>
  );
};
