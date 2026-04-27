/**
 * GestureHistory.jsx — Scrollable list of recently recognized gestures
 */

import './GestureHistory.css';

export default function GestureHistory({ history, onClear }) {
  return (
    <div className="gesture-history" id="gesture-history">
      <div className="gesture-history__header">
        <h3 className="gesture-history__title">History</h3>
        {history.length > 0 && (
          <button
            className="gesture-history__clear"
            onClick={onClear}
            aria-label="Clear gesture history"
          >
            Clear
          </button>
        )}
      </div>

      <div className="gesture-history__list">
        {history.length === 0 ? (
          <p className="gesture-history__empty">
            No gestures recognized yet. Try showing a hand sign!
          </p>
        ) : (
          history.map((entry, index) => (
            <div
              key={entry.id}
              className="gesture-history__item"
              style={{
                '--item-color': entry.color,
                animationDelay: `${index * 30}ms`,
              }}
            >
              <div
                className="gesture-history__item-accent"
                style={{ background: entry.color }}
              />
              <div className="gesture-history__item-content">
                <span
                  className="gesture-history__item-label"
                  style={{ color: entry.color }}
                >
                  {entry.label}
                </span>
                <span className="gesture-history__item-confidence">
                  {entry.confidence}%
                </span>
              </div>
              <span className="gesture-history__item-time">
                {entry.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
