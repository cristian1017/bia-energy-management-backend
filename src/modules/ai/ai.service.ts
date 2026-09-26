import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAnalysisService } from '../../provider/llm/service/ai-analysis.service';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { Meter } from '../../db/entities/meter.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly aiAnalysisService: AiAnalysisService,
    @InjectRepository(Anomaly)
    private readonly anomalyRepo: Repository<Anomaly>,
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
  ) {}

  async getAnalysis(): Promise<{ message: string; anomalies: Anomaly[] }> {
    try {
      const anomalies = await this.aiAnalysisService.runAiAnalysis();
      return {
        message: 'Análisis de IA completado y persistido en la base de datos.',
        anomalies,
      };
    } catch (error) {
      this.handleError(error, 'No fue posible completar el análisis de IA.');
    }
  }

  async getAnalysisById(
    meterId: string,
  ): Promise<Anomaly | { msg: string; status: 'OK' }> {
    try {
      const meter = await this.meterRepo.findOne({
        where: { meter_id: meterId },
      });
      if (!meter) {
        throw new NotFoundException(`El medidor '${meterId}' no existe.`);
      }

      const freshAnomalies =
        await this.aiAnalysisService.runAiAnalysisForMeter(meterId);

      if (!freshAnomalies || freshAnomalies.length === 0) {
        return {
          msg: `El medidor '${meterId}' está dentro de parámetros normales. No se detectaron anomalías.`,
          status: 'OK',
        };
      }

      return freshAnomalies[0];
    } catch (error) {
      this.handleError(
        error,
        `No fue posible obtener el dictamen '${meterId}'.`,
      );
    }
  }

  private handleError(error: unknown, message: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
    throw new InternalServerErrorException(message);
  }
}
