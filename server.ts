import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = 3000;

  // Resolve directory of the frontend application
  const appDir = fs.existsSync(path.resolve(process.cwd(), 'minhas-economias-work', 'index.html'))
    ? path.resolve(process.cwd(), 'minhas-economias-work')
    : fs.existsSync(path.resolve(__dirname, 'index.html'))
    ? __dirname
    : process.cwd();

  const configFile = path.resolve(appDir, 'vite.config.ts');

  if (process.env.NODE_ENV === 'production') {
    const distDir = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'))
      ? path.resolve(process.cwd(), 'dist')
      : path.resolve(appDir, 'dist');

    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: appDir,
      configFile: fs.existsSync(configFile) ? configFile : undefined,
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    // Ensure SPA fallback serves transformed index.html
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(appDir, 'index.html');
        if (!fs.existsSync(indexPath)) {
          return next();
        }
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
