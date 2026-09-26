import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Meter } from '../../db/entities/meter.entity';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { Reading } from '../../db/entities/reading.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Meter, Anomaly, Reading])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}