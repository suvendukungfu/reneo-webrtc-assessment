# Senior WebRTC Interview Walkthrough & Architectural Q&A

This document prepares the candidate for technical deep-dive questions during the follow-up interview session.

---

## 1. Why does screen sharing not require a new `RTCPeerConnection` or SDP renegotiation?
**Answer**:  
WebRTC decouples media sources from media transport senders. An `RTCRtpSender` represents the RTP stream pipe sending media over an established DTLS-SRTP transport. 

When switching from camera video to screen video, we invoke:
```typescript
await videoSender.replaceTrack(screenTrack);
```
`replaceTrack()` seamlessly swaps the media source flowing into the existing RTP packetizer without altering codec parameters, SSRCs, or SDP session descriptions. Therefore, no `createOffer()`, `createAnswer()`, or SDP exchange is required over WebSocket signaling.

---

## 2. Why is `RTCRtpSender.replaceTrack()` superior to recreating tracks or renegotiating?
**Answer**:  
1. **Zero Latency**: Track switching occurs in single-digit milliseconds inside the browser engine.
2. **Zero Signaling Overhead**: Eliminates network round-trips over WebSocket for SDP negotiation.
3. **Connection Stability**: Prevents ICE state reset or potential renegotiation glare / race conditions.

---

## 3. How do you handle screen sharing ending outside application controls (e.g. native browser bar)?
**Answer**:  
Browsers render a floating native UI banner ("Stop sharing"). When the user clicks this native button, the browser terminates the display track and fires the `onended` event.

We register an `onended` event listener on the screen track:
```typescript
screenTrack.onended = () => {
  this.stopScreenShare();
};
```
Inside `stopScreenShare()`, we retrieve the preserved camera track from `MediaManager` and restore it:
```typescript
await videoSender.replaceTrack(cameraTrack);
```

---

## 4. Why must the camera track be preserved in memory when screen sharing starts?
**Answer**:  
If we call `cameraTrack.stop()` when screen sharing begins, the camera hardware turns off completely. When screen sharing ends, we would be forced to call `getUserMedia()` again, which could prompt the user for permission or fail if hardware is busy. 

By preserving `cameraTrack` in `MediaManager` memory, we can instantly restore camera video upon stopping screen share without latency or extra permissions.

---

## 5. Why should old media tracks be stopped ONLY after successful replacement?
**Answer**:  
To prevent call corruption during device switching. If we stop the active microphone/camera track *before* acquiring the new track and `getUserMedia()` fails (e.g. `OverconstrainedError` or device busy), the user would be left with no working microphone or camera.

Our sequence guarantees safety:
```
Acquire new track -> replaceTrack(newTrack) -> verify success -> stop old track
```

---

## 6. Why does device switching not require renegotiation in this architecture?
**Answer**:  
Because the media constraints (e.g. Opus audio or H.264/VP8 video) and stream direction remain identical. Replacing an audio track from Microphone A with an audio track from Microphone B on the existing `audioSender` keeps transport parameters intact.

---

## 7. Why is speaker switching browser-dependent?
**Answer**:  
Routing audio output to a specific speaker requires `HTMLMediaElement.prototype.setSinkId()`, which is part of the W3C Audio Output Devices API. Chrome, Edge, and Opera support `setSinkId()`, while Safari and Firefox restrict audio output to system defaults due to fingerprinting security policies. We feature-detect `setSinkId` and gracefully notify the user if unsupported.

---

## 8. Why might `enumerateDevices()` initially return blank device labels?
**Answer**:  
Browsers enforce privacy protections: device labels (e.g. `"Logitech Brio 4K"`) are withheld until the user explicitly grants camera/microphone permission via `getUserMedia()`. Once permission is granted, we invoke `enumerateDevices()` again to populate human-readable labels.

---

## 9. How does `devicechange` hot-plugging work?
**Answer**:  
`navigator.mediaDevices.addEventListener('devicechange', ...)` notifies the app whenever USB cameras, Bluetooth headsets, or microphones are plugged in or disconnected. We re-enumerate devices dynamically to keep dropdowns updated without restarting the call.

---

## 10. Why sample `getStats()` periodically instead of updating React state on every frame?
**Answer**:  
WebRTC generates thousands of internal RTP statistics every second. Updating React state on every frame would trigger excessive re-renders and CPU thrashing. Sampling `getStats()` at ~1000ms intervals provides real-time diagnostic visibility while maintaining 60 FPS UI performance.

---

## 11. How is inbound video bitrate calculated from `RTCStatsReport`?
**Answer**:  
We extract `bytesReceived` and `timestamp` from `inbound-rtp` video reports across consecutive 1000ms samples:
```typescript
const deltaBytes = currentBytes - prevBytes;
const deltaTimeMs = currentTimestamp - prevTimestamp;
const bitrateKbps = Math.round((deltaBytes * 8) / deltaTimeMs);
```

---

## 12. How is packet loss percentage calculated?
**Answer**:  
We extract `packetsLost` and `packetsReceived` from `inbound-rtp`:
```typescript
const totalPackets = packetsLost + packetsReceived;
const packetLossPercent = (packetsLost / totalPackets) * 100;
```

---

## 13. Why does "Connected" not necessarily mean good call quality?
**Answer**:  
`connectionState === 'connected'` only means that STUN/ICE binding succeeded and UDP/RTP packets can pass. However, severe network congestion, Wi-Fi jitter, high RTT (>300ms), or heavy packet loss (>5%) will degrade video resolution and freeze frames despite being "connected".

---

## 14. How do ICE connection state and media quality metrics differ?
**Answer**:  
- **ICE Connection State**: Infrastructure transport metric (Socket binding: `checking`, `connected`, `failed`).
- **Media Quality Metrics**: User experience metric (Bitrate, packet loss, FPS, resolution, jitter).

---

## 15. What architecture changes would be required for 10,000 live-shopping viewers in production?
**Answer**:  
1. **WebRTC SFU Ingest**: Seller streams to a low-latency Selective Forwarding Unit (SFU) cluster via WebRTC.
2. **Interactive Co-Host Path**: Interactive buyers connect via WebRTC SFU (<300ms latency).
3. **Mass Viewer Broadcast Path**: SFU forwards stream to a Media Transcoder generating an ABR ladder (1080p, 720p, 480p), packaged into LL-HLS / CMAF chunks delivered via global CDN edge caching (1.5-3.0s latency) for 10,000 passive viewers.
