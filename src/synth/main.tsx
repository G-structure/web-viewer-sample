/**
 * Synth Control Plane - Isaac Sim Viewer Entry Point
 *
 * This is a simplified viewer specifically for Synth Control Plane sessions.
 * It reads session connection info from the URL and connects to Isaac Sim.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import SynthViewer from './SynthViewer';

// Minimal global styles
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    background: #0a0a0a;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;

// Inject global styles
const styleSheet = document.createElement('style');
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// Mount the viewer
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SynthViewer />
  </React.StrictMode>
);
