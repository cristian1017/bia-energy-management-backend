
import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any;
const loadModule = new Function(
  'modulePath',
  'return import(modulePath);',
) as (modulePath: string) => Promise<any>;

async function bootstrap() {
  if (!app) {
    const { NestFactory } = await loadModule('@nestjs/core');
    const { ExpressAdapter } = await loadModule('@nestjs/platform-express');
    const express = (await loadModule('express')).default;
    const { AppModule } = await loadModule('../dist/app.module.js');

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