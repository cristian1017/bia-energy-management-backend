import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import { Meter } from '../../db/entities/meter.entity';
import { Reading } from '../../db/entities/reading.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Meter, Reading])],
  controllers: [MetersController],
  providers: [MetersService],
  exports: [MetersService],
})
export class MetersModule {}
