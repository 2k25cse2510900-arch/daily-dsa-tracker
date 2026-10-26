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
