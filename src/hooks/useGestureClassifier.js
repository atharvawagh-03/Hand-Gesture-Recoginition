/**
 * useGestureClassifier.js — Gesture classification hook
 * 
 * Takes raw landmarks from useHandDetector, feeds them through
 * the heuristic classifier, and manages cooldown + history.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { classifyGesture } from '../lib/gestureRules.js';
import { MotionTracker } from '../lib/motionTracker.js';
import gestureConfig from '../config/gestures.json';
import useSettingsStore from '../store/useSettingsStore.js';

export default function useGestureClassifier(landmarks) {
  const confidenceThreshold = useSettingsStore(s => s.confidenceThreshold);
  const cooldownDuration = useSettingsStore(s => s.cooldownDuration);
  const addGestureToHistory = useSettingsStore(s => s.addGestureToHistory);

  const [currentGesture, setCurrentGesture] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [rawResult, setRawResult] = useState(null);

  const motionTrackerRef = useRef(new MotionTracker());
  const lastGestureRef = useRef(null);
  const lastGestureTimeRef = useRef(0);
  const stableCountRef = useRef(0);
  const lastClassRef = useRef(null);

  // Gesture config lookup
  const gestureMap = useMemo(() => {
    const map = {};
    gestureConfig.gestures.forEach(g => { map[g.id] = g; });
    return map;
  }, []);

  // Classification logic
  useEffect(() => {
    if (!landmarks) {
      motionTrackerRef.current.clear();
      setRawResult(null);
      // Keep displaying last gesture for a moment, then clear
      const timeout = setTimeout(() => {
        setCurrentGesture(null);
        setConfidence(0);
        setIsRecognizing(false);
      }, 800);
      return () => clearTimeout(timeout);
    }

    // Feed landmarks to motion tracker
    motionTrackerRef.current.addFrame(landmarks);

    // Classify
    const result = classifyGesture(landmarks, motionTrackerRef.current);
    setRawResult(result);

    if (!result || result.confidence < confidenceThreshold) {
      // Below threshold — show as low confidence but don't fire
      if (result) {
        setConfidence(result.confidence);
      }
      stableCountRef.current = 0;
      lastClassRef.current = null;
      return;
    }

    // Stability check: require same gesture for 3 consecutive frames
    if (result.id === lastClassRef.current) {
      stableCountRef.current++;
    } else {
      stableCountRef.current = 1;
      lastClassRef.current = result.id;
    }

    if (stableCountRef.current < 3) return;

    // Cooldown check
    const now = Date.now();
    if (
      result.id === lastGestureRef.current &&
      now - lastGestureTimeRef.current < cooldownDuration * 1000
    ) {
      // Same gesture within cooldown — update confidence but don't re-fire
      setConfidence(result.confidence);
      return;
    }

    // Fire gesture!
    const gestureInfo = gestureMap[result.id];
    if (gestureInfo) {
      setCurrentGesture(gestureInfo);
      setConfidence(result.confidence);
      setIsRecognizing(true);
      addGestureToHistory(gestureInfo, result.confidence);
      lastGestureRef.current = result.id;
      lastGestureTimeRef.current = now;
    }
  }, [landmarks, confidenceThreshold, cooldownDuration, gestureMap, addGestureToHistory]);

  return {
    currentGesture,
    confidence,
    isRecognizing,
    rawResult,
  };
}
