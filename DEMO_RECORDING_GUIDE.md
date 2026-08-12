# Screen Recording & Code Walkthrough Guide

This document outlines the **3 to 5 minute video demo recording script** for the **Reneo WebRTC / Live Streaming Internship Technical Assessment**.

---

## Submission Requirement Overview

- **Format**: Video screen recording (3 to 5 minutes).
- **Goal**: Show the 2-party WebRTC video call working across two devices or browser windows, demonstrate media control & observability features, showcase failure handling, and walk through key lines of code.
- **Tone**: Clear, concise, and technical.

---

## 3 to 5 Minute Demo Script Breakdown

### Segment 1: Two-Browser Call Negotiation (0:00 - 0:45)
1. **Show Window 1 (Alice)**: Open `http://localhost:3000`. Enter Room ID `reneo-room-001` and Display Name `Alice`. Click **Join Call**.
2. **Show WAITING State**: Point out the live status banner: `"Waiting for another participant to join..."`.
3. **Show Window 2 (Bob)**: Open `http://localhost:3000` in an Incognito / Firefox window. Enter Room ID `reneo-room-001` and Display Name `Bob`. Click **Join Call**.
4. **Demonstrate Connection**: Both clients negotiate SDP Offer/Answer over WebSocket signaling (`ws://localhost:8080`), exchange Trickle ICE candidates, and enter `CONNECTED` state. Both local and remote video/audio streams play back smoothly.

---

### Segment 2: Media Controls & Part B3 Quality Observability (0:45 - 1:30)
1. **Media Controls**:
   - Toggle **Mute Microphone** (point out audio track disabling without rebuilding the peer connection).
   - Toggle **Disable Camera** (point out video track disabling without interrupting peer connection).
2. **Part B3 Connection Quality Panel**:
   - Click the **Connection Quality** button to open the live `getStats()` modal.
   - Highlight live metrics sampled every 1000ms: **Inbound Bitrate** (calculated from byte deltas), **Round-Trip Time (RTT)**, **Packets Lost**, **Jitter**, **Resolution** (e.g. 1280x720), and **FPS**.
   - Explain why B3 was chosen: *"Connected does not mean the call is good."*

---

### Segment 3: Failure Handling & Connection Resilience (1:30 - 2:30)
1. **Abrupt Peer Disconnect**: Close Bob's browser window. Show Alice's screen immediately transitioning to `WAITING` state with the user banner: `"Participant Left. The other participant left the room."` and promoting Alice to initiator.
2. **Room Capacity Enforcement**: Open a 3rd window and attempt to join `reneo-room-001`. Show the `ROOM_FULL` error banner stating maximum 2 participants allowed per room.
3. **Permission / Network Failure**: Mention graceful handling for `NotAllowedError` (Permission Denied) and `NotFoundError` (No Camera Detected).

---

### Segment 4: Code Walkthrough (2:30 - 4:30)
Highlight key technical implementations in the source code:
1. **`client/src/services/webrtc.service.ts`**: Show candidate queuing in `addIceCandidate()` for candidates arriving before `setRemoteDescription()`.
2. **`server/src/signaling/websocket.server.ts`**: Show deterministic role assignment (`isInitiator`), strict JSON message validation, and `ws` signaling routing.
3. **`client/src/services/stats.service.ts`**: Show byte delta calculation for inbound video bitrate.
4. **`ANSWERS.md`**: Show Part C4 live-shopping architecture for 10,000 simultaneous viewers (WebRTC interactive co-host path + LL-HLS mass broadcast path).

---

## Video Attachment Instructions

After recording your video using Loom, OBS, QuickTime, or screen recording software:
1. Upload the video to YouTube (Unlisted), Loom, or GitHub Releases.
2. Replace the video link placeholder in `README.md`:
   ```markdown
   - 📺 **Video Recording Link**: [Watch 5-Minute Technical Walkthrough](YOUR_VIDEO_URL_HERE)
   ```
