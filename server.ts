import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const SHEET_CSV_URL = process.env.SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT || 3000;

  // Security headers for API responses. This endpoint still requires deployment-level
  // access control if the spreadsheet contains private data; do not treat it as private.
  app.disable('x-powered-by');
  app.get('/api/sheet-csv', async (_req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${SHEET_CSV_URL}${SHEET_CSV_URL.includes('?') ? '&' : '?'}_=${Date.now()}`, {
        signal: controller.signal,
        headers: { Accept: 'text/csv,text/plain;q=0.9' },
        cache: 'no-store',
        redirect: 'error',
      });
      if (!response.ok) {
        return res.status(502).send('Não foi possível carregar a planilha de origem.');
      }
      const text = await response.text();
      if (text.length > 5_000_000) {
        return res.status(502).send('A resposta da planilha excede o limite permitido.');
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.send(text);
    } catch (err: any) {
      console.error('Erro ao buscar planilha:', err);
      res.status(err?.name === 'AbortError' ? 504 : 502).send(
        err?.name === 'AbortError' ? 'Tempo limite ao buscar a planilha.' : 'Erro ao consultar a planilha de origem.'
      );
    } finally {
      clearTimeout(timeout);
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
