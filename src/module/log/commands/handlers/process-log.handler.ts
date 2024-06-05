import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProcessLogCommand } from '../process-log.command';
import { LogsService } from '../../services/logs.service';

@CommandHandler(ProcessLogCommand)
export class ProcessLogHandler implements ICommandHandler<ProcessLogCommand> {
    constructor(private readonly logsService: LogsService) { }

    async execute(command: ProcessLogCommand): Promise<void> {
        const logs = await this.logsService.fetchLogsFromFile(command.url);
        this.logsService.setLogs(logs);
        this.logsService.emitLogProcessedEvent(logs);
    }
}
