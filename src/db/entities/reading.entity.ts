import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Meter } from './meter.entity';

@Entity('readings')
export class Reading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meter_id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'float' })
  consumption_kwh: number;

  @Column({ type: 'float' })
  voltage_v: number;

  @Column({ type: 'float' })
  current_a: number;

  @Column({ type: 'float' })
  power_factor: number;

  @ManyToOne(() => Meter, (meter) => meter.readings)
  @JoinColumn({ name: 'meter_id', referencedColumnName: 'meter_id' })
  meter: Relation<Meter>;
}