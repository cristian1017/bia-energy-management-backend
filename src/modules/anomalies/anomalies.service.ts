import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Anomaly } from '../../db/entities/anomaly.entity';

@Injectable()
export class AnomaliesService {
  private readonly logger = new Logger(AnomaliesService.name);

  constructor(
    @InjectRepository(Anomaly)
    private readonly anomalyRepo: Repository<Anomaly>,
  ) {}

  async findAll(): Promise<Anomaly[]> {
    try {
      return await this.anomalyRepo.find({
        order: { detected_at: 'DESC' },
      });
    } catch (error) {
      this.handleError(error, 'No fue posible obtener las anomalías.');
    }
  }

  async findByMeterId(meterId: string): Promise<Anomaly[]> {
    try {
     const anomalies = await this.anomalyRepo.find({
      where: { meter_id: meterId },
      order: { detected_at: 'DESC' },
    });

    if (!anomalies || anomalies.length === 0) {
      throw new NotFoundException(
        `No se encontraron anomalías registradas para el medidor '${meterId}'.`,
      );
    }

    return anomalies;
    } catch (error) {
      this.handleError(error, `No fue posible obtener las anomalías para el medidor '${meterId}'.`);
    }
  }

  private handleError(error: unknown, message: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    this.logger.error(message, error instanceof Error ? error.stack : String(error));
    throw new InternalServerErrorException(message);
  }
}