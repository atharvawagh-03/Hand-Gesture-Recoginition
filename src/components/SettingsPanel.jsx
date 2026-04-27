/**
 * SettingsPanel.jsx — Slide-out settings drawer
 */

import { useEffect, useRef } from 'react';
import './SettingsPanel.css';
import useSettingsStore from '../store/useSettingsStore.js';

export default function SettingsPanel({ cameraDevices }) {
  const {
    settingsPanelOpen,
    closeSettings,
    confidenceThreshold,
    cooldownDuration,
    ttsEnabled,
    ttsRate,
    ttsVolume,
    mirrorMode,
    selectedCamera,
    updateSetting,
    toggleTTS,
    toggleMirror,
  } = useSettingsStore();

  const panelRef = useRef(null);

  // Focus trap & escape key
  useEffect(() => {
    if (!settingsPanelOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeSettings();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settingsPanelOpen, closeSettings]);

  if (!settingsPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="settings-backdrop"
        onClick={closeSettings}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="settings-panel"
        id="settings-panel"
        ref={panelRef}
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
      >
        <div className="settings-panel__header">
          <h2 className="settings-panel__title">Settings</h2>
          <button
            className="settings-panel__close"
            onClick={closeSettings}
            aria-label="Close settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-panel__content">
          {/* Camera Section */}
          <section className="settings-section">
            <h3 className="settings-section__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Camera
            </h3>

            <div className="settings-field">
              <label className="settings-field__label" htmlFor="camera-select">
                Camera Source
              </label>
              <select
                id="camera-select"
                value={selectedCamera || ''}
                onChange={(e) => updateSetting('selectedCamera', e.target.value || null)}
              >
                <option value="">Default Camera</option>
                {cameraDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-field settings-field--toggle">
              <label className="settings-field__label">Mirror Mode</label>
              <button
                className={`settings-toggle ${mirrorMode ? 'settings-toggle--on' : ''}`}
                onClick={toggleMirror}
                role="switch"
                aria-checked={mirrorMode}
                id="toggle-mirror"
              >
                <span className="settings-toggle__thumb" />
              </button>
            </div>
          </section>

          {/* Recognition Section */}
          <section className="settings-section">
            <h3 className="settings-section__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Recognition
            </h3>

            <div className="settings-field">
              <div className="settings-field__header">
                <label className="settings-field__label" htmlFor="threshold-slider">
                  Confidence Threshold
                </label>
                <span className="settings-field__value">{Math.round(confidenceThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                id="threshold-slider"
                min="0.70"
                max="0.99"
                step="0.01"
                value={confidenceThreshold}
                onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
              />
              <div className="settings-field__range-labels">
                <span>70%</span>
                <span>99%</span>
              </div>
            </div>

            <div className="settings-field">
              <div className="settings-field__header">
                <label className="settings-field__label" htmlFor="cooldown-slider">
                  Cooldown Duration
                </label>
                <span className="settings-field__value">{cooldownDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                id="cooldown-slider"
                min="0.5"
                max="3.0"
                step="0.1"
                value={cooldownDuration}
                onChange={(e) => updateSetting('cooldownDuration', parseFloat(e.target.value))}
              />
              <div className="settings-field__range-labels">
                <span>0.5s</span>
                <span>3.0s</span>
              </div>
            </div>
          </section>

          {/* TTS Section */}
          <section className="settings-section">
            <h3 className="settings-section__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              Text-to-Speech
            </h3>

            <div className="settings-field settings-field--toggle">
              <label className="settings-field__label">Enable TTS</label>
              <button
                className={`settings-toggle ${ttsEnabled ? 'settings-toggle--on' : ''}`}
                onClick={toggleTTS}
                role="switch"
                aria-checked={ttsEnabled}
                id="toggle-tts"
              >
                <span className="settings-toggle__thumb" />
              </button>
            </div>

            {ttsEnabled && (
              <>
                <div className="settings-field">
                  <div className="settings-field__header">
                    <label className="settings-field__label" htmlFor="tts-rate">
                      Speech Rate
                    </label>
                    <span className="settings-field__value">{ttsRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    id="tts-rate"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsRate}
                    onChange={(e) => updateSetting('ttsRate', parseFloat(e.target.value))}
                  />
                </div>

                <div className="settings-field">
                  <div className="settings-field__header">
                    <label className="settings-field__label" htmlFor="tts-volume">
                      Volume
                    </label>
                    <span className="settings-field__value">{Math.round(ttsVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    id="tts-volume"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ttsVolume}
                    onChange={(e) => updateSetting('ttsVolume', parseFloat(e.target.value))}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        <div className="settings-panel__footer">
          <span className="settings-panel__version">HSRS v1.0</span>
        </div>
      </div>
    </>
  );
}
