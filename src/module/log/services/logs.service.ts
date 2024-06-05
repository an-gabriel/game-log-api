import { Injectable } from '@nestjs/common';
import { LogProcessedEvent } from '../events/log-processed.event';
import { EventBus } from '@nestjs/cqrs';
import * as fs from 'fs';

@Injectable()
export class LogsService {
    private logs: string[];

    // Constantes para strings repetidas
    private readonly KILL_LOG_IDENTIFIER = 'Kill';
    private readonly INIT_GAME_IDENTIFIER = 'InitGame';
    private readonly SHUTDOWN_GAME_IDENTIFIER = 'ShutdownGame';
    private readonly WORLD_IDENTIFIER = '<world>';
    private readonly KILL_BY_IDENTIFIER = 'by';
    private readonly MAGIC_COUNT_NUMBER = 1;

    constructor(private readonly eventBus: EventBus) { }

    async setLogs(logs: string[]): Promise<void> {
        this.logs = logs;
    }

    async fetchLogsFromFile(filePath: string): Promise<string[]> {
        try {
            const data = await fs.promises.readFile(filePath, 'utf8');
            return data.split('\n');
        } catch (error) {
            console.error('Error reading log file:', error);
            throw error;
        }
    }

    getAllLogs(): string[] {
        return this.logs;
    }

    emitLogProcessedEvent(logs: string[]): void {
        this.eventBus.publish(new LogProcessedEvent(logs));
    }

    getInitGames(): string[] {
        return this.logs.filter(log => log.includes(this.INIT_GAME_IDENTIFIER));
    }

    getClientConnections(): string[] {
        return this.logs.filter(log => log.includes('ClientConnect'));
    }

    getItemsCollected(playerId: string): string[] {
        return this.logs.filter(log => log.includes(`Item: ${playerId}`));
    }

    getKills(): string[] {
        return this.logs.filter(log => log.includes(this.KILL_LOG_IDENTIFIER));
    }

    groupLogsByGame(): string[][] {
        const games = [];
        let currentGameLogs = [];

        for (const log of this.logs) {
            if (log.includes(this.INIT_GAME_IDENTIFIER)) {
                currentGameLogs = [];
            }

            currentGameLogs.push(log);

            if (log.includes(this.SHUTDOWN_GAME_IDENTIFIER)) {
                games.push([...currentGameLogs]);
            }
        }

        return games.reverse();
    }


    getGameStatistics(): any {
        const games = this.groupLogsByGame();
        const totalGames = games.length + this.MAGIC_COUNT_NUMBER 

        const statistics = games.map(game => this.calculateGameStatistics(game));

        return {
            totalGames,
            statistics
        };
    }


    getGameStatisticsById(gameId: number): any {
        const games = this.groupLogsByGame();
        const gameLogs = games[gameId];
        if (!gameLogs) {
            throw new Error(`Game with ID ${gameId} not found.`);
        }
        return this.calculateGameStatistics(gameLogs)
    }


    private calculateGameStatistics(gameLogs: string[]): any {

        const totalKills = this.calculateTotalKills(gameLogs);
        const killsByCause = this.calculateKillsByCause(gameLogs);
        const killsByWorld = this.calculateKillsByWorld(gameLogs);
        const rankingCauses = this.calculateRankingCauses(killsByCause);
        const rankingKillers = this.calculateRankingKillers(killsByCause);

        return {
            totalKills,
            killsByCause,
            killsByWorld,
            rankingCauses,
            rankingKillers
        };
    }

    private calculateTotalGames(gameLogs: string[]): number {
        return gameLogs.filter(log => log.includes(this.INIT_GAME_IDENTIFIER)).length;
    }

    private calculateTotalKills(gameLogs: string[]): number {
        return gameLogs.filter(log => log.includes(this.KILL_LOG_IDENTIFIER)).length;
    }

    private calculateKillsByCause(gameLogs: string[]): any[] {
        const killsByCause = [];

        gameLogs.forEach(log => {
            const parts = log.split(' ');
            const killIndex = parts.indexOf(`${this.KILL_LOG_IDENTIFIER}:`);

            if (killIndex !== -1) {
                const [killerName, killedName] = log.split(":")[log.split(":").length - 1].split(' killed ');
                const [killed, causeOfDeath] = killedName.split(' by ');

                if (!causeOfDeath.startsWith(this.WORLD_IDENTIFIER)) {
                    killsByCause.push({
                        killer: killerName.trim(),
                        killed: killed.trim(),
                        cause: causeOfDeath.trim()
                    });
                }
            }
        });

        return killsByCause;
    }

    private calculateKillsByWorld(gameLogs: string[]): number {
        return gameLogs.filter(log => log.includes(this.WORLD_IDENTIFIER)).length;
    }

    private calculateRankingCauses(killsByCause: any[]): any[] {
        return this.calculateRanking(killsByCause, 'cause');
    }

    private calculateRankingKillers(killsByCause: any[]): any[] {
        return this.calculateRanking(killsByCause, 'killer');
    }

    private calculateRanking(items: any[], key: string): any[] {
        const ranking = items.reduce((acc, curr) => {
            const existingItem = acc.find(item => item[key] === curr[key]);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                acc.push({ [key]: curr[key], quantity: 1 });
            }
            return acc;
        }, []);

        return ranking.sort((a, b) => b.quantity - a.quantity);
    }
}
