import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import CharacterAvatar from './components/viewer/CharacterAvatar.jsx';
import stylesheetUrl from './styles/index.css?url';

export { CharacterAvatar };

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
