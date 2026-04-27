/**
 * CameraFeed.jsx — Live camera feed with landmark overlay
 */

import { useRef, useEffect, useCallback } from 'react';
import { CONNECTIONS } from '../lib/landmarkUtils.js';
import './CameraFeed.css';

export default function CameraFeed({ videoRef, landmarks, isDetecting, mirrorMode }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Draw video frame + landmarks on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef?.current;
    if (!canvas || !video || video.readyState < 2) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext('2d');
    const { videoWidth, videoHeight } = video;

    // Set canvas size to match video
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    ctx.save();

    // Mirror mode
    if (mirrorMode) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.restore();

    // Draw landmarks (already in normalized 0-1 coordinates)
    if (landmarks && landmarks.length === 21) {
      ctx.save();

      const w = canvas.width;
      const h = canvas.height;

      // Transform landmarks for mirror mode
      const transformX = (x) => mirrorMode ? (1 - x) * w : x * w;

      // Draw connections
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      for (const [startIdx, endIdx] of CONNECTIONS) {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        ctx.beginPath();
        ctx.moveTo(transformX(start.x), start.y * h);
        ctx.lineTo(transformX(end.x), end.y * h);
        ctx.stroke();
      }

      // Draw landmark points
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const x = transformX(lm.x);
        const y = lm.y * h;

        // Glow effect
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = i === 0 ? '#10B981' : '#00D4FF'; // Wrist is green
        ctx.fill();
      }

      // Draw bounding box with pulse effect
      const xs = landmarks.map(lm => transformX(lm.x));
      const ys = landmarks.map(lm => lm.y * h);
      const minX = Math.min(...xs) - 20;
      const maxX = Math.max(...xs) + 20;
      const minY = Math.min(...ys) - 20;
      const maxY = Math.max(...ys) + 20;

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);

      ctx.restore();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [videoRef, landmarks, mirrorMode]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <div className="camera-feed" id="camera-feed">
      {/* Hidden video element — source for canvas */}
      <video
        ref={videoRef}
        className="camera-feed__video"
        autoPlay
        playsInline
        muted
      />

      {/* Visible canvas with landmark overlay */}
      <canvas ref={canvasRef} className="camera-feed__canvas" />

      {/* Hand detection indicator */}
      {isDetecting && (
        <div className="camera-feed__detected-badge">
          <span className="camera-feed__detected-dot" />
          Hand Detected
        </div>
      )}
    </div>
  );
}
