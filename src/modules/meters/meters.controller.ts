import { Controller, Get, Param } from '@nestjs/common';
import { MetersService } from './meters.service';
import { Meter } from '../../db/entities/meter.entity';
import { Reading } from '../../db/entities/reading.entity';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get()
  async getAllMeters(): Promise<Meter[]> {
    return await this.metersService.findAll();
  }

  @Get(':meterId')
  async getMeterById(@Param('meterId') meterId: string): Promise<Meter> {
    return await this.metersService.findOne(meterId);
  }

  @Get(':meterId/readings')
  async getMeterReadings(@Param('meterId') meterId: string): Promise<Reading[]> {
    return await this.metersService.findReadingsByMeter(meterId);
  }
}
