import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedsysService } from './redsys.service';

@Module({
  imports: [ConfigModule],
  providers: [RedsysService],
  exports: [RedsysService],
})
export class RedsysModule {}
