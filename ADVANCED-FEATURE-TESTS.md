# Advanced WebRTC Feature Verification & Test Matrix

This document provides a comprehensive test suite for verifying **Part B3 (Connection Quality Panel - Selected Assessment Feature)** alongside **B1 (Screen Sharing)** and **B2 (Device Switching)**.

---

## 1. Part B3 — Connection Quality Panel Tests (Selected Feature)

| Test ID | Test Scenario | Action | Expected Result | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| **B3-01** | Telemetry Polling | Connect call and open Quality Panel (`Activity` button). | Metrics sample every 1000ms from native `RTCPeerConnection.getStats()`. | ✅ PASS |
| **B3-02** | Inbound Bitrate Delta | Stream video between two windows. | Inbound bitrate is calculated via `(deltaBytes * 8) / deltaTimeMs`. No `NaN` or `Infinity`. | ✅ PASS |
| **B3-03** | RTT & Jitter Tracking | Check RTT and Jitter boxes. | RTT extracted from `candidate-pair.currentRoundTripTime` (ms). Jitter from `inbound-rtp.jitter`. | ✅ PASS |
| **B3-04** | Packet Loss Calculation | Check Packet Loss box. | `packetLossPercent = packetsLost / (packetsLost + packetsReceived) * 100`. | ✅ PASS |
| **B3-05** | Resolution & FPS | Inspect resolution and frame rate. | Displays live video width × height (e.g. `1280 × 720`) and FPS (e.g. `30 FPS`). | ✅ PASS |
| **B3-06** | Quality Assessment | Observe quality badge rating. | Displays semantic rating (`Excellent`, `Good`, `Fair`, `Poor`) based on RTT, loss, and bitrate. | ✅ PASS |
| **B3-07** | Rolling Bitrate Trend | Observe mini-bar chart in panel. | Displays 30-sample rolling bitrate trend without external chart dependencies. | ✅ PASS |

---

## 2. B1 — Screen Sharing Tests (Additional Enhancement)

| Test ID | Test Scenario | Action | Expected Result | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| **B1-01** | Start Screen Share | Click **Share Screen** icon button. | Invokes `getDisplayMedia({ video: true, audio: false })`. | ✅ PASS |
| **B1-02** | Track Replacement | Confirm stream delivery to remote peer. | Outgoing video track is replaced via `sender.replaceTrack(screenTrack)`. **Zero SDP renegotiation** (`createOffer`/`createAnswer`). | ✅ PASS |
| **B1-03** | In-App Stop Sharing | Click **Stop Sharing** icon button. | Display track stops, original camera track is restored via `sender.replaceTrack(cameraTrack)`. Call remains connected. | ✅ PASS |
| **B1-04** | Native Browser Stop | Click browser's floating "Stop sharing" bar. | `screenTrack.onended` listener fires automatically. Camera track is restored instantly. | ✅ PASS |
| **B1-05** | Cancel Picker | Cancel browser screen selection dialog. | Catches `NotAllowedError`. Shows non-blocking banner: `"Screen sharing cancelled"`. Call remains active. | ✅ PASS |
| **B1-06** | Preserve Camera Track | Verify camera track during screen share. | Camera track is preserved in `MediaManager` state (not destroyed). | ✅ PASS |

---

## 3. B2 — Device Switching Tests (Additional Enhancement)

| Test ID | Test Scenario | Action | Expected Result | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| **B2-01** | Device Enumeration | Click **Device Settings** (`Sliders` button). | Calls `navigator.mediaDevices.enumerateDevices()`. Lists all microphones, cameras, and speakers. | ✅ PASS |
| **B2-02** | Switch Microphone | Select different microphone from dropdown. | Acquires new track via `getUserMedia({ audio: { deviceId: { exact } } })`. Replaces track via `sender.replaceTrack(newTrack)`. Stops old track *after* replacement. | ✅ PASS |
| **B2-03** | Switch Camera | Select different camera from dropdown. | Acquires new track via `getUserMedia({ video: { deviceId: { exact } } })`. Replaces track via `sender.replaceTrack(newTrack)`. | ✅ PASS |
| **B2-04** | Speaker Routing | Select different speaker from dropdown. | Invokes `remoteVideoElement.setSinkId(deviceId)` if supported by browser. Shows notification if unsupported. | ✅ PASS |
| **B2-05** | Device Hot-Plugging | Connect or disconnect USB camera/headset. | `devicechange` listener detects hardware change and refreshes device dropdowns dynamically. | ✅ PASS |
| **B2-06** | Switch Failure Safety | Simulate device capture error. | If acquiring new device fails, old working track remains active. User connection is never broken. | ✅ PASS |

---

## 4. Combination & Stress Tests

| Test ID | Test Scenario | Action | Expected Result | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| **COMB-01**| Camera Switch + Screen Share | Switch camera -> Start Screen Share -> Stop Screen Share. | Newly selected camera is restored after screen share stops. | ✅ PASS |
| **COMB-02**| Mic Switch + Mute | Switch microphone -> Mute audio -> Unmute audio. | Audio muting state (`track.enabled = false`) persists correctly across device switches. | ✅ PASS |
| **COMB-03**| Screen Share + Quality Stats | Start Screen Share -> Inspect Quality Panel. | Bitrate, resolution, and FPS update in real time to reflect screen share stream metrics. | ✅ PASS |
| **COMB-04**| Hang Up During Screen Share | Click **Leave Call** while screen sharing is active. | Stops screen track, camera track, microphone track, closes `RTCPeerConnection` and WebSocket cleanly. Zero leaks. | ✅ PASS |
