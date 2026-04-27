/**
 * useHandDetector.js — MediaPipe HandLandmarker integration hook
 * 
 * UPDATED: Returns ALL detected hands (up to 2), not just the first.
 * Each hand includes its landmarks and handedness label.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export default function useHandDetector(videoRef, isVideoActive) {
  const handLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimestampRef = useRef(-1);

  // Now stores arrays of hands
  const [allHands, setAllHands] = useState([]);
  const [fps, setFps] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);

  // FPS calculation
  const fpsBufferRef = useRef([]);
  const lastFpsUpdateRef = useRef(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let cancelled = false;

    async function initHandLandmarker() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

        if (cancelled) return;

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });

        if (cancelled) {
          handLandmarker.close();
          return;
        }

        handLandmarkerRef.current = handLandmarker;
        setIsModelLoaded(true);
        setError(null);
      } catch (err) {
        console.error('HandLandmarker init error:', err);
        setError(`Failed to load hand detection model: ${err.message}`);
      }
    }

    initHandLandmarker();

    return () => {
      cancelled = true;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, []);

  // Detection loop
  const detect = useCallback(() => {
    const video = videoRef?.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !handLandmarker || !isVideoActive || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    const timestamp = video.currentTime * 1000;

    // Avoid duplicate timestamps
    if (timestamp === lastTimestampRef.current) {
      animationFrameRef.current = requestAnimationFrame(detect);
      return;
    }
    lastTimestampRef.current = timestamp;

    try {
      const results = handLandmarker.detectForVideo(video, now);

      if (results.landmarks && results.landmarks.length > 0) {
        // Build array of all detected hands
        const hands = results.landmarks.map((lm, i) => ({
          landmarks: lm,
          handedness: results.handedness?.[i]?.[0]?.categoryName || 'Unknown',
          index: i,
        }));
        setAllHands(hands);
        setIsDetecting(true);
      } else {
        setAllHands([]);
        setIsDetecting(false);
      }

      // FPS calculation
      fpsBufferRef.current.push(now);
      if (fpsBufferRef.current.length > 30) fpsBufferRef.current.shift();

      if (now - lastFpsUpdateRef.current > 500 && fpsBufferRef.current.length > 1) {
        const elapsed = fpsBufferRef.current[fpsBufferRef.current.length - 1] - fpsBufferRef.current[0];
        const calculatedFps = Math.round(((fpsBufferRef.current.length - 1) / elapsed) * 1000);
        setFps(calculatedFps);
        lastFpsUpdateRef.current = now;
      }
    } catch (err) {
      // Silently handle detection errors (common during initialization)
      console.warn('Detection frame error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detect);
  }, [videoRef, isVideoActive]);

  // Start/stop detection loop
  useEffect(() => {
    if (isModelLoaded && isVideoActive) {
      animationFrameRef.current = requestAnimationFrame(detect);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isModelLoaded, isVideoActive, detect]);

  return {
    allHands,       // Array of { landmarks, handedness, index }
    handCount: allHands.length,
    fps,
    isModelLoaded,
    isDetecting,
    error,
  };
}
