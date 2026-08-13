/**
 * Resolves the initial default signaling URL safely across local and Vercel environments.
 */
export function getInitialSignalingUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Environment variable override (VITE_SIGNALING_URL)
    const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SIGNALING_URL;
    if (envUrl) return envUrl;

    const hostname = window.location.hostname;
    // 2. If running locally on localhost / 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `ws://${hostname}:8080`;
    }
  }

  // 3. Deployed on remote host (Vercel / Cloud CDN):
  // Default to live secure WebSocket signaling server so cross-device and mobile users connect instantly!
  return 'wss://reneo-webrtc-v2.loca.lt';
}
