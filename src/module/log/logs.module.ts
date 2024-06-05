import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LogsService } from './services/logs.service';
import { LogsController } from './controllers/logs.controller';
import { ProcessLogHandler } from './commands/handlers/process-log.handler';
import { LogProcessedHandler } from './events/handlers/log-processed.handler';
import { FetchLogsHandler } from './queries/handlers/fetch-logs.handler';

@Module({
    imports: [CqrsModule],
    controllers: [LogsController],
    providers: [
        LogsService,
        ProcessLogHandler,
        LogProcessedHandler,
        FetchLogsHandler,
    ],
})

export class LogsModule { }
