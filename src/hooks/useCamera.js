/**
 * useCamera.js — Webcam access and management hook
 * 
 * Handles getUserMedia, device enumeration, stream lifecycle,
 * and camera switching.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export default function useCamera(selectedCamera) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied'

  // Enumerate available camera devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.warn('Could not enumerate devices:', err);
      return [];
    }
  }, []);

  // Start the camera stream
  const startCamera = useCallback(async (deviceId) => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setError(null);
      setPermissionState('prompt');

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, min: 24 },
          facingMode: 'user',
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);

      // Re-enumerate to get device labels (available after permission granted)
      await enumerateDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      setIsActive(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Camera access denied. Please allow camera permission and reload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a webcam and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is in use by another application. Please close it and retry.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, [enumerateDevices]);

  // Stop the camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Switch to a different camera
  const switchCamera = useCallback((deviceId) => {
    startCamera(deviceId);
  }, [startCamera]);

  // Auto-start on mount
  useEffect(() => {
    startCamera(selectedCamera);
    return () => stopCamera();
  }, [selectedCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle camera disconnection mid-session
  useEffect(() => {
    if (!streamRef.current) return;

    const tracks = streamRef.current.getVideoTracks();
    const handleEnded = () => {
      setIsActive(false);
      setError('Camera disconnected. Please reconnect and click retry.');
    };

    tracks.forEach(track => track.addEventListener('ended', handleEnded));
    return () => {
      tracks.forEach(track => track.removeEventListener('ended', handleEnded));
    };
  }, [isActive]);

  return {
    videoRef,
    isActive,
    error,
    permissionState,
    cameraDevices,
    startCamera,
    stopCamera,
    switchCamera,
    retry: () => startCamera(selectedCamera),
  };
}
