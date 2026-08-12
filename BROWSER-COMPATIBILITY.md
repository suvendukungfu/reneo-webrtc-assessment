# Browser Compatibility Matrix & Media API Specifications

**Reneo WebRTC Assessment Prototype**  
**Target Specifications**: W3C WebRTC 1.0, Media Capture and Streams, Audio Output Devices API  

---

## 1. Browser Support Matrix

| WebRTC / Media Feature | Chrome (Desktop) | Edge (Desktop) | Firefox (Desktop) | Safari (macOS) | Safari (iOS / iPadOS) | Chrome (Android) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`getUserMedia()`** | Supported | Supported | Supported | Supported | Supported (HTTPS only) | Supported (HTTPS only) |
| **`getDisplayMedia()`** | Supported | Supported | Supported | Supported | Partially Supported (iOS 13+) | Partially Supported |
| **`RTCPeerConnection`** | Supported | Supported | Supported | Supported | Supported | Supported |
| **`RTCRtpSender.replaceTrack()`** | Supported | Supported | Supported | Supported | Supported | Supported |
| **`getStats()`** | Supported | Supported | Supported | Supported | Supported | Supported |
| **`enumerateDevices()`** | Supported | Supported | Supported | Supported | Supported | Supported |
| **`setSinkId()`** (Speaker Selection) | Supported | Supported | Browser Dependent (Flag) | Unsupported (System Default) | Unsupported (System Default) | Partially Supported |
| **`devicechange` Event** | Supported | Supported | Supported | Supported | Supported | Supported |
| **`playsInline` Autoplay** | Supported | Supported | Supported | Required for Video | Required for Video | Supported |

---

## 2. Browser-Specific Handling & Safeguards

### 1. Safari (`playsInline` & Autoplay Security)
- **Requirement**: Mobile Safari requires `playsInline` and `muted` attributes on local preview `<video>` elements. If `playsInline` is omitted, Safari forces fullscreen video playback.
- **Implementation**:
  ```tsx
  <video autoPlay muted playsInline className="local-video-element" />
  ```
- **Autoplay Rejection Guard**:
  All `video.play()` calls are wrapped in promise catch handlers to catch `NotAllowedError` (user interaction required):
  ```ts
  videoEl.play().catch((err) => {
    if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
      console.warn('[VideoRenderer] Playback blocked:', err);
    }
  });
  ```

### 2. Speaker Selection (`setSinkId`) Isolation
- **Behavior**: `HTMLMediaElement.prototype.setSinkId` is supported on Chromium-based browsers (Chrome, Edge, Opera). Safari and Firefox restrict speaker output routing to system defaults for user privacy/fingerprinting protection.
- **Isolated Helper**:
  ```ts
  const isSetSinkIdSupported = typeof (videoEl as any).setSinkId === 'function';
  ```
  If `setSinkId` is unsupported, the app gracefully displays an informative non-blocking toast without crashing or breaking the audio connection.

### 3. Screen Sharing (`getDisplayMedia`) Detection
- **Behavior**: `navigator.mediaDevices.getDisplayMedia` is available on desktop browsers. Mobile Safari (iOS) restricts screen capture to native app extensions.
- **Isolated Helper**:
  ```ts
  const isScreenShareSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);
  ```
  On mobile devices where `getDisplayMedia` is unsupported, the Screen Share button displays a helpful tooltip (*"Screen sharing is available on desktop browsers"*) and is gracefully disabled.

### 4. Overconstrained Resolution Fallback
- **Behavior**: Budget mobile devices or external webcams may reject ideal 720p resolution constraints (`{ width: { ideal: 1280 }, height: { ideal: 720 } }`), throwing `OverconstrainedError`.
- **Implementation**:
  ```ts
  try {
    stream = await navigator.mediaDevices.getUserMedia(idealConstraints);
  } catch (err: any) {
    if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } else {
      throw err;
    }
  }
  ```

---

## 3. Verified Execution Environments

- ✅ **Chrome 128 (macOS Sonoma)**
- ✅ **Safari 17.5 (macOS Sonoma)**
- ✅ **Firefox 129 (macOS Sonoma)**
- ✅ **Edge 127 (macOS Sonoma)**
- ✅ **Safari iOS 17.5 (iPhone 15 Pro)**
- ✅ **Chrome Android 127 (Pixel 8)**
