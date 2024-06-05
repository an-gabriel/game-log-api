import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FetchLogsQuery } from '../fetch-logs.query';
import { LogsService } from '../../services/logs.service';

@QueryHandler(FetchLogsQuery)
export class FetchLogsHandler implements IQueryHandler<FetchLogsQuery> {
    constructor(private readonly logsService: LogsService) { }

    async execute(query: FetchLogsQuery): Promise<string[]> {
        return this.logsService.getAllLogs();
    }
}
