/**
 * StatusBar.jsx — Bottom status bar with FPS, detection state, and hints
 */

import './StatusBar.css';

export default function StatusBar({ fps, isDetecting, isModelLoaded, handedness }) {
  const fpsColor =
    fps >= 24 ? 'var(--color-emerald)' :
    fps >= 15 ? 'var(--color-amber)' :
    'var(--color-red)';

  const detectionState = !isModelLoaded
    ? { label: 'Loading model...', color: 'var(--color-amber)', pulse: true }
    : isDetecting
      ? { label: 'Hand Detected', color: 'var(--color-emerald)', pulse: false }
      : { label: 'No Hand', color: 'var(--color-text-muted)', pulse: false };

  return (
    <div className="status-bar" id="status-bar" role="status" aria-live="polite">
      {/* FPS Counter */}
      <div className="status-bar__item">
        <span className="status-bar__label">FPS</span>
        <span
          className="status-bar__value"
          style={{ color: fpsColor }}
        >
          {fps || '—'}
        </span>
      </div>

      <div className="status-bar__divider" />

      {/* Detection State */}
      <div className="status-bar__item">
        <span
          className={`status-bar__dot ${detectionState.pulse ? 'status-bar__dot--pulse' : ''}`}
          style={{ background: detectionState.color }}
        />
        <span className="status-bar__value" style={{ color: detectionState.color }}>
          {detectionState.label}
        </span>
      </div>

      {handedness && (
        <>
          <div className="status-bar__divider" />
          <div className="status-bar__item">
            <span className="status-bar__label">Hand</span>
            <span className="status-bar__value">{handedness}</span>
          </div>
        </>
      )}

      <div className="status-bar__spacer" />

      {/* Model info */}
      <div className="status-bar__item status-bar__item--right">
        <span className="status-bar__label">MediaPipe Hands</span>
        <span className="status-bar__badge">v1</span>
      </div>
    </div>
  );
}
