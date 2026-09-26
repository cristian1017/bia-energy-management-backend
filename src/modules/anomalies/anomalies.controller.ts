import { Controller, Get, Param } from '@nestjs/common';
import { AnomaliesService } from './anomalies.service';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Anomalies')
@Controller('anomalies')
export class AnomaliesController {
  constructor(private readonly anomaliesService: AnomaliesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener la lista completa de anomalías' })
  @ApiResponse({
    status: 200,
    description: 'Lista de anomalías detectadas.',
  })
  async getAllAnomalies(): Promise<Anomaly[]> {
    return await this.anomaliesService.findAll();
  }

  @Get(':meterId')
  @ApiOperation({ summary: 'Obtener anomalías por ID de medidor' })
  @ApiResponse({
    status: 200,
    description: 'Lista de anomalías para el medidor especificado.',
  })
  async getAnomaliesByMeterId(
    @Param('meterId') meterId: string,
  ): Promise<Anomaly[]> {
    return await this.anomaliesService.findByMeterId(meterId);
  }
}
