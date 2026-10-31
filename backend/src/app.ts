import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { prisma } from './config/prisma';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/routes';
import { voterRouter } from './modules/voters/routes';
import { remotePollingRouter } from './modules/remote-polling/routes';
import { electionRouter } from './modules/elections/routes';
import { simulatorRouter } from './modules/simulator/routes';
import { officerRouter } from './modules/officer/routes';
import { adminRouter } from './modules/admin/routes';
import { auditRouter } from './modules/audit/routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // Health is the only route besides login that carries no role middleware.
  app.get('/api/health', async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/voters', voterRouter);
  app.use('/api/remote-polling', remotePollingRouter);
  app.use('/api/admin', electionRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/simulator', simulatorRouter);
  app.use('/api/officer', officerRouter);
  app.use('/api/audit', auditRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
