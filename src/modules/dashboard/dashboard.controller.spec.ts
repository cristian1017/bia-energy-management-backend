import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
	let controller: DashboardController;
	let dashboardService: jest.MockedFunction<DashboardService['getSummary']>;

	beforeEach(async () => {
		dashboardService = jest.fn<DashboardService['getSummary']>();

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DashboardController],
			providers: [{ provide: DashboardService, useValue: { getSummary: dashboardService } }],
		}).compile();

		controller = module.get<DashboardController>(DashboardController);
	});

	it('is defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getSummary', () => {
		it('returns the summary from the service', async () => {
			const summary: Awaited<ReturnType<DashboardService['getSummary']>> = {
				kpis: {
					meters_count: 4,
					total_period_consumption_kwh: 200,
					ai_anomalies_detected: 2,
					high_priority_anomalies: 1,
					ai_confidence_avg_pct: 95,
					last_analysis: { timestamp: null, status: 'COMPLETED' },
				},
				meters_by_status: { OK: 4 },
				anomalies_by_severity: { HIGH: 1, LOW: 1 },
			};
			dashboardService.mockResolvedValue(summary);

			await expect(controller.getSummary()).resolves.toBe(summary);
			expect(dashboardService).toHaveBeenCalledTimes(1);
		});

		it('propagates errors from the service', async () => {
			const error = new Error('Dashboard unavailable');
			dashboardService.mockRejectedValue(error);

			await expect(controller.getSummary()).rejects.toBe(error);
		});
	});
});
