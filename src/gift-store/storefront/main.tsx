import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted font (bundled, no CDN) — keeps the demo fully offline.
import '@fontsource/sen/400.css';
import '@fontsource/sen/600.css';
import '@fontsource/sen/700.css';
import '@fontsource/sen/800.css';
import './shell/index.css';
import { App } from './shell/App';
import {
  UnleashToolbarProvider,
  toolbarEnabled,
  toolbarOptions,
  unleashConfig,
} from './support/feature-flags';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root was not found');
}

// When the toolbar starts disabled, hide its floating launcher icon too (see index.css) so nothing
// shows until it's revealed from the console.
if (!toolbarEnabled) {
  document.body.classList.add('unleash-toolbar-disabled');
}

createRoot(rootElement).render(
  <StrictMode>
    <UnleashToolbarProvider config={unleashConfig} toolbarOptions={toolbarOptions}>
      <App />
    </UnleashToolbarProvider>
  </StrictMode>,
);

// The toolbar package exposes its instance as `window.unleashToolbar` once mounted, so it can be
// summoned from the console even when it starts hidden (the default — see toolbarOptions).
console.info(
  'Unleash Toolbar is hidden by default. Run window.unleashToolbar.show() in this console to reveal it.',
);
