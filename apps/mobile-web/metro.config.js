const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const fs = require('fs');
const path = require('path');

const config = getDefaultConfig(__dirname);

const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    return (req, res, next) => {
      // Serve Service Worker for Mobile & Web Notifications
      if (req.url === '/sw.js' || (req.url && req.url.startsWith('/sw.js?'))) {
        const swPath = path.join(__dirname, 'public', 'sw.js');
        if (fs.existsSync(swPath)) {
          res.writeHead(200, {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Service-Worker-Allowed': '/',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          fs.createReadStream(swPath).pipe(res);
          return;
        }
      }

      // Forward all backend API and uploaded static files to NestJS on port 3000
      if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/uploads'))) {
        const options = {
          hostname: '127.0.0.1',
          port: 3000,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: '127.0.0.1:3000',
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: 'Backend unavailable',
              message: err.message,
            }),
          );
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      if (originalEnhanceMiddleware) {
        return originalEnhanceMiddleware(metroMiddleware, server)(req, res, next);
      }
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
