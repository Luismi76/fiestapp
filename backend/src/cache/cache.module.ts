import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        // Si no hay Redis configurado, usar cache en memoria
        if (!redisUrl) {
          console.log('REDIS_URL not configured, using in-memory cache');
          return {
            ttl: 300, // 5 minutos default
            max: 1000, // Max items en cache
          };
        }

        // Configurar Redis
        const store = await redisStore({
          url: redisUrl,
          ttl: 300, // 5 minutos default
        });

        return {
          store: store as any,
          ttl: 300,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheConfigModule {}
