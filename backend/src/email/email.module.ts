import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';

@Module({})
export class EmailModule {
  static forRoot(): DynamicModule {
    return {
      module: EmailModule,
      imports: [ConfigModule],
      providers: [EmailService],
      exports: [EmailService],
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: EmailModule,
      imports: [
        ConfigModule,
        BullModule.registerQueueAsync({
          name: 'email',
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const redisUrl = configService.get<string>('REDIS_URL');
            if (redisUrl) {
              return { url: redisUrl };
            }
            // Fallback to localhost if not configured
            return {
              redis: {
                host: configService.get<string>('REDIS_HOST') || 'localhost',
                port: configService.get<number>('REDIS_PORT') || 6379,
              },
            };
          },
          inject: [ConfigService],
        }),
      ],
      providers: [EmailService, EmailProcessor],
      exports: [EmailService],
    };
  }
}
