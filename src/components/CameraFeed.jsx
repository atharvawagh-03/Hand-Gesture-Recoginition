/**
 * CameraFeed.jsx — Live camera feed with multi-hand landmark overlay
 * 
 * UPDATED: Renders landmarks for ALL detected hands (up to 2).
 * Each hand gets a distinct color (cyan for hand 1, violet for hand 2).
 * Shows per-hand gesture labels directly on the camera feed.
 */

import { useRef, useEffect, useCallback } from 'react';
import { CONNECTIONS } from '../lib/landmarkUtils.js';
import './CameraFeed.css';

// Per-hand colors
const HAND_COLORS = [
  { line: 'rgba(0, 212, 255, 0.6)', dot: '#00D4FF', glow: 'rgba(0, 212, 255, 0.2)', box: 'rgba(0, 212, 255, 0.3)', label: '#00D4FF' },
  { line: 'rgba(139, 92, 246, 0.6)', dot: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.2)', box: 'rgba(139, 92, 246, 0.3)', label: '#8B5CF6' },
];

export default function CameraFeed({ videoRef, allHands, isDetecting, mirrorMode, perHandResults }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Draw video frame + landmarks for ALL hands on canvas
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

    // Draw landmarks for EACH detected hand
    if (allHands && allHands.length > 0) {
      const w = canvas.width;
      const h = canvas.height;
      const transformX = (x) => mirrorMode ? (1 - x) * w : x * w;

      for (let handIdx = 0; handIdx < allHands.length; handIdx++) {
        const hand = allHands[handIdx];
        const landmarks = hand.landmarks;
        const colors = HAND_COLORS[handIdx] || HAND_COLORS[0];

        if (!landmarks || landmarks.length < 21) continue;

        ctx.save();

        // Draw connections
        ctx.strokeStyle = colors.line;
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
          ctx.fillStyle = colors.glow;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = i === 0 ? '#10B981' : colors.dot; // Wrist is green
          ctx.fill();
        }

        // Draw bounding box
        const xs = landmarks.map(lm => transformX(lm.x));
        const ys = landmarks.map(lm => lm.y * h);
        const minX = Math.min(...xs) - 20;
        const maxX = Math.max(...xs) + 20;
        const minY = Math.min(...ys) - 20;
        const maxY = Math.max(...ys) + 20;

        ctx.strokeStyle = colors.box;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);

        // Draw hand label (handedness + gesture) above bounding box
        const handLabel = hand.handedness || `Hand ${handIdx + 1}`;
        const gestureResult = perHandResults?.find(r => r.handIndex === handIdx);
        const gestureLabel = gestureResult ? ` • ${gestureResult.label} ${Math.round(gestureResult.confidence * 100)}%` : '';

        ctx.font = '600 13px Inter, sans-serif';
        ctx.textBaseline = 'bottom';

        const labelText = `${handLabel}${gestureLabel}`;
        const textWidth = ctx.measureText(labelText).width;

        // Label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        const labelX = minX;
        const labelY = minY - 4;
        ctx.fillRect(labelX - 4, labelY - 18, textWidth + 8, 20);

        // Label text
        ctx.fillStyle = colors.label;
        ctx.fillText(labelText, labelX, labelY);

        ctx.restore();
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [videoRef, allHands, mirrorMode, perHandResults]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  const handCount = allHands?.length || 0;

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
          {handCount === 1 ? '1 Hand Detected' : `${handCount} Hands Detected`}
        </div>
      )}
    </div>
  );
}
