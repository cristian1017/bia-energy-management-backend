import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

import { Meter } from './db/entities/meter.entity';
import { Reading } from './db/entities/reading.entity';
import { Event } from './db/entities/event.entity';
import { Anomaly } from './db/entities/anomaly.entity';
import { SeedService } from './db/seed/seed.service';
import { LlmModule } from './provider/llm/llm.module';
import { MetersModule } from './modules/meters/meters.module';
import { AnomaliesModule } from './modules/anomalies/anomalies.module';
import { AiModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppController } from './app.controller';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgrespassword'),
        database: configService.get<string>('DB_NAME', 'energy_db'),
        entities: [Meter, Reading, Event, Anomaly],
        synchronize: true, // Crea automáticamente las tablas en desarrollo
      }),
    }),
    TypeOrmModule.forFeature([Meter, Reading, Event, Anomaly]),
    LlmModule,
    MetersModule,
    AnomaliesModule,
    AiModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
