import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import CharacterAvatar from './components/viewer/CharacterAvatar.jsx';
import RaceArena from './components/arena/RaceArena.jsx';
import stylesheetUrl from './styles/index.css?url';

export { CharacterAvatar, RaceArena };

export function mountCharacterVerse(host) {
  if (!(host instanceof HTMLElement)) throw new Error('A CharacterVerse mount element is required.');
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = stylesheetUrl;
  const mount = document.createElement('div');
  mount.className = 'characterverse-embed-root';
  shadow.replaceChildren(stylesheet, mount);

  const root = createRoot(mount);
  root.render(
    <React.StrictMode>
      <App
        embedded
        navigationTarget={host}
        onPreviewReady={() => host.dispatchEvent(new CustomEvent('characterverse-preview-ready'))}
      />
    </React.StrictMode>,
  );

  return {
    navigate(tab) {
      host.dispatchEvent(new CustomEvent('characterverse-tab', { detail: { tab } }));
    },
    unmount() {
      root.unmount();
      shadow.replaceChildren();
    },
  };
}

export function mountCharacterAvatar(host, options = {}) {
  if (!(host instanceof HTMLElement)) throw new Error('A CharacterAvatar mount element is required.');
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = stylesheetUrl;

  const styleOverride = document.createElement('style');
  styleOverride.textContent = `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      border-radius: inherit;
    }
    .character-avatar-host {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-radius: inherit;
      overflow: hidden;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
      outline: none;
    }
  `;

  const mount = document.createElement('div');
  mount.className = 'character-avatar-host';
  shadow.replaceChildren(stylesheet, styleOverride, mount);

  const root = createRoot(mount);
  root.render(
    <React.StrictMode>
      <CharacterAvatar
        appearance={options.appearance || null}
        autoRotate={options.autoRotate ?? false}
        profilePreview={options.profilePreview ?? false}
        onReady={() => {
          host.dispatchEvent(new CustomEvent('character-avatar-ready', { bubbles: true, composed: true }));
          options.onReady?.();
        }}
        onError={(err) => {
          host.dispatchEvent(new CustomEvent('character-avatar-error', { detail: { error: err?.message || 'Avatar error' }, bubbles: true, composed: true }));
          options.onError?.(err);
        }}
      />
    </React.StrictMode>,
  );

  return {
    unmount() {
      root.unmount();
      shadow.replaceChildren();
    },
  };
}

function RaceArenaContainer({ initialOptions, controllerRef }) {
  const [arenaState, setArenaState] = useState(initialOptions.arenaState || null);
  const [cameraMode, setCameraMode] = useState(initialOptions.cameraMode || 'leader');
  const [reducedMotion, setReducedMotion] = useState(initialOptions.reducedMotion || false);
  const [focusedMemberId, setFocusedMemberId] = useState(initialOptions.focusedMemberId || null);
  const arenaRef = useRef();

  controllerRef.current = {
    update: (nextState) => setArenaState(nextState),
    setCameraMode: (mode) => setCameraMode(mode),
    setReducedMotion: (val) => setReducedMotion(!!val),
    focusMember: (id) => {
      setFocusedMemberId(id);
      arenaRef.current?.focusMember(id);
    },
    zoomIn: () => arenaRef.current?.zoomIn(),
    zoomOut: () => arenaRef.current?.zoomOut(),
    resetView: () => arenaRef.current?.resetView(),
  };

  return (
    <RaceArena
      ref={arenaRef}
      arenaState={arenaState}
      cameraMode={cameraMode}
      reducedMotion={reducedMotion}
      focusedMemberId={focusedMemberId}
      onFocusMember={(id) => {
        setFocusedMemberId(id);
        arenaRef.current?.focusMember(id);
        initialOptions.onFocusMember?.(id);
      }}
      onError={initialOptions.onError}
    />
  );
}

