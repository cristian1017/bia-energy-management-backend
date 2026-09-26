import type { Request, Response } from 'express';
import { createApp } from '../dist/main.js';

let expressApp: Promise<any> | undefined;

async function getExpressApp() {
  if (!expressApp) {
    expressApp = (async () => {
      const nestApp = await createApp();
      await nestApp.init();
      return nestApp.getHttpAdapter().getInstance();
    })();
  }

  return expressApp;
}

export default async function handler(request: Request, response: Response) {
  const app = await getExpressApp();
  return app(request, response);
}