import {
	BadRequestException,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { AnomaliesService } from './anomalies.service';

describe('AnomaliesService', () => {
	let service: AnomaliesService;
	let anomalyRepo: jest.Mocked<Pick<Repository<Anomaly>, 'find'>>;

	beforeEach(() => {
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		anomalyRepo = {
			find: jest.fn<Repository<Anomaly>['find']>(),
		};
		service = new AnomaliesService(anomalyRepo as unknown as Repository<Anomaly>);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('findAll', () => {
		it('returns anomalies ordered by detected_at descending', async () => {
			const anomalies = [{ id: 'anomaly-1' }] as Anomaly[];
			anomalyRepo.find.mockResolvedValue(anomalies);

			await expect(service.findAll()).resolves.toBe(anomalies);
			expect(anomalyRepo.find).toHaveBeenCalledWith({ order: { detected_at: 'DESC' } });
		});

		it('converts unexpected repository errors to an internal server error', async () => {
			anomalyRepo.find.mockRejectedValue(new Error('database unavailable'));

			await expect(service.findAll()).rejects.toBeInstanceOf(InternalServerErrorException);
		});

		it('preserves existing HTTP exceptions', async () => {
			const exception = new BadRequestException('invalid query');
			anomalyRepo.find.mockRejectedValue(exception);

			await expect(service.findAll()).rejects.toBe(exception);
		});
	});

	describe('findByMeterId', () => {
		it('returns anomalies for the requested meter in descending date order', async () => {
			const meterId = 'M-101';
			const anomalies = [{ meter_id: meterId }] as Anomaly[];
			anomalyRepo.find.mockResolvedValue(anomalies);

			await expect(service.findByMeterId(meterId)).resolves.toBe(anomalies);
			expect(anomalyRepo.find).toHaveBeenCalledWith({
				where: { meter_id: meterId },
				order: { detected_at: 'DESC' },
			});
		});

		it('throws NotFoundException when the meter has no anomalies', async () => {
			anomalyRepo.find.mockResolvedValue([]);

			await expect(service.findByMeterId('M-404')).rejects.toBeInstanceOf(NotFoundException);
		});

		it('converts non-Error repository failures to an internal server error', async () => {
			anomalyRepo.find.mockImplementation(() => Promise.reject('database unavailable'));

			await expect(service.findByMeterId('M-101')).rejects.toBeInstanceOf(
				InternalServerErrorException,
			);
		});
	});
});
