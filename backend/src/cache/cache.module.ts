import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.register({
      ttl: 300000, // 5 minutos en ms
      max: 1000, // Max items en cache
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheConfigModule {}
