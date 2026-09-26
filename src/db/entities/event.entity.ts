import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Meter } from './meter.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meter_id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column()
  type: string;

  @Column('text')
  description: string;

  @ManyToOne(() => Meter, (meter) => meter.events)
  @JoinColumn({ name: 'meter_id', referencedColumnName: 'meter_id' })
  meter: Relation<Meter>;
}