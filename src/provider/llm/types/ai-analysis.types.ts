export type MeterSuspectData = {
  meter_id: string;
  baseline_avg_kwh: number;
  max_kwh: number;
  min_kwh: number;
  suspicious_readings_count: number;
  sample_readings: Array<{
    timestamp: Date;
    kwh: number;
    voltage: number;
    current: number;
    pf: number;
  }>;
  operational_events: Array<{
    timestamp: Date;
    type: string;
    description: string;
  }>;
};

export type AiAnomalyResult = {
  meter_id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  reason?: string;
  recommended_action?: string;
};
