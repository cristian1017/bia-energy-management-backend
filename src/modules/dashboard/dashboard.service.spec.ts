import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Meter } from '../../db/entities/meter.entity';
import { Anomaly } from '../../db/entities/anomaly.entity';
import { Reading } from '../../db/entities/reading.entity';
import { DashboardService } from './dashboard.service';

type QueryBuilderMock = {
	select: jest.MockedFunction<(selection: string, alias?: string) => QueryBuilderMock>;
	addSelect: jest.MockedFunction<(selection: string, alias?: string) => QueryBuilderMock>;
	groupBy: jest.MockedFunction<(selection: string) => QueryBuilderMock>;
	getRawOne: jest.MockedFunction<() => Promise<unknown>>;
	getRawMany: jest.MockedFunction<() => Promise<unknown[]>>;
};

const createQueryBuilderMock = (
	rawOneResult: unknown,
	rawManyResult: unknown[] = [],
): QueryBuilderMock => {
	const queryBuilder = {} as QueryBuilderMock;
	queryBuilder.select = jest.fn<QueryBuilderMock['select']>().mockReturnValue(queryBuilder);
	queryBuilder.addSelect = jest.fn<QueryBuilderMock['addSelect']>().mockReturnValue(queryBuilder);
	queryBuilder.groupBy = jest.fn<QueryBuilderMock['groupBy']>().mockReturnValue(queryBuilder);
	queryBuilder.getRawOne = jest.fn< QueryBuilderMock['getRawOne']>().mockResolvedValue(rawOneResult);
	queryBuilder.getRawMany = jest.fn<QueryBuilderMock['getRawMany']>().mockResolvedValue(rawManyResult);
	return queryBuilder;
};

describe('DashboardService', () => {
	let service: DashboardService;
	let meterRepo: {
		count: jest.MockedFunction<Repository<Meter>['count']>;
		createQueryBuilder: jest.MockedFunction<() => QueryBuilderMock>;
	};
	let anomalyRepo: {
		count: jest.MockedFunction<Repository<Anomaly>['count']>;
		find: jest.MockedFunction<Repository<Anomaly>['find']>;
		createQueryBuilder: jest.MockedFunction<() => QueryBuilderMock>;
	};
	let readingRepo: {
		createQueryBuilder: jest.MockedFunction<() => QueryBuilderMock>;
	};

	beforeEach(() => {
		meterRepo = {
			count: jest.fn<Repository<Meter>['count']>(),
			createQueryBuilder: jest.fn<() => QueryBuilderMock>(),
		};
		anomalyRepo = {
			count: jest.fn<Repository<Anomaly>['count']>(),
			find: jest.fn<Repository<Anomaly>['find']>(),
			createQueryBuilder: jest.fn<() => QueryBuilderMock>(),
		};
		readingRepo = {
			createQueryBuilder: jest.fn<() => QueryBuilderMock>(),
		};

		service = new DashboardService(
			meterRepo as unknown as Repository<Meter>,
			anomalyRepo as unknown as Repository<Anomaly>,
			readingRepo as unknown as Repository<Reading>,
		);
	});

	it('calculates dashboard KPIs and grouped counts', async () => {
		const lastAnalysis = new Date('2026-09-25T12:00:00.000Z');
		const readingQuery = createQueryBuilderMock({ total_kwh: '123.456' });
		const anomalyQuery = createQueryBuilderMock({ avg_confidence: '0.956' }, [
			{ severity: 'HIGH', count: '2' },
			{ severity: 'LOW', count: '1' },
		]);
		const meterQuery = createQueryBuilderMock(undefined, [
			{ status: 'OK', count: '3' },
			{ status: 'Alert', count: '1' },
		]);

		meterRepo.count.mockResolvedValue(4);
		meterRepo.createQueryBuilder.mockReturnValue(meterQuery);
		readingRepo.createQueryBuilder.mockReturnValue(readingQuery);
		anomalyRepo.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
		anomalyRepo.createQueryBuilder.mockReturnValue(anomalyQuery);
		anomalyRepo.find.mockResolvedValue([{ detected_at: lastAnalysis } as Anomaly]);

		await expect(service.getSummary()).resolves.toEqual({
			kpis: {
				meters_count: 4,
				total_period_consumption_kwh: 123.46,
				ai_anomalies_detected: 3,
				high_priority_anomalies: 2,
				ai_confidence_avg_pct: 95.6,
				last_analysis: { timestamp: lastAnalysis, status: 'COMPLETED' },
			},
			meters_by_status: { OK: 3, Alert: 1 },
			anomalies_by_severity: { HIGH: 2, LOW: 1 },
		});

		expect(meterRepo.count).toHaveBeenCalledTimes(1);
		expect(anomalyRepo.count).toHaveBeenNthCalledWith(1);
		expect(anomalyRepo.count).toHaveBeenNthCalledWith(2, { where: { severity: 'HIGH' } });
		expect(anomalyRepo.find).toHaveBeenCalledWith({
			order: { detected_at: 'DESC' },
			take: 1,
		});
	});

	it('returns zeroed KPIs when there is no data', async () => {
		const readingQuery = createQueryBuilderMock(null);
		const anomalyQuery = createQueryBuilderMock(null, []);
		const meterQuery = createQueryBuilderMock(null, []);

		meterRepo.count.mockResolvedValue(0);
		meterRepo.createQueryBuilder.mockReturnValue(meterQuery);
		readingRepo.createQueryBuilder.mockReturnValue(readingQuery);
		anomalyRepo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
		anomalyRepo.createQueryBuilder.mockReturnValue(anomalyQuery);
		anomalyRepo.find.mockResolvedValue([]);

		await expect(service.getSummary()).resolves.toEqual({
			kpis: {
				meters_count: 0,
				total_period_consumption_kwh: 0,
				ai_anomalies_detected: 0,
				high_priority_anomalies: 0,
				ai_confidence_avg_pct: 0,
				last_analysis: { timestamp: null, status: 'NO_DATA' },
			},
			meters_by_status: {},
			anomalies_by_severity: {},
		});
	});
});
