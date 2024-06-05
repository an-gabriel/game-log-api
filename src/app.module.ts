import { MiddlewareConsumer, Module } from '@nestjs/common';
import { LogsModule } from './module/log/logs.module';



@Module({
  imports: [LogsModule],
  controllers: [],
  providers: [],
})
export class AppModule {

}
