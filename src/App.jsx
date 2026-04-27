/**
 * App.jsx — Main application layout and orchestration
 * 
 * Two-panel layout: Camera Feed (left) + Output Panel (right)
 * With Navbar, StatusBar, SettingsPanel, and OnboardingOverlay
 */

import { useEffect } from 'react';
import './App.css';

// Hooks
import useCamera from './hooks/useCamera.js';
import useHandDetector from './hooks/useHandDetector.js';
import useGestureClassifier from './hooks/useGestureClassifier.js';
import useTTS from './hooks/useTTS.js';

// Components
import Navbar from './components/Navbar.jsx';
import CameraFeed from './components/CameraFeed.jsx';
import HandGuide from './components/HandGuide.jsx';
import GestureOutput from './components/GestureOutput.jsx';
import GestureHistory from './components/GestureHistory.jsx';
import StatusBar from './components/StatusBar.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import OnboardingOverlay from './components/OnboardingOverlay.jsx';

// Store
import useSettingsStore from './store/useSettingsStore.js';

export default function App() {
  const mirrorMode = useSettingsStore(s => s.mirrorMode);
  const selectedCamera = useSettingsStore(s => s.selectedCamera);
  const confidenceThreshold = useSettingsStore(s => s.confidenceThreshold);
  const gestureHistory = useSettingsStore(s => s.gestureHistory);
  const clearHistory = useSettingsStore(s => s.clearHistory);

  // Camera
  const {
    videoRef,
    isActive: isCameraActive,
    error: cameraError,
    permissionState,
    cameraDevices,
    retry: retryCamera,
  } = useCamera(selectedCamera);

  // Hand detection
  const {
    landmarks,
    handedness,
    fps,
    isModelLoaded,
    isDetecting,
    error: detectorError,
  } = useHandDetector(videoRef, isCameraActive);

  // Gesture classification
  const {
    currentGesture,
    confidence,
    rawResult,
  } = useGestureClassifier(landmarks);

  // Text-to-Speech
  const { speak } = useTTS();

  // Speak gesture label when a new gesture is detected
  useEffect(() => {
    if (currentGesture) {
      speak(currentGesture.label);
    }
  }, [currentGesture, speak]);

  const hasError = cameraError || detectorError;

  return (
    <div className="app" id="app">
      <Navbar />

      <main className="app__main">
        {/* Camera Panel */}
        <section className="app__camera-panel" id="camera-panel">
          {hasError ? (
            <div className="app__error-state">
              <div className="app__error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              </div>
              <h2 className="app__error-title">Camera Unavailable</h2>
              <p className="app__error-message">{cameraError || detectorError}</p>
              <button className="app__error-retry" onClick={retryCamera}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Retry
              </button>
            </div>
          ) : (
            <div className="app__camera-wrapper">
              <CameraFeed
                videoRef={videoRef}
                landmarks={landmarks}
                isDetecting={isDetecting}
                mirrorMode={mirrorMode}
              />
              <HandGuide visible={!isDetecting && isCameraActive && isModelLoaded} />

              {/* Model loading overlay */}
              {!isModelLoaded && (
                <div className="app__loading-overlay">
                  <div className="app__loading-spinner" />
                  <p className="app__loading-text">Loading hand detection model...</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Output Panel */}
        <section className="app__output-panel glass-card" id="output-panel">
          <GestureOutput
            gesture={currentGesture}
            confidence={confidence}
            rawResult={rawResult}
            threshold={confidenceThreshold}
          />
          <div className="app__output-divider" />
          <GestureHistory
            history={gestureHistory}
            onClear={clearHistory}
          />
        </section>
      </main>

      <StatusBar
        fps={fps}
        isDetecting={isDetecting}
        isModelLoaded={isModelLoaded}
        handedness={handedness}
      />

      <SettingsPanel cameraDevices={cameraDevices} />
      <OnboardingOverlay />
    </div>
  );
}
