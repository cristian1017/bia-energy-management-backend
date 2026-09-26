import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import type { Anomaly } from '../../db/entities/anomaly.entity';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let aiService: {
    getAnalysis: jest.MockedFunction<AiService['getAnalysis']>;
    getAnalysisById: jest.MockedFunction<AiService['getAnalysisById']>;
  };

  beforeEach(async () => {
    aiService = {
      getAnalysis: jest.fn<AiService['getAnalysis']>(),
      getAnalysisById: jest.fn<AiService['getAnalysisById']>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: aiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates analysis requests to AiService', async () => {
    const anomalies = [{ id: 'anomaly-1' }] as Anomaly[];
    const result = { message: 'Analysis completed', anomalies };
    aiService.getAnalysis.mockResolvedValue(result);

    await expect(controller.analyze()).resolves.toBe(result);
    expect(aiService.getAnalysis).toHaveBeenCalledTimes(1);
  });

  it('delegates single-meter analysis requests to AiService', async () => {
    const meterId = 'M-101';
    const anomaly = { meter_id: meterId } as Anomaly;
    aiService.getAnalysisById.mockResolvedValue(anomaly);

    await expect(controller.getAnalysis(meterId)).resolves.toBe(anomaly);
    expect(aiService.getAnalysisById).toHaveBeenCalledWith(meterId);
  });

  it('returns the service response when a meter has no anomalies', async () => {
    const response = { msg: 'No anomalies', status: 'OK' as const };
    aiService.getAnalysisById.mockResolvedValue(response);

    await expect(controller.getAnalysis('M-101')).resolves.toBe(response);
  });

  it('propagates errors from AiService', async () => {
    const error = new Error('AI service unavailable');
    aiService.getAnalysis.mockRejectedValue(error);

    await expect(controller.analyze()).rejects.toBe(error);
  });
});