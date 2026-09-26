import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';


@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  
  @Get('summary')
  @ApiOperation({ summary: 'Obtener el resumen del tablero' })
  @ApiResponse({
    status: 200,
    description: 'Resumen del tablero retornado.',
  })
  async getSummary() {
    return await this.dashboardService.getSummary();
  }
}