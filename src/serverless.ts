import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import app from './app.js';
import { connectDatabase } from './database/connection.js';

let databaseConnection: Promise<void> | undefined;

async function ensureDatabaseConnection(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  databaseConnection ??= connectDatabase().catch((error) => {
    databaseConnection = undefined;
    throw error;
  });

  await databaseConnection;
}

export default async function serverlessHandler(request: Request, response: Response): Promise<void> {
  const requestPath = request.path || request.url;
  const isDatabaseIndependentRequest =
    request.method === 'OPTIONS' ||
    requestPath === '/' ||
    requestPath === '/api' ||
    requestPath === '/api/' ||
    requestPath === '/api/health';

  if (!isDatabaseIndependentRequest) {
    try {
      await ensureDatabaseConnection();
    } catch (error) {
      console.error('[vikral-api] Database connection failed:', error instanceof Error ? error.message : error);
      response.status(503).json({
        error: 'Database unavailable',
      });
      return;
    }
  }

  app(request, response);
}
