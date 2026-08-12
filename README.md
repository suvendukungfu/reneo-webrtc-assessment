# Reneo WebRTC Assessment

Production-principled, zero-magic 2-party WebRTC video calling application built for the **Reneo WebRTC / Live Streaming Internship Technical Assessment**.

This implementation uses **native browser WebRTC APIs** directly (`RTCPeerConnection`, `getUserMedia`, `getStats`) without hiding WebRTC concepts behind high-level abstraction libraries (such as PeerJS, LiveKit, or mediasoup).

---

## Overview

The application enables two participants to enter a shared Room ID, negotiate a peer-to-peer audio/video connection using WebSocket signaling, handle network interruptions via ICE restart, monitor connection stats in real time, and handle all common media and connectivity failure modes gracefully.

---

## Features

- 📹 **Camera & Microphone Access**: Safe capture using `navigator.mediaDevices.getUserMedia()`.
- 🔄 **Deterministic SDP Offer/Answer Negotiation**: Initiator (Participant A) creates SDP offer; Receiver (Participant B) creates SDP answer.
- 🧊 **Trickle ICE & STUN**: Public STUN candidate gathering (`stun:stun.l.google.com:19302`) and queued candidate exchange.
- 🎛️ **Media Controls**: Mute/unmute microphone and enable/disable camera via `track.enabled` without destroying or rebuilding the `RTCPeerConnection`.
- 📊 **Connection Quality Panel (Part B3)**: Real-time `getStats()` polling engine displaying live Inbound Bitrate (calculated from byte deltas), RTT, Packets Lost, Jitter, Resolution, and FPS.
- 🔁 **ICE Restart Recovery**: Bounded automatic recovery mechanism when ICE connectivity fails.
- ⚠️ **Comprehensive Error Banners**: Clear user-facing alerts for `NotAllowedError` (Permission Denied), `NotFoundError` (Missing Device), abrupt peer disconnects, and room capacity limits.
- 🔒 **Deterministic Signaling Server**: Node.js + TypeScript WebSocket server using `ws` with strict room capacity limits (max 2) and sanitized message validation.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS.
- **Backend**: Node.js, TypeScript, WebSocket (`ws`).
- **WebRTC**: Native browser WebRTC APIs (`RTCPeerConnection`, `MediaStream`, `getStats`).
- **STUN Server**: `stun:stun.l.google.com:19302`.

---

## Project Structure

```
reneo-webrtc-assessment/
├── client/                     # React + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/         # UI Components (JoinForm, VideoGrid, CallControls, etc.)
│   │   ├── hooks/              # Custom Hooks (useSignaling, useWebRTC)
│   │   ├── services/           # Service Layer (webrtc.service.ts, stats.service.ts)
│   │   ├── types/              # TypeScript Interfaces (Signaling, WebRTC, Stats)
│   │   ├── App.tsx             # Root Application Component
│   │   ├── main.tsx            # Entry Point
│   │   └── styles.css          # Design System & Styling
│   ├── package.json
│   └── tsconfig.json
├── server/                     # Node.js + TypeScript WebSocket Server
│   ├── src/
│   │   ├── rooms/              # RoomManager (2-participant limit & role assignment)
│   │   ├── signaling/          # WebSocket Server & Message Routing
│   │   ├── types/              # Discriminated Union Message Protocols
│   │   └── index.ts            # Server Entry Point
│   ├── package.json
│   └── tsconfig.json
├── ANSWERS.md                  # Comprehensive Answers to Part C (C1-C4 + ASCII Diagram)
├── ASSESSMENT-CHECKLIST.md     # Verification Matrix Mapping Brief to Implementation
├── .env.example
├── .gitignore
└── README.md
```

---

## Local Setup & Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation
From the repository root, install all dependencies for root, server, and client:

```bash
npm run install:all
```

---

## Running the Application

### Option A: Run Server and Client Concurrently
From root:
```bash
npm run dev:server
```
In a second terminal window:
```bash
npm run dev:client
```

