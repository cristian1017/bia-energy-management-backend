import { Controller, Get, Param } from '@nestjs/common';
import { MetersService } from './meters.service';
import { Meter } from '../../db/entities/meter.entity';
import { Reading } from '../../db/entities/reading.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Meters')
@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener la lista completa de medidores' })
  @ApiResponse({
    status: 200,
    description: 'Lista de medidores activos y su estado.',
  })
  async getAllMeters(): Promise<Meter[]> {
    return await this.metersService.findAll();
  }

  @Get(':meterId')
  @ApiOperation({ summary: 'Obtener información de un medidor por su ID' })
  @ApiResponse({
    status: 200,
    description: 'Información del medidor solicitado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Medidor no encontrado.',
  })
  async getMeterById(@Param('meterId') meterId: string): Promise<Meter> {
    return await this.metersService.findOne(meterId);
  }

  @Get(':meterId/readings')
  @ApiOperation({ summary: 'Obtener las lecturas de un medidor específico' })
  @ApiResponse({
    status: 200,
    description: 'Lista de lecturas del medidor solicitado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Medidor no encontrado.',
  })
  async getMeterReadings(
    @Param('meterId') meterId: string,
  ): Promise<Reading[]> {
    return await this.metersService.findReadingsByMeter(meterId);
  }
}
