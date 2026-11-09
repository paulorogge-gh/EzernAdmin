import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { surface } from './config/httpSurface.js';
import { connectDb } from './db/index.js';
import { syncModels } from './models/index.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { partiesRouter } from './routes/parties.js';
import { financeRouter } from './routes/finance.js';
import { billingRouter, billingWebhookRouter } from './routes/billing.js';
import { filesRouter } from './routes/files.js';
import { lookupsRouter } from './routes/lookups.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiGeneralLimiter } from './middleware/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveCorsOrigin() {
  if (!env.isProd) return env.appBaseUrl;
  if (env.serveWeb) return false;
  if (env.corsOrigins.length) return env.corsOrigins;
  return false;
}

function isLocalRequest(req) {
  const ip = String(req.ip || '');
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

async function main() {
  await connectDb();
  await syncModels();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: env.serveWeb
        ? {
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              scriptSrc: ["'self'"],
              connectSrc: ["'self'", env.apiBaseUrl, env.appBaseUrl],
              formAction: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
      hsts: env.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
    }),
  );

  app.use(
    cors({
      origin: resolveCorsOrigin(),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(surface.root, apiGeneralLimiter);

  // Caminhos legados explícitos: resposta genérica (sem revelar a nova superfície).
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { message: 'Rota não encontrada' } });
  });

  app.get(surface.health, (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  app.get(`${surface.health}/r`, async (req, res, next) => {
    try {
      const token = String(req.get('x-health-token') || '');
      const allowed =
        isLocalRequest(req) ||
        (env.healthReadyToken && token && token === env.healthReadyToken);
      if (!allowed) {
        return res.status(404).json({ error: { message: 'Rota não encontrada' } });
      }
      await connectDb();
      return res.json({ data: { status: 'ok' } });
    } catch (err) {
      return next(err);
    }
  });

  app.use(surface.auth, authRouter);
  app.use(surface.members, usersRouter);
  app.use(surface.parties, partiesRouter);
  app.use(surface.finance, financeRouter);
  app.use(surface.billing, billingRouter);
  app.use(surface.hooks, billingWebhookRouter);
  app.use(surface.query, lookupsRouter);
  app.use(surface.blob, filesRouter);

  if (env.serveWeb) {
    const webDist = path.resolve(__dirname, '../../frontend/dist');
    app.use(
      express.static(webDist, {
        setHeaders(res) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Referrer-Policy', 'no-referrer');
        },
      }),
    );
    app.use((req, res, next) => {
      if (req.path === surface.root || req.path.startsWith(`${surface.root}/`)) return next();
      return res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
