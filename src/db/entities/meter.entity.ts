
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { Reading } from './reading.entity';
import { Event } from './event.entity';
import { Anomaly } from './anomaly.entity';

@Entity('meters')
export class Meter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  meter_id: string; // Ej: M-101, M-109

  @Column()
  name: string;

  @Column()
  location: string;

  @Column({ default: 'OK' })
  status: string; // OK, Alert, Critical

  @OneToMany(() => Reading, (reading) => reading.meter)
  readings: Relation<Reading[]>;

  @OneToMany(() => Event, (event) => event.meter)
  events: Relation<Event[]>;

  @OneToMany(() => Anomaly, (anomaly) => anomaly.meter)
  anomalies: Relation<Anomaly[]>;
}