import React from 'react';
import { Video, ShieldCheck, Server, Radio } from 'lucide-react';
import { JoinForm } from './JoinForm.js';

interface JoinScreenProps {
  onJoin: (roomId: string, displayName: string, serverUrl: string) => void;
  isLoading: boolean;
  signalingStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  onJoin,
  isLoading,
  signalingStatus,
}) => {
  return (
    <div className="join-screen">
      <div className="join-container">
        {/* Brand Header */}
        <div className="join-brand">
          <div className="brand-logo">
            <Video className="logo-icon" />
            <span className="logo-text">Reneo</span>
          </div>
          <h1 className="hero-title">Real-time commerce, connected.</h1>
          <p className="hero-subtitle">
            Secure peer-to-peer video communication powered by native WebRTC.
          </p>
        </div>

        {/* Modular Join Form */}
        <JoinForm
          onJoin={onJoin}
          isLoading={isLoading}
          signalingStatus={signalingStatus}
        />

        {/* Technical Capabilities Badges */}
        <div className="tech-badges">
          <div className="tech-badge">
            <Radio size={14} />
            <span>WebRTC Native Media</span>
          </div>
          <div className="tech-badge">
            <Server size={14} />
            <span>STUN Enabled</span>
          </div>
          <div className="tech-badge">
            <ShieldCheck size={14} />
            <span>End-to-End Peer Media</span>
          </div>
        </div>
      </div>
    </div>
  );
};