- **Signaling Server**: Runs on `ws://localhost:8080`
- **Client Frontend**: Runs on `http://localhost:5173`

---

## Testing With Two Browsers

1. Open `http://localhost:5173` in **Browser Window 1** (e.g., Chrome).
2. Enter Room ID: `reneo-room-001` and Name: `Alice`. Click **Join Room**.
3. Allow camera/microphone access. The app transitions to `WAITING` state ("Waiting for another participant to join...").
4. Open `http://localhost:5173` in **Browser Window 2** (or Incognito Window / Firefox).
5. Enter Room ID: `reneo-room-001` and Name: `Bob`. Click **Join Room**.
6. **Result**:
   - Both browsers perform SDP Offer/Answer exchange and Trickle ICE candidate exchange.
   - Both transition to `CONNECTED` state.
   - Local and Remote video/audio streams play back live.
   - Connection Quality Panel (Part B3) updates metrics every second.

---

## WebRTC Signaling Sequence

```
[Peer A (Initiator)]            [WebSocket Server]            [Peer B (Receiver)]
       │                                │                               │
       ├─────── JOIN(roomId) ──────────>│                               │
       |<────── JOINED(initiator:true)──┤                               │
       │  (state: WAITING)              │                               │
       │                                │<────── JOINED(roomId)─────────┤
       |<────── PEER_JOINED ────────────┼────── JOINED(initiator:false)─┤
       │  (state: CONNECTING)           │        (state: CONNECTING)    │
       │                                │                               │
 [Create RTCPeerConnection & Add Tracks]                                │
 [Create SDP Offer & setLocalDescription]                               │
       ├─────── OFFER(sdp) ────────────>│                               │
       │                                ├─────── OFFER(sdp) ───────────>│
       │                                │                 [Create RTCPeerConnection & Add Tracks]
       │                                │                 [setRemoteDescription(offer)]
       │                                │                 [Create SDP Answer & setLocalDescription]
       │                                │<────── ANSWER(sdp) ───────────┤
       |<────── ANSWER(sdp) ────────────┤                               │
 [setRemoteDescription(answer)]         │                               │
       │                                │                               │
 [Trickle ICE Candidate]                │                               │
       ├─────── ICE_CANDIDATE ─────────>│                               │
       │                                ├─────── ICE_CANDIDATE ────────>│
       │                                │                 [addIceCandidate()]
       │                                │<────── ICE_CANDIDATE ─────────┤ [Trickle ICE Candidate]
       |<────── ICE_CANDIDATE ──────────┤                               │
 [addIceCandidate()]                    │                               │
       │                                │                               │
       │================ P2P Direct Media Stream =======================│
       │                     (State: CONNECTED)                         |
```

---

## Detailed WebRTC API Explanation

### 1. `navigator.mediaDevices.getUserMedia()`
Requests access to local media input devices (camera and microphone). Returns a `MediaStream` containing `MediaStreamTrack` objects (1 audio track, 1 video track).

### 2. `RTCPeerConnection`
The core native API representing a WebRTC connection between local browser and remote peer. Maintains state, manages codecs, performs SDP negotiation, and handles ICE candidate gathering.

### 3. `createOffer()`
Generates an SDP (Session Description Protocol) blob describing local media capabilities, codecs, and transport options for the initiator.

### 4. `createAnswer()`
Generates an SDP answer blob in response to a received SDP offer, matching supported codecs and transport parameters.

### 5. `setLocalDescription()`
Configures the local end of the peer connection with the generated SDP offer or answer. Triggers local ICE candidate gathering.

### 6. `setRemoteDescription()`
Configures the remote end of the peer connection with the SDP offer or answer received over WebSocket signaling.

### 7. `addIceCandidate()`
Adds a newly received remote ICE candidate (IP address, port, protocol) to the connection's candidate pool. In `webrtc.service.ts`, candidates arriving *before* `setRemoteDescription()` are queued to prevent race conditions.

---

## STUN & NAT Traversal

