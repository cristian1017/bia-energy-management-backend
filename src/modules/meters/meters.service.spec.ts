import {
	BadRequestException,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Meter } from '../../db/entities/meter.entity';
import { Reading } from '../../db/entities/reading.entity';
import { MetersService } from './meters.service';

describe('MetersService', () => {
	let service: MetersService;
	let meterRepo: jest.Mocked<Pick<Repository<Meter>, 'find' | 'findOne'>>;
	let readingRepo: jest.Mocked<Pick<Repository<Reading>, 'find'>>;

	beforeEach(() => {
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

		meterRepo = {
			find: jest.fn<Repository<Meter>['find']>(),
			findOne: jest.fn<Repository<Meter>['findOne']>(),
		};
		readingRepo = {
			find: jest.fn<Repository<Reading>['find']>(),
		};
		service = new MetersService(
			meterRepo as unknown as Repository<Meter>,
			readingRepo as unknown as Repository<Reading>,
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('findAll', () => {
		it('returns meters ordered by meter_id', async () => {
			const meters = [{ meter_id: 'M-101' }] as Meter[];
			meterRepo.find.mockResolvedValue(meters);

			await expect(service.findAll()).resolves.toBe(meters);
			expect(meterRepo.find).toHaveBeenCalledWith({ order: { meter_id: 'ASC' } });
		});

		it('converts unexpected repository errors to an internal server error', async () => {
			meterRepo.find.mockRejectedValue(new Error('database unavailable'));

			await expect(service.findAll()).rejects.toBeInstanceOf(InternalServerErrorException);
		});

		it('preserves existing HTTP exceptions', async () => {
			const exception = new BadRequestException('invalid query');
			meterRepo.find.mockRejectedValue(exception);

			await expect(service.findAll()).rejects.toBe(exception);
		});
	});

	describe('findOne', () => {
		it('returns a meter by meter_id', async () => {
			const meterId = 'M-101';
			const meter = { meter_id: meterId } as Meter;
			meterRepo.findOne.mockResolvedValue(meter);

			await expect(service.findOne(meterId)).resolves.toBe(meter);
			expect(meterRepo.findOne).toHaveBeenCalledWith({ where: { meter_id: meterId } });
		});

		it('throws NotFoundException when the meter does not exist', async () => {
			meterRepo.findOne.mockResolvedValue(null);

			await expect(service.findOne('M-404')).rejects.toBeInstanceOf(NotFoundException);
		});

		it('converts non-Error repository failures to an internal server error', async () => {
			meterRepo.findOne.mockImplementation(() => Promise.reject('database unavailable'));

			await expect(service.findOne('M-101')).rejects.toBeInstanceOf(
				InternalServerErrorException,
			);
		});
	});

	describe('findReadingsByMeter', () => {
		it('returns readings in timestamp order for an existing meter', async () => {
			const meterId = 'M-101';
			const meter = { meter_id: meterId } as Meter;
			const readings = [{ meter_id: meterId }] as Reading[];
			meterRepo.findOne.mockResolvedValue(meter);
			readingRepo.find.mockResolvedValue(readings);

			await expect(service.findReadingsByMeter(meterId)).resolves.toBe(readings);
			expect(readingRepo.find).toHaveBeenCalledWith({
				where: { meter_id: meterId },
				order: { timestamp: 'ASC' },
			});
		});

		it('does not query readings when the meter does not exist', async () => {
			meterRepo.findOne.mockResolvedValue(null);

			await expect(service.findReadingsByMeter('M-404')).rejects.toBeInstanceOf(
				NotFoundException,
			);
			expect(readingRepo.find).not.toHaveBeenCalled();
		});

		it('converts reading repository errors to an internal server error', async () => {
			meterRepo.findOne.mockResolvedValue({ meter_id: 'M-101' } as Meter);
			readingRepo.find.mockRejectedValue(new Error('database unavailable'));

			await expect(service.findReadingsByMeter('M-101')).rejects.toBeInstanceOf(
				InternalServerErrorException,
			);
		});
	});
});
