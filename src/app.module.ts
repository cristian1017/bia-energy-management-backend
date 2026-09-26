import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from './db/database.module';
import { Anomaly } from './db/entities/anomaly.entity';
import { Event } from './db/entities/event.entity';
import { Meter } from './db/entities/meter.entity';
import { Reading } from './db/entities/reading.entity';
import { SeedService } from './db/seed/seed.service';
import { LlmModule } from './provider/llm/llm.module';
import { MetersModule } from './modules/meters/meters.module';
import { AnomaliesModule } from './modules/anomalies/anomalies.module';
import { AiModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Meter, Reading, Event, Anomaly]),
    LlmModule,
    MetersModule,
    AnomaliesModule,
    AiModule,
    DashboardModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
