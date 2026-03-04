import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeedbackController } from './feedback.controller';

@Module({
  imports: [ConfigModule],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
