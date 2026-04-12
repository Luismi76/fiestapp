import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformConfigService } from './platform-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
