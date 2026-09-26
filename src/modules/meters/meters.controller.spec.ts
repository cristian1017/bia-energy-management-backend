import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import type { Meter } from '../../db/entities/meter.entity';
import type { Reading } from '../../db/entities/reading.entity';

describe('MetersController', () => {
  let controller: MetersController;
  let metersService: {
    findAll: jest.MockedFunction<MetersService['findAll']>;
    findOne: jest.MockedFunction<MetersService['findOne']>;
    findReadingsByMeter: jest.MockedFunction<MetersService['findReadingsByMeter']>;
  };

  beforeEach(async () => {
    metersService = {
      findAll: jest.fn<MetersService['findAll']>(),
      findOne: jest.fn<MetersService['findOne']>(),
      findReadingsByMeter: jest.fn<MetersService['findReadingsByMeter']>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetersController],
      providers: [{ provide: MetersService, useValue: metersService }],
    }).compile();

    controller = module.get<MetersController>(MetersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllMeters', () => {
    it('returns all meters from the service', async () => {
      const meters: Meter[] = [];
      metersService.findAll.mockResolvedValue(meters);

      await expect(controller.getAllMeters()).resolves.toBe(meters);
      expect(metersService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMeterById', () => {
    it('returns one meter by meter ID', async () => {
      const meterId = 'M-101';
      const meter = { meter_id: meterId } as Meter;
      metersService.findOne.mockResolvedValue(meter);

      await expect(controller.getMeterById(meterId)).resolves.toBe(meter);
      expect(metersService.findOne).toHaveBeenCalledWith(meterId);
    });
  });

  describe('getMeterReadings', () => {
    it('returns readings for a meter', async () => {
      const meterId = 'M-101';
      const readings: Reading[] = [];
      metersService.findReadingsByMeter.mockResolvedValue(readings);

      await expect(controller.getMeterReadings(meterId)).resolves.toBe(readings);
      expect(metersService.findReadingsByMeter).toHaveBeenCalledWith(meterId);
    });
  });
});
