import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('AI Engine')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ejecutar el análisis de IA para detectar anomalías en los medidores',
  })
  @ApiResponse({
    status: 200,
    description:
      'Análisis completado y anomalías persistidas en la base de datos.',
  })
  async analyze(): Promise<{ message: string; anomalies: Anomaly[] }> {
    return await this.aiService.getAnalysis();
  }

  @Get('analysis/:id')
  @ApiOperation({
    summary: 'Consultar el dictamen técnico de la IA para un medidor',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis retornado o estado OK sin anomalías.',
  })
  async getAnalysis(
    @Param('id') id: string,
  ): Promise<Anomaly | { msg: string; status: 'OK' }> {
    return await this.aiService.getAnalysisById(id);
  }
}
