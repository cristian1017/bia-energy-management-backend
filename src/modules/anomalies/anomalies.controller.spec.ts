import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { AnomaliesController } from './anomalies.controller';
import { AnomaliesService } from './anomalies.service';

describe('AnomaliesController', () => {
	let controller: AnomaliesController;
	let anomaliesService: {
		findAll: jest.MockedFunction<AnomaliesService['findAll']>;
		findByMeterId: jest.MockedFunction<AnomaliesService['findByMeterId']>;
	};

	beforeEach(async () => {
		anomaliesService = {
			findAll: jest.fn<AnomaliesService['findAll']>(),
			findByMeterId: jest.fn<AnomaliesService['findByMeterId']>(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AnomaliesController],
			providers: [{ provide: AnomaliesService, useValue: anomaliesService }],
		}).compile();

		controller = module.get<AnomaliesController>(AnomaliesController);
	});

	it('is defined', () => {
		expect(controller).toBeDefined();
	});

	it('returns all anomalies from the service', async () => {
		const anomalies = [{ id: 'anomaly-1' }] as Anomaly[];
		anomaliesService.findAll.mockResolvedValue(anomalies);

		await expect(controller.getAllAnomalies()).resolves.toBe(anomalies);
		expect(anomaliesService.findAll).toHaveBeenCalledTimes(1);
	});

	it('returns anomalies for a meter from the service', async () => {
		const meterId = 'M-101';
		const anomalies = [{ meter_id: meterId }] as Anomaly[];
		anomaliesService.findByMeterId.mockResolvedValue(anomalies);

		await expect(controller.getAnomaliesByMeterId(meterId)).resolves.toBe(anomalies);
		expect(anomaliesService.findByMeterId).toHaveBeenCalledWith(meterId);
	});

	it('propagates service errors', async () => {
		const error = new Error('Service unavailable');
		anomaliesService.findAll.mockRejectedValue(error);

		await expect(controller.getAllAnomalies()).rejects.toBe(error);
	});
});
