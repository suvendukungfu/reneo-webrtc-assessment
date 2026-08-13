import { spawn } from 'child_process';

function startTunnel() {
  console.log('[TunnelMonitor] Launching localtunnel on port 8080...');
  const child = spawn('npx', ['localtunnel', '--port', '8080', '--subdomain', 'reneo-webrtc-signaling'], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    console.warn(`[TunnelMonitor] Tunnel process exited with code ${code}. Auto-reconnecting in 2s...`);
    setTimeout(startTunnel, 2000);
  });

  child.on('error', (err) => {
    console.error('[TunnelMonitor] Tunnel process error:', err);
    setTimeout(startTunnel, 2000);
  });
}

startTunnel();
