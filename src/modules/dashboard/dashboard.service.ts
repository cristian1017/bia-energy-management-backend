import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meter } from '../../db/entities/meter.entity';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { Reading } from '../../db/entities/reading.entity';


@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    @InjectRepository(Anomaly)
    private readonly anomalyRepo: Repository<Anomaly>,
    @InjectRepository(Reading)
    private readonly readingRepo: Repository<Reading>,
  ) {}

  async getSummary() {
    // 1. Total de medidores
    const totalMeters = await this.meterRepo.count();

    // 2. Consumo total acumulado del periodo
    const totalConsumptionRaw = await this.readingRepo
      .createQueryBuilder('reading')
      .select('SUM(reading.consumption_kwh)', 'total_kwh')
      .getRawOne();

    const totalConsumptionKwh = Number(
      parseFloat(totalConsumptionRaw?.total_kwh || '0').toFixed(2),
    );

    // 3. Conteo total de anomalías detectadas por IA
    const totalAnomalies = await this.anomalyRepo.count();

    // 4. Conteo de anomalías de Alta Prioridad (HIGH)
    const highPriorityAnomalies = await this.anomalyRepo.count({
      where: { severity: 'HIGH' },
    });

    // 5. Confianza de IA: Métrica agregada (Promedio de confianza %)
    const avgConfidenceRaw = await this.anomalyRepo
      .createQueryBuilder('anomaly')
      .select('AVG(anomaly.confidence)', 'avg_confidence')
      .getRawOne();

    const aiAvgConfidencePct = avgConfidenceRaw?.avg_confidence
      ? Number((parseFloat(avgConfidenceRaw.avg_confidence) * 100).toFixed(1))
      : 0;

    // 6. Último análisis: Fecha/hora del análisis más reciente (Fix TypeORM)
    const latestAnomalies = await this.anomalyRepo.find({
      order: { detected_at: 'DESC' },
      take: 1,
    });

    const lastAnalysisDate = latestAnomalies.length > 0 ? latestAnomalies[0].detected_at : null;

    // Desglose auxiliar de medidores por estado
    const metersByStatus = await this.meterRepo
      .createQueryBuilder('meter')
      .select('meter.status', 'status')
      .addSelect('COUNT(meter.id)', 'count')
      .groupBy('meter.status')
      .getRawMany();

    // Desglose auxiliar de anomalías por severidad
    const anomaliesBySeverity = await this.anomalyRepo
      .createQueryBuilder('anomaly')
      .select('anomaly.severity', 'severity')
      .addSelect('COUNT(anomaly.id)', 'count')
      .groupBy('anomaly.severity')
      .getRawMany();

    // Estructura de respuesta alineada al KPI del documento
    return {
      kpis: {
        meters_count: totalMeters,
        total_period_consumption_kwh: totalConsumptionKwh,
        ai_anomalies_detected: totalAnomalies,
        high_priority_anomalies: highPriorityAnomalies,
        ai_confidence_avg_pct: aiAvgConfidencePct,
        last_analysis: {
          timestamp: lastAnalysisDate,
          status: totalAnomalies > 0 ? 'COMPLETED' : 'NO_DATA',
        },
      },
      meters_by_status: metersByStatus.reduce((acc, curr) => {
        acc[curr.status] = Number(curr.count);
        return acc;
      }, {}),
      anomalies_by_severity: anomaliesBySeverity.reduce((acc, curr) => {
        acc[curr.severity] = Number(curr.count);
        return acc;
      }, {}),
    };
  }
}