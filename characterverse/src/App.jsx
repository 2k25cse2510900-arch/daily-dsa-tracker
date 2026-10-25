import React from 'react';
import { StudioProvider } from './context/StudioContext';
import AppLayout from './components/AppLayout';

export default function App({ embedded = false, navigationTarget = null, onPreviewReady = null }) {
  return (
    <StudioProvider navigationTarget={navigationTarget}>
      <AppLayout embedded={embedded} onPreviewReady={onPreviewReady} />
    </StudioProvider>
  );
}
