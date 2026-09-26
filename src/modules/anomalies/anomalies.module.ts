import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { AnomaliesController } from './anomalies.controller';
import { AnomaliesService } from './anomalies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Anomaly])],
  controllers: [AnomaliesController],
  providers: [AnomaliesService],
  exports: [AnomaliesService],
})
export class AnomaliesModule {}