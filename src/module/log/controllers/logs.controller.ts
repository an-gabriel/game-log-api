import { BadRequestException, Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FetchLogsQuery } from '../queries/fetch-logs.query';
import { LogsService } from '../services/logs.service';

interface GameStatistics {
    totalKills: number;
    killsByCause: any[];
    killsByWorld: number;
    rankingCauses: any[];
    rankingKillers: any[];
}

@ApiTags('logs')
@Controller('logs')
export class LogsController {
    constructor(

        private readonly queryBus: QueryBus,
        private readonly logsService: LogsService
    ) { }

    @Get('game-statistics/:gameId')
    @ApiParam({ name: 'gameId', description: 'The ID of the game' })
    @ApiResponse({ status: 200, description: 'Successfully fetched game statistics' })
    async getGameStatisticsById(@Param('gameId') gameId: string): Promise<GameStatistics> {
        try {
            await this.logsService.processLog();
            await this.queryBus.execute(new FetchLogsQuery());
            const parsedGameId = parseInt(gameId, 10);
            const gameStatistics: GameStatistics = this.logsService.getGameStatisticsById(parsedGameId);

            return gameStatistics;
        } catch (error) {
            console.error('Error fetching game statistics by ID:', error.message);
            throw new BadRequestException(error.message);
        }
    }

    @Get('game-statistics')
    @ApiResponse({ status: 200, description: 'Successfully fetched game statistics' })
    async getGameStatistics(): Promise<any> {
        try {
            await this.logsService.processLog();
            await this.queryBus.execute(new FetchLogsQuery());
            const gameStatistics = this.logsService.getGameStatistics();

            return gameStatistics;
        } catch (error) {
            console.error('Error fetching game statistics:', error.message);
            throw new BadRequestException(error.message);
        }
    }

    @Get('ranking/:gameId')
    @ApiParam({ name: 'gameId', description: 'The ID of the game' })
    @ApiResponse({ status: 200, description: 'Successfully fetched game ranking' })
    async getRankingByGameId(@Param('gameId') gameId: string): Promise<any> {
        try {
            await this.logsService.processLog();
            await this.queryBus.execute(new FetchLogsQuery());
            const parsedGameId = parseInt(gameId, 10);
            const gameRanking = this.logsService.getGameRankingById(parsedGameId);

            return gameRanking;
        } catch (error) {
            console.error('Error fetching game ranking by ID:', error.message);
            throw new NotFoundException(error.message);
        }
    }
}
