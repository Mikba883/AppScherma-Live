import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryProvider } from './providers/QueryProvider'

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <App />
  </QueryProvider>
);
