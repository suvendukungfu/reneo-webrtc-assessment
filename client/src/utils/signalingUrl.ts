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
    if (hostname === 'localhost' || hostname === '127.0.0.1' || !hostname) {
      return `ws://${hostname || 'localhost'}:8080`;
    }
  }

  // 3. Deployed on remote host (Vercel / Cloud CDN):
  // Default to ws://localhost:8080 for testing local signaling server
  return 'ws://localhost:8080';
}
