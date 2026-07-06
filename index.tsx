
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('Lock broken') || 
    msg.includes('Failed to fetch') || 
    msg.includes('Load failed') ||
    msg.includes('NetworkError') ||
    msg.includes('steal')
  ) {
    event.preventDefault();
  }
});

const isLockOrFetchError = (err: any): boolean => {
  if (!err) return false;
  const msg = typeof err === 'string' 
    ? err 
    : (err.message || err.toString() || '');
  return (
    msg.includes('Lock broken') || 
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('steal') ||
    msg.includes('Load failed')
  );
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Lock broken') || isLockOrFetchError(event.reason)) {
    event.preventDefault();
  }
});

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (args.some(arg => isLockOrFetchError(arg))) return;
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args.some(arg => isLockOrFetchError(arg))) return;
  originalConsoleWarn(...args);
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

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker Registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        console.warn('Service Worker Registration failed:', err);
      });
  });
}