export function mountRaceArena(host, options = {}) {
  if (!(host instanceof HTMLElement)) throw new Error('A RaceArena mount element is required.');
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = stylesheetUrl;

  const styleOverride = document.createElement('style');
  styleOverride.textContent = `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      border-radius: inherit;
    }
    .race-arena-host, .race-arena-root {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      border-radius: inherit;
      background: #7dd3fc;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
      outline: none;
    }
    .arena-fallback-container {
      padding: 1.5rem;
      color: #f8fafc;
      background: #0f172a;
      height: 100%;
      overflow-y: auto;
      font-family: inherit;
    }
    .arena-fallback-header h4 {
      margin: 0 0 0.25rem 0;
      color: #38bdf8;
    }
    .arena-fallback-header p {
      margin: 0 0 1rem 0;
      color: #94a3b8;
      font-size: 0.9rem;
    }
    .arena-fallback-track {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .arena-fallback-lane {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
    }
    .lane-badge {
      font-weight: 700;
      width: 2rem;
      color: #f59e0b;
    }
    .lane-info {
      width: 140px;
    }
    .lane-name {
      display: block;
      font-weight: 600;
      color: #f1f5f9;
    }
    .lane-score {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .lane-bar-track {
      flex: 1;
      height: 14px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 7px;
      overflow: hidden;
    }
    .lane-bar-fill {
      height: 100%;
      background: #38bdf8;
      border-radius: 7px;
      transition: width 0.4s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 2px;
    }
    .lane-bar-fill.rank-1 { background: #f59e0b; }
    .lane-bar-fill.rank-2 { background: #38bdf8; }
    .lane-bar-fill.rank-3 { background: #ec4899; }
    .lane-avatar-icon { font-size: 10px; }
    .lane-percent {
      width: 3.5rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      color: #38bdf8;
    }

    /* ── Racing Minimap Circuit Bar ── */
    .arena-minimap-container {
      position: absolute;
      bottom: 12px;
      left: 14px;
      right: 14px;
      padding: 7px 14px 9px;
      background: rgba(15, 23, 42, 0.82);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 10;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .minimap-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .minimap-title {
      color: #f8fafc;
      text-transform: uppercase;
    }
    .minimap-milestone {
      color: #fef08a;
      font-size: 10px;
    }
    .minimap-track-rail {
      position: relative;
      width: 100%;
      height: 18px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 9px;
      display: flex;
      align-items: center;
    }
    .minimap-track-progress-line {
      position: absolute;
      left: 0;
      top: 50%;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, rgba(56, 189, 248, 0.35), rgba(245, 158, 11, 0.65));
      transform: translateY(-50%);
    }
    .minimap-pin {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      z-index: 2;
    }
    .minimap-pin:hover {
      transform: translate(-50%, -50%) scale(1.35);
      z-index: 10;
    }
    .minimap-pin.focused {
      transform: translate(-50%, -50%) scale(1.4);
      box-shadow: 0 0 0 3px #fde047, 0 4px 12px rgba(250, 204, 21, 0.6);
      z-index: 5;
    }
    .minimap-pin.rank-1 {
      background: linear-gradient(135deg, #f59e0b, #b45309);
      border-color: #fef08a;
    }
    .minimap-pin.rank-2 {
      background: linear-gradient(135deg, #38bdf8, #0369a1);
      border-color: #e0f2fe;
    }
    .minimap-pin.rank-3 {
      background: linear-gradient(135deg, #ec4899, #a855f7);
      border-color: #fbcfe8;
    }
    .minimap-pin.rank-other {
      background: #334155;
      border-color: #94a3b8;
    }
    .minimap-crown { font-size: 11px; line-height: 1; }
    .minimap-num { line-height: 1; }
    .minimap-track-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 9px;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.02em;
    }

    /* ── Arena Vehicle Telemetry HUD (Phase 2 Store Vehicle Integration) ── */
    .arena-vehicle-telemetry-hud {
      position: absolute;
      top: 14px;
      right: 14px;
      min-width: 210px;
      max-width: 250px;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      z-index: 10;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
    }
    .telemetry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .telemetry-racer-info {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .telemetry-rank-pill {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      background: #f59e0b;
      color: #0f172a;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .telemetry-racer-name {
      font-size: 11.5px;
      font-weight: 700;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .telemetry-lane-tag {
      font-size: 9.5px;
      color: #94a3b8;
      font-weight: 600;
    }
    .telemetry-vehicle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 4px 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }
    .telemetry-vehicle-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 6px;
      border: 1px solid;
      border-radius: 5px;
      text-transform: uppercase;
    }
    .telemetry-rarity-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }
    .telemetry-vehicle-name {
      font-size: 11px;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .telemetry-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-bottom: 8px;
      padding: 6px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 8px;
    }
    .telemetry-stat-cell {
      display: flex;
      flex-direction: column;
    }
    .telemetry-stat-label {
      font-size: 8.5px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
    }
    .telemetry-stat-value {
      font-size: 11.5px;
      font-weight: 800;
      color: #f8fafc;
      font-variant-numeric: tabular-nums;
    }
    .telemetry-stat-value.speed-highlight {
      color: #38bdf8;
    }
    .telemetry-stat-value.trail-status {
      font-size: 9.5px;
      color: #fbbf24;
    }
    .telemetry-unit {
      font-size: 8.5px;
      font-weight: 600;
      color: #94a3b8;
    }
    .telemetry-academic-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 10px;
    }
    .academic-label {
      color: #94a3b8;
      font-weight: 600;
    }
    .academic-value {
      color: #4ade80;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  `;

  const mount = document.createElement('div');
  mount.className = 'race-arena-host';
  shadow.replaceChildren(stylesheet, styleOverride, mount);

  const controllerRef = { current: null };
  const root = createRoot(mount);

  root.render(
    <React.StrictMode>
      <RaceArenaContainer initialOptions={options} controllerRef={controllerRef} />
    </React.StrictMode>
  );

  return {
    update(nextArenaState) {
      controllerRef.current?.update(nextArenaState);
    },
    setCameraMode(mode) {
      controllerRef.current?.setCameraMode(mode);
    },
    setReducedMotion(bool) {
      controllerRef.current?.setReducedMotion(bool);
    },
    focusMember(memberId) {
      controllerRef.current?.focusMember(memberId);
    },
    zoomIn() {
      controllerRef.current?.zoomIn();
    },
    zoomOut() {
      controllerRef.current?.zoomOut();
    },
    resetView() {
      controllerRef.current?.resetView();
    },
    unmount() {
      root.unmount();
      shadow.replaceChildren();
    },
  };
}
