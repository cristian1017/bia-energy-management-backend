import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Meter } from './meter.entity';

@Entity('anomalies')
export class Anomaly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meter_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  detected_at: Date;

  @Column()
  type: string;

  @Column()
  severity: string;

  @Column({ type: 'float' })
  confidence: number;

  @Column('text')
  reason: string;

  @Column('text')
  recommended_action: string;

  @Column({ default: 'PENDING' })
  status: string;

  @ManyToOne(() => Meter, (meter) => meter.anomalies)
  @JoinColumn({ name: 'meter_id', referencedColumnName: 'meter_id' })
  meter: Relation<Meter>;
}
