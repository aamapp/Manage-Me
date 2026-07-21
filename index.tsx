
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
  // Print stack trace for any error objects in the arguments
  args.forEach(arg => {
    if (arg && arg.stack) {
      originalConsoleError("ERROR STACK TRACE:", arg.stack);
    } else if (arg instanceof Error) {
      originalConsoleError("ERROR OBJECT:", arg.message, arg.stack);
    }
  });
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args.some(arg => isLockOrFetchError(arg))) return;
  originalConsoleWarn(...args);
};

window.addEventListener('error', (event) => {
  if (event.error) {
    originalConsoleError("UNHANDLED ERROR STACK:", event.error.stack);
  } else {
    originalConsoleError("UNHANDLED ERROR:", event.message, "at", event.filename, ":", event.lineno);
  }
});

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
  const hostname = window.location.hostname;
  const isDevOrPreview = 
    (import.meta as any).env?.DEV || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.includes('-dev-') || 
    hostname.includes('-pre-') ||
    hostname.includes('run.app');

  if (isDevOrPreview) {
    // In development mode, unregister any active service worker and clear caches to avoid stale caching issues in the preview
    navigator.serviceWorker.getRegistrations().then(registrations => {
      let unregisteredAny = false;
      const promises = registrations.map(registration => 
        registration.unregister().then(success => {
          if (success) {
            unregisteredAny = true;
          }
        })
      );
      Promise.all(promises).then(() => {
        if (unregisteredAny) {
          console.log('Unregistered active service worker(s) in development mode.');
          if (window.caches) {
            caches.keys().then(names => {
              Promise.all(names.map(name => caches.delete(name)));
            });
          }
        }
      });
    });
  } else {
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
}
