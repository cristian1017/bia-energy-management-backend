import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { Event } from '../../db/entities/event.entity';
import { Meter } from '../../db/entities/meter.entity';
import { Reading } from '../../db/entities/reading.entity';
import { AiAnalysisService } from './service/ai-analysis.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Meter, Reading, Event, Anomaly]),
  ],
  providers: [AiAnalysisService],
  exports: [AiAnalysisService],
})
export class LlmModule {}
