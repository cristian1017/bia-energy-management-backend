import { InternalServerErrorException, Logger } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import type { Anomaly } from '../../../db/entities/anomaly.entity';
import type { Event } from '../../../db/entities/event.entity';
import type { Meter } from '../../../db/entities/meter.entity';
import type { Reading } from '../../../db/entities/reading.entity';
import type { AiAnalysisService } from './ai-analysis.service.js';

type GeminiRequest = {
  model: string;
  contents: string;
  config: { responseMimeType: string };
};

const generateContent = jest.fn<(request: GeminiRequest) => Promise<{ text?: string }>>();

jest.unstable_mockModule('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

let AiAnalysisServiceClass: typeof AiAnalysisService;

describe('AiAnalysisService', () => {
  let service: AiAnalysisService;
  let meterRepo: {
    find: jest.MockedFunction<() => Promise<Meter[]>>;
    update: jest.MockedFunction<
      (criteria: { meter_id: string }, values: { status: string }) => Promise<unknown>
    >;
  };
  let readingRepo: {
    find: jest.MockedFunction<(options: unknown) => Promise<Reading[]>>;
  };
  let eventRepo: {
    find: jest.MockedFunction<(options: unknown) => Promise<Event[]>>;
  };
  let anomalyRepo: {
    clear: jest.MockedFunction<() => Promise<void>>;
    delete: jest.MockedFunction<(criteria: { meter_id: string; status: string }) => Promise<unknown>>;
    create: jest.MockedFunction<(input: Partial<Anomaly>) => Anomaly>;
    save: jest.MockedFunction<(anomaly: Anomaly) => Promise<Anomaly>>;
  };
  let configService: {
    get: jest.MockedFunction<(key: string) => string | undefined>;
  };

  beforeAll(async () => {
    ({ AiAnalysisService: AiAnalysisServiceClass } = await import('./ai-analysis.service.js'));
  });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    generateContent.mockReset();

    meterRepo = {
      find: jest.fn<() => Promise<Meter[]>>(),
      update: jest.fn<
        (criteria: { meter_id: string }, values: { status: string }) => Promise<unknown>
      >(),
    };
    readingRepo = {
      find: jest.fn<(options: unknown) => Promise<Reading[]>>(),
    };
    eventRepo = {
      find: jest.fn<(options: unknown) => Promise<Event[]>>(),
    };
    anomalyRepo = {
      clear: jest.fn<() => Promise<void>>(),
      delete: jest.fn<
        (criteria: { meter_id: string; status: string }) => Promise<unknown>
      >(),
      create: jest.fn<(input: Partial<Anomaly>) => Anomaly>(),
      save: jest.fn<(anomaly: Anomaly) => Promise<Anomaly>>(),
    };
    configService = {
      get: jest.fn<(key: string) => string | undefined>(),
    };

    anomalyRepo.create.mockImplementation((input) => input as Anomaly);
    anomalyRepo.save.mockImplementation(async (anomaly) => anomaly);
    anomalyRepo.clear.mockResolvedValue(undefined);
    anomalyRepo.delete.mockResolvedValue({ affected: 1 });
    meterRepo.update.mockResolvedValue({ affected: 1 });
    eventRepo.find.mockResolvedValue([]);
    configService.get.mockReturnValue('test-gemini-key');

    service = new AiAnalysisServiceClass(
      meterRepo as never,
      readingRepo as never,
      eventRepo as never,
      anomalyRepo as never,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('requires a configured Gemini API key', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(service.runAiAnalysis()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(meterRepo.find).not.toHaveBeenCalled();
  });

  it('returns no anomalies when no meters have suspicious readings', async () => {
    meterRepo.find.mockResolvedValue([]);

    await expect(service.runAiAnalysis()).resolves.toEqual([]);
    expect(anomalyRepo.clear).not.toHaveBeenCalled();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('returns no anomalies for a meter without readings', async () => {
    readingRepo.find.mockResolvedValue([]);

    await expect(service.runAiAnalysisForMeter('M-101')).resolves.toEqual([]);
    expect(readingRepo.find).toHaveBeenCalledWith({
      where: { meter_id: 'M-101' },
      order: { timestamp: 'ASC' },
    });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('analyzes suspicious meters and persists anomalies with severity-based statuses', async () => {
    const meterId = 'M-101';
    const timestamp = new Date('2026-09-25T12:00:00.000Z');
    const readings = [
      {
        meter_id: meterId,
        timestamp,
        consumption_kwh: 10,
        voltage_v: 220,
        current_a: 2,
        power_factor: 0.95,
      },
      {
        meter_id: meterId,
        timestamp,
        consumption_kwh: 30,
        voltage_v: 251,
        current_a: 4,
        power_factor: 0.6,
      },
    ] as Reading[];
    const events = [
      { timestamp, type: 'MAINTENANCE', description: 'Scheduled work' },
    ] as Event[];
    const aiResults = [
      { meter_id: meterId, type: 'REAL ANOMALY', severity: 'HIGH', confidence: 0.95 },
      { meter_id: 'M-102', type: 'EXPLAINABLE ANOMALY', severity: 'MEDIUM', confidence: 0.8 },
      { meter_id: 'M-103', type: 'FALSE POSITIVE', severity: 'LOW', confidence: 0.7 },
    ];

    meterRepo.find.mockResolvedValue([{ meter_id: meterId } as Meter]);
    readingRepo.find.mockResolvedValue(readings);
    eventRepo.find.mockResolvedValue(events);
    generateContent.mockResolvedValue({ text: JSON.stringify(aiResults) });

    const result = await service.runAiAnalysis();

    expect(result).toHaveLength(3);
    expect(anomalyRepo.clear).toHaveBeenCalledTimes(1);
    expect(anomalyRepo.delete).toHaveBeenCalledTimes(3);
    expect(meterRepo.update).toHaveBeenNthCalledWith(1, { meter_id: meterId }, { status: 'Critical' });
    expect(meterRepo.update).toHaveBeenNthCalledWith(2, { meter_id: 'M-102' }, { status: 'Alert' });
    expect(meterRepo.update).toHaveBeenNthCalledWith(3, { meter_id: 'M-103' }, { status: 'OK' });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.5-flash-lite' }),
    );
    expect(generateContent.mock.calls[0][0].contents).toContain('M-101');
  });

  it('uses the next Gemini model when the first model fails', async () => {
    jest.useFakeTimers();
    const meterId = 'M-101';
    const readings = [
      { consumption_kwh: 10, voltage_v: 220, current_a: 2, power_factor: 0.95 },
      { consumption_kwh: 30, voltage_v: 220, current_a: 3, power_factor: 0.9 },
    ] as Reading[];
    const aiResults = [{ meter_id: meterId, type: 'REAL ANOMALY', severity: 'HIGH' }];

    readingRepo.find.mockResolvedValue(readings);
    generateContent
      .mockRejectedValueOnce(new Error('model unavailable'))
      .mockResolvedValueOnce({ text: `\`\`\`json\n${JSON.stringify(aiResults)}\n\`\`\`` });

    const resultPromise = service.runAiAnalysisForMeter(meterId);
    await jest.runAllTimersAsync();

    await expect(resultPromise).resolves.toHaveLength(1);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0].model).toBe('gemini-3.8-flash');
  });

  it('throws the last error after all Gemini models fail', async () => {
    jest.useFakeTimers();
    const meterId = 'M-101';
    const readings = [
      { consumption_kwh: 10, voltage_v: 220, current_a: 2, power_factor: 0.95 },
      { consumption_kwh: 30, voltage_v: 220, current_a: 3, power_factor: 0.9 },
    ] as Reading[];
    const failure = new Error('all models unavailable');

    readingRepo.find.mockResolvedValue(readings);
    generateContent.mockRejectedValue(failure);

    const resultPromise = service.runAiAnalysisForMeter(meterId);
    const rejectionExpectation = expect(resultPromise).rejects.toBe(failure);
    await jest.runAllTimersAsync();

    await rejectionExpectation;
    expect(generateContent).toHaveBeenCalledTimes(4);
  });
});