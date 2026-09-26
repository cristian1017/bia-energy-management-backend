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

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(): Promise<{ message: string; anomalies: Anomaly[] }> {
    return await this.aiService.getAnalysis();
  }

  @Get('analysis/:id')
  async getAnalysis(
    @Param('id') id: string,
  ): Promise<Anomaly | { msg: string; status: 'OK' }> {
    return await this.aiService.getAnalysisById(id);
  }
}
