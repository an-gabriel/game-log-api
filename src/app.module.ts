import { Module } from '@nestjs/common';
import { LogsModule } from './module/logs/logs.module';

@Module({
  imports: [LogsModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
