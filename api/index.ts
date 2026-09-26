
import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any;

async function bootstrap() {
  if (!app) {
    const { NestFactory } = await import('@nestjs/core');
    const { ExpressAdapter } = await import('@nestjs/platform-express');
    const express = (await import('express')).default;
    const { AppModule } = await import('../src/app.module');

    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn'] }
    );

    nestApp.enableCors();
    await nestApp.init();
    app = expressApp;
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressInstance = await bootstrap();
  return expressInstance(req, res);
}