/**
 * GestureOutput.jsx — Current gesture display with confidence bar
 */

import { useState, useEffect, useRef } from 'react';
import './GestureOutput.css';

export default function GestureOutput({ gesture, confidence, rawResult, threshold }) {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevGestureRef = useRef(null);

  // Flash animation on new gesture
  useEffect(() => {
    if (gesture && gesture.id !== prevGestureRef.current) {
      setIsFlashing(true);
      const timeout = setTimeout(() => setIsFlashing(false), 300);
      prevGestureRef.current = gesture.id;
      return () => clearTimeout(timeout);
    }
  }, [gesture]);

  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor = 
    confidence >= 0.88 ? 'var(--color-emerald)' :
    confidence >= threshold ? 'var(--color-amber)' :
    'var(--color-red)';

  return (
    <div className="gesture-output" id="gesture-output">
      <div className="gesture-output__header">
        <h2 className="gesture-output__title">Detected Gesture</h2>
        {rawResult && confidence < threshold && (
          <span className="gesture-output__low-conf-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Low confidence
          </span>
        )}
      </div>

      <div
        className={`gesture-output__label-container ${isFlashing ? 'gesture-output__label-container--flash' : ''}`}
        style={{
          '--flash-color': gesture?.glowColor || 'var(--color-cyan-glow)',
          '--gesture-color': gesture?.color || 'var(--color-glass-border)',
        }}
      >
        {gesture ? (
          <>
            <span className="gesture-output__emoji">{gesture.emoji}</span>
            <span
              className="gesture-output__label"
              style={{ color: gesture.color }}
            >
              {gesture.label}
            </span>
          </>
        ) : (
          <span className="gesture-output__waiting">
            Waiting for gesture...
          </span>
        )}
      </div>

      {/* Confidence bar */}
      <div className="gesture-output__confidence">
        <div className="gesture-output__confidence-header">
          <span className="gesture-output__confidence-label">Confidence</span>
          <span
            className="gesture-output__confidence-value"
            style={{ color: confidenceColor }}
          >
            {gesture ? `${confidencePercent}%` : '—'}
          </span>
        </div>
        <div className="gesture-output__confidence-track">
          <div
            className="gesture-output__confidence-fill"
            style={{
              width: gesture ? `${confidencePercent}%` : '0%',
              background: `linear-gradient(90deg, ${confidenceColor}, ${confidenceColor}dd)`,
              boxShadow: gesture ? `0 0 12px ${confidenceColor}40` : 'none',
            }}
          />
          {/* Threshold marker */}
          <div
            className="gesture-output__confidence-threshold"
            style={{ left: `${threshold * 100}%` }}
            title={`Threshold: ${Math.round(threshold * 100)}%`}
          />
        </div>
      </div>

      {gesture && (
        <p className="gesture-output__description">{gesture.description}</p>
      )}
    </div>
  );
}