- **What STUN Does**: Discovers the client's public IP address and port mapping when operating behind a NAT (Network Address Translation) router.
- **What STUN Does Not Do**: STUN does **not** relay media traffic.
- **Why TURN is Needed in Production**: STUN fails when users are behind Symmetric NATs or strict corporate firewalls that block peer-to-peer UDP ports. In production, a TURN relay server (`turns:port:443`) is mandatory for 100% connectivity.

---

## Connection State Machine

The UI maps raw browser WebRTC states (`connectionState`, `iceConnectionState`) into clear user states:

| UI State | Browser States / Context | User Description |
| :--- | :--- | :--- |
| `idle` | Initial state | "Ready to join." |
| `joining` | `getUserMedia()` in progress | "Requesting camera and microphone access..." |
| `waiting` | 1st participant in room | "Waiting for another participant..." |
| `connecting` | `connecting` / `checking` | "Connecting..." |
| `connected` | `connected` / `completed` | "Connected" |
| `reconnecting` | `disconnected` / ICE Restart | "Connection interrupted. Trying to recover..." |
| `disconnected` | Socket or PC closed | "Disconnected" |
| `failed` | `failed` state reached | "Connection failed. Please try again." |

---

## Failure Handling Matrix

1. **Permission Denied**: Catches `NotAllowedError` during `getUserMedia()`. Displays explicit permission banner.
2. **No Device Found**: Catches `NotFoundError`. Displays missing camera/mic banner.
3. **Signaling Server Unavailable**: WebSocket connection error triggers clear signaling error banner.
4. **Peer Left Abruptly**: Server broadcasts `PEER_LEFT`. Active client closes PC, resets remote video, and returns to `WAITING` state.
5. **Temporary Network Interruption**: Connection state enters `reconnecting`. Automatically resumes if network recovers.
6. **ICE Failure**: Triggers bounded ICE restart. If restarts fail, moves state to `failed`.

---

## ICE Restart Recovery

When connection state enters `failed`, `useWebRTC` triggers an ICE restart:
1. Initiator generates a new offer with `{ iceRestart: true }`.
2. Initiator calls `setLocalDescription(offer)` and signals `OFFER` to receiver.
3. Receiver sets remote description, calls `createAnswer()`, sets local description, and signals `ANSWER`.
4. Original peer sets remote description and candidate gathering restarts.
5. Bounded restart guard (`maxRestarts = 2`) prevents infinite loops.

---

## Part B3: Connection Quality Panel (`getStats()`)

Calculates live metrics sampled every 1000ms:
- **Round-Trip Time (RTT)**: Extracted from `candidate-pair.currentRoundTripTime` (ms).
- **Inbound Bitrate**: Calculated via byte deltas: `(deltaBytes * 8) / deltaTimeMs` (kbps / Mbps).
- **Packets Lost**: Cumulative `inbound-rtp.packetsLost`.
- **Jitter**: `inbound-rtp.jitter` (ms).
- **Resolution**: `inbound-rtp.frameWidth` × `inbound-rtp.frameHeight`.
- **FPS**: `inbound-rtp.framesPerSecond`.

---

## Known Limitations

- **No TURN Relay Configured**: Uses public Google STUN only. Connections across strict Symmetric NATs will fail.
- **Two Participants Only**: Hardcoded 2-user limit per room.
- **In-Memory Room State**: Rooms are stored in server RAM; multi-instance deployment requires Redis pub/sub.
- **No Authentication**: Rooms are open by ID. Production requires JWT authentication.

---

## Part C Architectural Analysis

For in-depth explanations of NAT traversal, TURN server configuration, ICE restart mechanics, and the **10,000 live-shopping viewer architecture diagram**, see [ANSWERS.md](ANSWERS.md).

---

## AI Usage Disclosure

AI assistance (Gemini 3.6 Flash / Antigravity Agent) was used to accelerate boilerplate generation, assist with CSS design system tokens, and draft markdown structure. All core WebRTC service logic, SDP candidate queuing, signaling validation, state machine mapping, and architectural documentation were authored and verified according to the Reneo assessment brief.
