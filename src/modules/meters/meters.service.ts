import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Meter } from '../../db/entities/meter.entity';
import { Reading } from '../../db/entities/reading.entity';

@Injectable()
export class MetersService extends BaseService {
  constructor(
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    @InjectRepository(Reading)
    private readonly readingRepo: Repository<Reading>,
  ) {
    super(MetersService.name);
  }

  async findAll(): Promise<Meter[]> {
    try {
      return await this.meterRepo.find({
        order: { meter_id: 'ASC' },
      });
    } catch (error) {
      this.handleError(error, 'No fue posible obtener los medidores.');
    }
  }

  async findOne(meterId: string): Promise<Meter> {
    try {
      const meter = await this.meterRepo.findOne({
        where: { meter_id: meterId },
      });

      if (!meter) {
        throw new NotFoundException(
          `El medidor con ID '${meterId}' no fue encontrado.`,
        );
      }

      return meter;
    } catch (error) {
      this.handleError(error, `No fue posible obtener el medidor '${meterId}'.`);
    }
  }

  async findReadingsByMeter(meterId: string): Promise<Reading[]> {
    try {
      await this.findOne(meterId);

      return await this.readingRepo.find({
        where: { meter_id: meterId },
        order: { timestamp: 'ASC' },
      });
    } catch (error) {
      this.handleError(
        error,
        `No fue posible obtener las lecturas del medidor '${meterId}'.`,
      );
    }
  }
}