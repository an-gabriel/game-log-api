import { Controller, Get, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProcessLogCommand } from '../commands/process-log.command';
import { FetchLogsQuery } from '../queries/fetch-logs.query';
import { LogsService } from '../services/logs.service';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly logsService: LogsService
    ) { }

    @Get('process')
    @ApiResponse({ status: 200, description: 'Successfully processed logs' })
    async processLog() {
        const url = 'https://raw.githubusercontent.com/rubcube/hiring-exercises/master/backend/games.log';
        const filePath = path.resolve(__dirname, '../../data/games.log');

        try {
            console.log(`Starting download from URL: ${url}`);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);

            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`Directory created: ${dir}`);
            }

            const fileStream = fs.createWriteStream(filePath);
            response.body.pipe(fileStream);

            return new Promise((resolve, reject) => {
                fileStream.on('finish', async () => {
                    console.log(`File saved: ${filePath}`);
                    await this.commandBus.execute(new ProcessLogCommand(filePath));
                    resolve({ message: 'Log processing started' });
                });
                fileStream.on('error', (error) => {
                    console.error('Error writing file:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Error downloading or saving the log file:', error.message);
            throw new Error('Failed to process the log file');
        }
    }

    @Get('init-games')
    @ApiResponse({ status: 200, description: 'Successfully fetched initial games' })
    async getInitGames() {
        await this.queryBus.execute(new FetchLogsQuery());
        return this.logsService.getInitGames();
    }

    @Get('client-connections')
    @ApiResponse({ status: 200, description: 'Successfully fetched client connections' })
    async getClientConnections() {
        await this.queryBus.execute(new FetchLogsQuery());
        return this.logsService.getClientConnections();
    }

    @Get('items-collected/:playerId')
    @ApiParam({ name: 'playerId', description: 'The ID of the player' })
    @ApiResponse({ status: 200, description: 'Successfully fetched items collected by player' })
    async getItemsCollected(@Param('playerId') playerId: string) {
        await this.queryBus.execute(new FetchLogsQuery());
        return this.logsService.getItemsCollected(playerId);
    }

    @Get('kills')
    @ApiResponse({ status: 200, description: 'Successfully fetched kills' })
    async getKills() {
        await this.queryBus.execute(new FetchLogsQuery());
        return this.logsService.getKills();
    }

    @Get('kill-stats')
    @ApiResponse({ status: 200, description: 'Successfully fetched kills status' })
    async getKillStats() {
        await this.queryBus.execute(new FetchLogsQuery());
        return this.logsService.getKillStats();
    }


    @Get('teste')
    @ApiResponse({ status: 200, description: 'Successfully fetched kills status' })
    async teste() {
        await this.queryBus.execute(new FetchLogsQuery());
        return this.logsService.getGameStatistics();
    }

}
