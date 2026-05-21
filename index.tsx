
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Lock broken')) {
    event.preventDefault();
  }
});

const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Lock broken')) return;
  if (args[0] instanceof Error && args[0].message.includes('Lock broken')) return;
  originalConsoleError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
