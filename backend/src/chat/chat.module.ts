import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { VoiceService } from './voice.service';
import { LocationService } from './location.service';
import { TranslationService } from './translation.service';
import { QuickRepliesService } from './quick-replies.service';
import { QuickRepliesController } from './quick-replies.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [ChatController, QuickRepliesController],
  providers: [
    ChatGateway,
    VoiceService,
    LocationService,
    TranslationService,
    QuickRepliesService,
  ],
  exports: [
    ChatGateway,
    VoiceService,
    LocationService,
    TranslationService,
    QuickRepliesService,
  ],
})
export class ChatModule {}
