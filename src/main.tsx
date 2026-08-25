import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/pwa/usePwaInstall';

// Initialize PWA Service Worker for offline caching & fast start
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
