import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Event } from '../entities/event.entity';


@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
    @InjectRepository(Reading)
    private readonly readingRepo: Repository<Reading>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async onModuleInit() {
    await this.seedData();
  }

  async seedData() {
    const readingCount = await this.readingRepo.count();
    if (readingCount > 0) {
      this.logger.log('Base de datos ya poblada. Omitiendo seed.');
      return;
    }

    this.logger.log('Iniciando ingesta de datos desde archivos CSV...');

    const dataDir = path.join(process.cwd(), 'data');
    const readingsFilePath = path.join(dataDir, 'readings.csv');
    const eventsFilePath = path.join(dataDir, 'events.csv');

    if (!fs.existsSync(readingsFilePath) || !fs.existsSync(eventsFilePath)) {
      this.logger.error(' No se encontraron los archivos CSV en la carpeta /data.');
      return;
    }

    const rawReadings = await this.parseCsv(readingsFilePath);
    const rawEvents = await this.parseCsv(eventsFilePath);

    const validReadings = rawReadings.filter((row) => {
      const isValid = this.isValidDate(row.timestamp);
      if (!isValid) {
        this.logger.warn(`Se omite una lectura con timestamp inválido: ${JSON.stringify(row)}`);
      }
      return isValid;
    });

    const validEvents = rawEvents.filter((row) => {
      const timestampValue = row.event_timestamp || row.timestamp || row.eventTimestamp;
      const isValid = this.isValidDate(timestampValue);
      if (!isValid) {
        this.logger.warn(`Se omite un evento con timestamp inválido: ${JSON.stringify(row)}`);
      }
      return isValid;
    });

    //Se extraen medidores únicos y crearlos
    const uniqueMeterIds = Array.from(
      new Set(validReadings.map((r) => r.meter_id || r.meterId)),
    ).filter(Boolean);

    const metersToSave = uniqueMeterIds.map((mId) =>
      this.meterRepo.create({
        meter_id: mId,
        name: `Medidor Industrial ${mId}`,
        location: `Planta Principal - Sector ${mId.split('-')[1] || 'A'}`,
        status: 'OK',
      }),
    );

    await this.meterRepo.save(metersToSave);
    this.logger.log(` ${metersToSave.length} medidores creados en BD.`);

    //Inserción masiva de Lecturas en chunks para mejor rendimiento
    const readingsToSave: Reading[] = validReadings.map((row) =>
      this.readingRepo.create({
        meter_id: row.meter_id || row.meterId,
        timestamp: this.parseDate(row.timestamp || row.reading_timestamp || row.readingTimestamp),
        consumption_kwh: parseFloat(row.consumption_kwh || row.consumptionKwh || '0'),
        voltage_v: parseFloat(row.voltage_v || row.voltageV || '0'),
        current_a: parseFloat(row.current_a || row.currentA || '0'),
        power_factor: parseFloat(row.power_factor || row.powerFactor || '0'),
      }),
    );

    const chunkSize = 1000;
    for (let i = 0; i < readingsToSave.length; i += chunkSize) {
      const chunk = readingsToSave.slice(i, i + chunkSize);
      await this.readingRepo.save(chunk);
    }
    this.logger.log(` ${readingsToSave.length} lecturas insertadas exitosamente.`);

    // Inserción de Eventos
    const eventsToSave: Event[] = validEvents.map((row) =>
      this.eventRepo.create({
        meter_id: row.meter_id || row.meterId,
        timestamp: this.parseDate(row.event_timestamp || row.timestamp || row.eventTimestamp),
        type: row.type || row.event_type || 'OPERATIONAL',
        description: row.description || 'Evento registrado en bitácora',
      }),
    );

    await this.eventRepo.save(eventsToSave);
    this.logger.log(`${eventsToSave.length} eventos operativos insertados.`);

    this.logger.log('Ingesta completada con éxito.');
  }

  private parseDate(value: unknown): Date {
    const raw = typeof value === 'string' ? value.trim() : String(value ?? '').trim();

    if (!raw) {
      throw new Error('Timestamp vacío');
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Timestamp inválido: ${raw}`);
    }

    return date;
  }

  private isValidDate(value: unknown): boolean {
    try {
      const raw = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
      if (!raw) return false;
      const date = new Date(raw);
      return !Number.isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  private parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const parser = csv();

      fs.createReadStream(filePath)
        .pipe(parser)
        .on('data', (data: Record<string, string>) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error: Error) => reject(error));
    });
  }
}