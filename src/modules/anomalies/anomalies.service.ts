import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Anomaly } from '../../db/entities/anomaly.entity';

@Injectable()
export class AnomaliesService extends BaseService {
  constructor(
    @InjectRepository(Anomaly)
    private readonly anomalyRepo: Repository<Anomaly>,
  ) {
    super(AnomaliesService.name);
  }

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
      this.handleError(
        error,
        `No fue posible obtener las anomalías para el medidor '${meterId}'.`,
      );
    }
  }
}