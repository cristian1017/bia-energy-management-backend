import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Anomaly } from './entities/anomaly.entity';
import { Event } from './entities/event.entity';
import { Meter } from './entities/meter.entity';
import { Reading } from './entities/reading.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgrespassword'),
        database: configService.get<string>('DB_NAME', 'energy_db'),
        entities: [Meter, Reading, Event, Anomaly],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
      }),
    }),
  ],
})
export class DatabaseModule {}
