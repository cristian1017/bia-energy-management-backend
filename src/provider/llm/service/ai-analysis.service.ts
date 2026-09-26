import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { Meter } from '../../../db/entities/meter.entity';
import { Reading } from '../../../db/entities/reading.entity';
import { Event } from '../../../db/entities/event.entity';
import { Anomaly } from '../../../db/entities/anomaly.entity';


@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor(
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    @InjectRepository(Reading)
    private readonly readingRepo: Repository<Reading>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Anomaly)
    private readonly anomalyRepo: Repository<Anomaly>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Ejecuta el análisis de IA para TODOS los medidores con comportamiento sospechoso.
   */
  async runAiAnalysis(): Promise<Anomaly[]> {
    const apiKey = this.getApiKey();

    const meters = await this.meterRepo.find();
    const suspectMetersData = [];

    for (const meter of meters) {
      const suspectData = await this.extractSuspectDataForMeter(meter.meter_id);
      if (suspectData) {
        suspectMetersData.push(suspectData);
      }
    }

    if (suspectMetersData.length === 0) {
      this.logger.log('No se detectaron medidores con datos sospechosos.');
      return [];
    }

    const aiResults = await this.callGeminiSdkWithFallback(apiKey, suspectMetersData);

    // Limpiamos anomalías anteriores para refrescar el análisis global
    await this.anomalyRepo.clear();

    return await this.saveAnomaliesAndStatus(aiResults);
  }

  /**
   * Ejecuta el análisis de IA EN TIEMPO REAL para un medidor individual (meter_id).
   */
  async runAiAnalysisForMeter(meterId: string): Promise<Anomaly[]> {
    const apiKey = this.getApiKey();

    const suspectData = await this.extractSuspectDataForMeter(meterId);

    if (!suspectData) {
      this.logger.log(`El medidor '${meterId}' no presenta lecturas sospechosas.`);
      return [];
    }

    const aiResults = await this.callGeminiSdkWithFallback(apiKey, [suspectData]);

    return await this.saveAnomaliesAndStatus(aiResults);
  }

  /**
   * Extrae la evidencia técnica de un medidor (Filtro Local / Capa 1).
   */
  private async extractSuspectDataForMeter(meterId: string): Promise<any | null> {
    const readings = await this.readingRepo.find({
      where: { meter_id: meterId },
      order: { timestamp: 'ASC' },
    });

    if (!readings || readings.length === 0) return null;

    const consumptions = readings.map((r) => r.consumption_kwh);
    const avgConsumption =
      consumptions.reduce((acc, val) => acc + val, 0) / consumptions.length;
    const maxConsumption = Math.max(...consumptions);
    const minConsumption = Math.min(...consumptions);

    // Filtro local: Desviaciones de consumo (+40% / -60%), voltaje (<180V / >250V) o PF (<0.7)
    const suspiciousReadings = readings.filter(
      (r) =>
        r.consumption_kwh > avgConsumption * 1.4 ||
        r.consumption_kwh < avgConsumption * 0.4 ||
        r.voltage_v < 180 ||
        r.voltage_v > 250 ||
        r.power_factor < 0.7,
    );

    if (suspiciousReadings.length === 0) return null;

    const events = await this.eventRepo.find({
      where: { meter_id: meterId },
    });

    return {
      meter_id: meterId,
      baseline_avg_kwh: Number(avgConsumption.toFixed(2)),
      max_kwh: maxConsumption,
      min_kwh: minConsumption,
      suspicious_readings_count: suspiciousReadings.length,
      sample_readings: suspiciousReadings.slice(-5).map((r) => ({
        timestamp: r.timestamp,
        kwh: r.consumption_kwh,
        voltage: r.voltage_v,
        current: r.current_a,
        pf: r.power_factor,
      })),
      operational_events: events.map((e) => ({
        timestamp: e.timestamp,
        type: e.type,
        description: e.description,
      })),
    };
  }

  /**
   * Persiste las anomalías devueltas por la IA y actualiza el estado operacional del medidor.
   */
  private async saveAnomaliesAndStatus(aiResults: any[]): Promise<Anomaly[]> {
    const savedAnomalies: Anomaly[] = [];

    for (const res of aiResults) {
      // Eliminar anomalías 'PENDING' previas de este medidor antes de guardar la nueva
      await this.anomalyRepo.delete({
        meter_id: res.meter_id,
        status: 'PENDING',
      });

      const anomaly = this.anomalyRepo.create({
        meter_id: res.meter_id,
        type: res.type,
        severity: res.severity,
        confidence: res.confidence,
        reason: res.reason,
        recommended_action: res.recommended_action,
        status: 'PENDING',
      });

      const saved = await this.anomalyRepo.save(anomaly);
      savedAnomalies.push(saved);

      // Actualizar estado operativo del medidor según severidad
      let newStatus = 'OK';
      if (res.severity === 'HIGH') newStatus = 'Critical';
      else if (res.severity === 'MEDIUM') newStatus = 'Alert';

      await this.meterRepo.update({ meter_id: res.meter_id }, { status: newStatus });
    }

    return savedAnomalies;
  }

  /**
   * Obtiene y valida la clave de API de Gemini.
   */
  private getApiKey(): string {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY no está configurada.');
      throw new InternalServerErrorException(
        'Error de configuración: GEMINI_API_KEY no está presente en el servidor.',
      );
    }
    return apiKey;
  }

  /**
   * Invocación resiliente con Fallback Cascade entre múltiples modelos de Gemini.
   */
  private async callGeminiSdkWithFallback(
    apiKey: string,
    suspectData: any[],
  ): Promise<any[]> {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Eres un ingeniero experto en sistemas de gestión de energía industrial y diagnósticos eléctricos.
Analiza la siguiente evidencia técnica de medidores eléctricos sospechosos y clasifica cada uno.

EVIDENCIA TÉCNICA:
${JSON.stringify(suspectData, null, 2)}

INSTRUCCIONES DE CLASIFICACIÓN:
Debes clasificar CADA medidor en uno de estos 4 tipos exactos:
1. "REAL ANOMALY" (Severidad: HIGH): Desviación severa de consumo/voltaje sin evento operativo justificable.
2. "EXPLAINABLE ANOMALY" (Severidad: MEDIUM): Aumentos o variaciones de consumo justificados por expansión o cambios en la línea de producción.
3. "FALSE POSITIVE" (Severidad: LOW): Caídas de consumo o variaciones causadas directamente por eventos de mantenimiento programado o paradas operativas registradas.
4. "DATA QUALITY" (Severidad: HIGH): Lecturas cero, nulas, imposibles o falla evidente de sensor/comunicación.

FORMATO DE RESPUESTA REQUERIDO:
Responde ÚNICAMENTE con un arreglo JSON válido (sin sintaxis markdown alrededor):
[
  {
    "meter_id": "M-XXX",
    "type": "REAL ANOMALY",
    "severity": "HIGH",
    "confidence": 0.95,
    "reason": "Explicación técnica en español...",
    "recommended_action": "Acción recomendada en español..."
  }
]
`;

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
      'gemini-2.5-flash',
    ];

    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        this.logger.log(`Invocando Gemini usando modelo: ${modelName}`);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanJson);
      } catch (error) {
        this.logger.warn(
          `Modelo '${modelName}' no respondió adecuadamente (${error instanceof Error ? error.message : String(error)}). Intentando siguiente fallback...`,
        );
        lastError = error;
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    throw lastError || new Error('Ningún modelo de Gemini estuvo disponible para procesar el diagnóstico.');
  }
}