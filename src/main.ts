import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle(
      'Bia Energy API — Prueba técnica gestión de telemetría eléctrica y análisis de anomalías con IA',
    )
    .setDescription(
      'Documentación interactiva para el sistema de telemetría eléctrica, métricas de Baseline/Variación y análisis de anomalías mediante el motor de IA.',
    )
    .setVersion('1.0')
    .addTag(
      'AI Engine',
      'Evaluación e inferencia con Inteligencia Artificial (Gemini)',
    )
    .addTag('Anomalies', 'Monitoreo y reporte de fallas')
    .addTag('Dashboard', 'KPIs y métricas consolidadas de planta')
    .addTag('Meters', 'Gestión e información técnica de medidores')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // La documentación quedará accesible en /api/docs
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
