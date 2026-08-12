# WebRTC Media Pipeline Stability Audit & Root Cause Analysis

**Author**: Principal WebRTC Engineer & Senior Frontend Architect  
**Date**: August 2026  
**Target Repository**: Reneo WebRTC Assessment  

---

## Executive Summary

During testing of the 2-party WebRTC video call, media transitions (camera toggle, mic mute, screen share start/stop, device switching, and connection state changes) exhibited **video flickering, temporary black frames, and video DOM unmounting**. 

This audit traces the complete media lifecycle from `getUserMedia()` / `getDisplayMedia()` down to HTML `<video>` DOM element rendering and React state cascades. We identified **4 root causes** and implemented principal-level fixes to guarantee **stable, smooth, low-latency, cross-browser WebRTC video** without altering the underlying native WebRTC architecture.

---

## Complete Media Lifecycle Trace

```
getUserMedia() / getDisplayMedia()
        ↓
   MediaStream
        ↓
MediaStreamTrack (video/audio)
        ↓
  MediaManager (Ref Storage)
        ↓
RTCRtpSender.replaceTrack()
        ↓
RTCPeerConnection (P2P Transport)
        ↓
  ontrack Event
        ↓
Remote MediaStream (Stable Container)
        ↓
HTMLVideoElement (Persistent DOM Mount)
        ↓
React Rendering (Isolated via React.memo)
```

---

## 1. Root Cause Identification

### Root Cause 1: Conditional Unmounting of `<video>` DOM Elements (SMOKING GUN)
- **Location**: `client/src/components/VideoGrid.tsx`
- **Evidence**:
  ```tsx
  {remoteStream && isConnected ? (
    <video ref={remoteVideoRef} ... />
  ) : (
    <div className="remote-empty-state">...</div>
  )}
  ```
- **Impact**: Whenever `connectionState` temporarily transitioned (e.g. `'connecting'`, `'reconnecting'`, or initial room join), React destroyed (unmounted) the `<video>` DOM element completely. When returning to `isConnected === true`, React created a brand-new `<video>` DOM node. This forced the browser media engine to destroy the hardware video decoder pipeline and re-initialize a new decoder, resulting in a **severe black frame / video blink**.

### Root Cause 2: Unchecked `srcObject` Re-assignments
- **Location**: `client/src/components/VideoGrid.tsx`
- **Evidence**:
  ```ts
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  ```
- **Impact**: Assigning `videoElement.srcObject = stream` unconditionally on every render or stream reference update forces the browser HTMLMediaElement to halt current playback, reset media pipelines, and invoke internal play routines. Re-assigning the same stream instance causes noticeable visual flickering.

### Root Cause 3: Telemetry (`getStats`) Re-rendering Video Components
- **Location**: `client/src/App.tsx` & `client/src/hooks/useWebRTC.ts`
- **Evidence**: The 1000ms `getStats()` polling engine updated state in `useConnectionStats`, causing parent components (`App.tsx`) to re-render every second.
- **Impact**: Without memoization on `VideoGrid`, telemetry updates triggered full re-renders of the video stage, evaluating inline ref callbacks and re-triggering media effects.

### Root Cause 4: Device Switching Race Conditions
- **Location**: `client/src/services/webrtc/DeviceManager.ts`
- **Evidence**: Rapid consecutive device selections invoked asynchronous `getUserMedia()` promises. If an earlier `getUserMedia()` request resolved *after* a later request, the obsolete media track overwrote the newer track on the `RTCRtpSender`.

---

## 2. Browser & Performance Risks

| Risk Area | Browser / Device Affected | Impact Without Fix | Fix Implemented |
| :--- | :--- | :--- | :--- |
| **DOM Unmounting** | Safari (iOS/macOS), Chrome, Edge | Hardware decoder destruction & black blink | Permanent `<video>` DOM element mounting with CSS overlays |
| **Unchecked `srcObject`** | Firefox, Safari, Chrome | Media pipeline reload & video stall | Guarded assignment `if (video.srcObject !== stream)` |
| **Autoplay Rejection** | Safari iOS, Chrome Mobile | Unhandled Promise Rejection error | Safe `.play().catch(...)` with user gesture fallback |
| **Device Switch Glare** | Chrome, Edge, Firefox | Stale track overwriting active track | Monotonic `switchRequestId` operation tokens |

---

## 3. Implemented Fixes & Architectural Principles

### 1. Permanent Video DOM Mounting Rule
- `<video>` DOM elements (`localVideoRef` and `remoteVideoRef`) are **permanently mounted** in the DOM.
- Empty states, waiting screens, connecting spinners, and camera-off placeholders are rendered as **absolute overlays above the video element**.
- When camera is disabled or remote participant leaves, `<video>` remains mounted (with `display: none` or hidden via opacity), preserving decoder context.

### 2. Guarded `srcObject` Assignment
- `srcObject` is assigned **only** when the `MediaStream` instance actually changes:
  ```ts
  if (videoEl && videoEl.srcObject !== stream) {
    videoEl.srcObject = stream;
  }
  ```

### 3. Isolated React Render Pipeline (`React.memo`)
- `VideoGrid` is wrapped in `React.memo` with a custom `arePropsEqual` comparator.
- `getStats()` telemetry updates (~1000ms) only re-render the `QualityPanel` UI component; `VideoGrid` rendering remains completely static and untouched during stats polling.

### 4. Monotonic Device Switching Request Tokens
- `DeviceManager.ts` tracks a monotonic `switchRequestId` counter.
- If a user clicks between cameras rapidly, any `getUserMedia()` result whose token does not match the latest request ID is immediately discarded and its tracks stopped.

---

## 4. Verification Strategy

1. **Build & Type Check**: `npm run build && npm run typecheck` (0 errors under strict mode).
2. **Camera Toggle Test**: Mute/unmute microphone and enable/disable camera 20 times consecutively. Verify **zero DOM unmounting and zero video flicker**.
3. **Screen Share Transition Test**: Start screen share -> stop screen share -> start screen share. Verify smooth track replacement on `RTCRtpSender` without SDP renegotiation or black frames.
4. **Device Switching Stress Test**: Rapidly switch cameras 5 times within 2 seconds. Verify only the last selected camera remains active and old tracks are stopped cleanly.
5. **Telemetry Isolation Test**: Open Connection Quality Panel. Observe live bitrate updating every 1000ms while inspecting React DOM updates. Verify **zero re-renders on `<video>` elements**.
