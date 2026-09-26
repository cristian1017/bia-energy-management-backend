import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { Event } from '../../db/entities/event.entity';
import { Meter } from '../../db/entities/meter.entity';
import { Reading } from '../../db/entities/reading.entity';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { AiService } from './ai.service';
import { AiAnalysisService } from '../../provider/llm/service/ai-analysis.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Meter, Reading, Event, Anomaly]),
  ],
  controllers: [AiController],
  providers: [AiService, AiAnalysisService],
  exports: [AiService],
})
export class AiModule {}
