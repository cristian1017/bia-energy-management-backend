import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { Anomaly } from '../../db/entities/anomaly.entity';
import type { Meter } from '../../db/entities/meter.entity';
import type { AiAnalysisService } from '../../provider/llm/service/ai-analysis.service';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  let aiAnalysisService: {
    runAiAnalysis: jest.MockedFunction<AiAnalysisService['runAiAnalysis']>;
    runAiAnalysisForMeter: jest.MockedFunction<AiAnalysisService['runAiAnalysisForMeter']>;
  };
  let anomalyRepo: jest.Mocked<Pick<Repository<Anomaly>, 'findOne'>>;
  let meterRepo: jest.Mocked<Pick<Repository<Meter>, 'findOne'>>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    aiAnalysisService = {
      runAiAnalysis: jest.fn<AiAnalysisService['runAiAnalysis']>(),
      runAiAnalysisForMeter: jest.fn<AiAnalysisService['runAiAnalysisForMeter']>(),
    };
    anomalyRepo = {
      findOne: jest.fn<Repository<Anomaly>['findOne']>(),
    };
    meterRepo = {
      findOne: jest.fn<Repository<Meter>['findOne']>(),
    };

    service = new AiService(
      aiAnalysisService as unknown as AiAnalysisService,
      anomalyRepo as unknown as Repository<Anomaly>,
      meterRepo as unknown as Repository<Meter>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAnalysis', () => {
    it('runs the analysis and returns its anomalies', async () => {
      const anomalies = [{ id: 'anomaly-1' }] as Anomaly[];
      aiAnalysisService.runAiAnalysis.mockResolvedValue(anomalies);

      await expect(service.getAnalysis()).resolves.toEqual({
        message: 'Análisis de IA completado y persistido en la base de datos.',
        anomalies,
      });
      expect(aiAnalysisService.runAiAnalysis).toHaveBeenCalledTimes(1);
    });

    it('converts analysis errors to an internal server error', async () => {
      aiAnalysisService.runAiAnalysis.mockRejectedValue(new Error('Gemini unavailable'));

      await expect(service.getAnalysis()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('getAnalysisById', () => {
    it('throws NotFoundException when the meter does not exist', async () => {
      meterRepo.findOne.mockResolvedValue(null);

      await expect(service.getAnalysisById('M-404')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(anomalyRepo.findOne).not.toHaveBeenCalled();
      expect(aiAnalysisService.runAiAnalysisForMeter).not.toHaveBeenCalled();
    });

    it('runs a fresh analysis for the meter and returns the first anomaly found', async () => {
      const meterId = 'M-101';
      const meter = { meter_id: meterId } as Meter;
      const anomaly = { id: 'anomaly-1', meter_id: meterId } as Anomaly;
      meterRepo.findOne.mockResolvedValue(meter);
      aiAnalysisService.runAiAnalysisForMeter.mockResolvedValue([anomaly]);

      await expect(service.getAnalysisById(meterId)).resolves.toBe(anomaly);
      expect(anomalyRepo.findOne).not.toHaveBeenCalled();
      expect(aiAnalysisService.runAiAnalysisForMeter).toHaveBeenCalledWith(meterId);
    });

    it('runs a fresh analysis and returns its first anomaly', async () => {
      const meterId = 'M-101';
      const meter = { meter_id: meterId } as Meter;
      const anomaly = { id: 'anomaly-2', meter_id: meterId } as Anomaly;
      meterRepo.findOne.mockResolvedValue(meter);
      anomalyRepo.findOne.mockResolvedValue(null);
      aiAnalysisService.runAiAnalysisForMeter.mockResolvedValue([anomaly]);

      await expect(service.getAnalysisById(meterId)).resolves.toBe(anomaly);
      expect(aiAnalysisService.runAiAnalysisForMeter).toHaveBeenCalledWith(meterId);
    });

    it('returns an OK message when the fresh analysis finds no anomalies', async () => {
      const meterId = 'M-101';
      meterRepo.findOne.mockResolvedValue({ meter_id: meterId } as Meter);
      anomalyRepo.findOne.mockResolvedValue(null);
      aiAnalysisService.runAiAnalysisForMeter.mockResolvedValue([]);

      await expect(service.getAnalysisById(meterId)).resolves.toEqual({
        msg: `El medidor '${meterId}' está dentro de parámetros normales. No se detectaron anomalías.`,
        status: 'OK',
      });
    });

    it('converts unexpected repository errors to an internal server error', async () => {
      meterRepo.findOne.mockRejectedValue(new Error('database unavailable'));

      await expect(service.getAnalysisById('M-101')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });
});