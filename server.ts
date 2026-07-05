import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes/api';
import { initializeFirebaseAdmin } from './server/config/firebase';
import { startBackgroundOrderSync } from './server/config/orderSync';
import { SyncScheduler } from './server/config/syncEngine';
import { secureHeaders, sanitizeInputs, rateLimit } from './server/middleware/security';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin SDK
  initializeFirebaseAdmin();

  // Start background SMM Order Poller and Synchronizer
  startBackgroundOrderSync(60000); // Poll every 60 seconds
  
  // Start automatic sync scheduling engine for SMM services & provider health
  SyncScheduler.startScheduler();

  // Basic server middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply enterprise-grade security middlewares
  app.use(secureHeaders);
  app.use(sanitizeInputs);
  app.use('/api', rateLimit('api'));

  // Mount SMM panel REST APIs first
  app.use('/api', apiRouter);

  // Serve Frontend depending on environment
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running Express in Development mode (with Vite middleware)');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running Express in Production mode (serving static bundle)');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Serve index.html for all non-API paths (SPA routing fallback)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ZENIT SMM Panel server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Fatal error starting ZENIT SMM server:', error);
});
