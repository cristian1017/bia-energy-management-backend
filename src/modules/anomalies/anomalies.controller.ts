import { Controller, Get, Param } from '@nestjs/common';
import { AnomaliesService } from './anomalies.service';
import { Anomaly } from '../../db/entities/anomaly.entity';

@Controller('anomalies')
export class AnomaliesController {
  constructor(private readonly anomaliesService: AnomaliesService) {}

  @Get()
  async getAllAnomalies(): Promise<Anomaly[]> {
    return await this.anomaliesService.findAll();
  }

  @Get(':meterId')
  async getAnomaliesByMeterId(@Param('meterId') meterId: string): Promise<Anomaly[]> {
    return await this.anomaliesService.findByMeterId(meterId);
  }
}