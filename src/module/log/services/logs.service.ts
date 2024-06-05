import { Injectable } from '@nestjs/common';
import { LogProcessedEvent } from '../events/log-processed.event';
import { EventBus } from '@nestjs/cqrs';
import { ProcessLogCommand } from '../commands/process-log.command';
import { CommandBus } from '@nestjs/cqrs';

import * as fs from 'fs';
import fetch from 'node-fetch';
import * as path from 'path';

@Injectable()
export class LogsService {
    private logs: string[];

    // Constantes para strings repetidas
    private readonly KILL_LOG_IDENTIFIER = 'Kill';
    private readonly INIT_GAME_IDENTIFIER = 'InitGame';
    private readonly SHUTDOWN_GAME_IDENTIFIER = 'ShutdownGame';
    private readonly WORLD_IDENTIFIER = '<world>';
    private readonly MAGIC_COUNT_NUMBER = 1;

    constructor(
        private readonly eventBus: EventBus,
        private readonly commandBus: CommandBus,
    ) { }

    async processLog() {
        const url =
            'https://raw.githubusercontent.com/rubcube/hiring-exercises/master/backend/games.log';
        const filePath = path.resolve(__dirname, '../../data/games.log');

        try {
            console.log(`Starting download from URL: ${url}`);

            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`Failed to fetch file: ${response.statusText}`);

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
            throw new Error(error.message);
        }
    }

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

    getItemsCollected(playerId: string): string[] {
        return this.logs.filter((log) => log.includes(`Item: ${playerId}`));
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
        const totalGames = games.length + this.MAGIC_COUNT_NUMBER;

        const statistics = games.map((game) => this.calculateGameStatistics(game));

        return {
            totalGames,
            statistics,
        };
    }

    getGameStatisticsById(gameId: number): any {
        const games = this.groupLogsByGame();
        const gameLogs = games[gameId];
        if (!gameLogs) {
            throw new Error(`Game with ID ${gameId} not found.`);
        }
        return this.calculateGameStatistics(gameLogs);
    }

    getGameRankingById(gameId: number): any {
        const games = this.groupLogsByGame();
        const gameLogs = games[gameId];
        if (!gameLogs) {
            throw new Error(`Game with ID ${gameId} not found.`);

        }

        const killsByCause = this.calculateKillsByCause(gameLogs);
        const ranking = this.calculateGameRanking(gameLogs)

        return { ranking, killsByCause };
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
            rankingKillers,
        };
    }

    private calculateTotalKills(gameLogs: string[]): number {
        return gameLogs.filter((log) => log.includes(this.KILL_LOG_IDENTIFIER))
            .length;
    }

    private calculateKillsByCause(gameLogs: string[]): any[] {
        const killsByCause = [];

        gameLogs.forEach((log) => {
            const parts = log.split(' ');
            const killIndex = parts.indexOf(`${this.KILL_LOG_IDENTIFIER}:`); if (killIndex !== -1) {
                const [killerName, killedName] = log.split(':')
                [log.split(':').length - 1].split(' killed ');
                const [killed, causeOfDeath] = killedName.split(' by ');

                if (!causeOfDeath.startsWith(this.WORLD_IDENTIFIER)) {
                    killsByCause.push({
                        killer: killerName.trim(),
                        killed: killed.trim(),
                        cause: causeOfDeath.trim(),
                    });
                }
            }
        });

        return killsByCause;
    }

    private calculateKillsByWorld(gameLogs: string[]): number {
        return gameLogs.filter((log) => log.includes(this.WORLD_IDENTIFIER)).length;
    }

    private calculateRankingCauses(killsByCause: any[]): any[] {
        return this.calculateRanking(killsByCause, 'cause');
    }

    private calculateRankingKillers(killsByCause: any[]): any[] {
        return this.calculateRanking(killsByCause, 'killer');
    }

    private calculateRanking(items: any[], key: string): any[] {
        const ranking = items.reduce((acc, curr) => {
            const existingItem = acc.find((item) => item[key] === curr[key]);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                acc.push({ [key]: curr[key], quantity: 1 });
            }
            return acc;
        }, []);

        return ranking.sort((a, b) => b.quantity - a.quantity);
    }

    private calculateGameRanking(gameLogs: string[]): any[] {
        const playerScores = {};

        gameLogs.forEach((log) => {
            if (log.includes(this.KILL_LOG_IDENTIFIER)) {
                const [killer, killed, cause] = this.extractKillerKilledAndCause(log);

                if (!playerScores[killer]) playerScores[killer] = 0;
                if (!playerScores[killed]) playerScores[killed] = 0;

                if (killed === this.WORLD_IDENTIFIER) {
                    playerScores[killer]++;
                } else {
                    playerScores[killer]++;
                    playerScores[killed]--;
                }
            }
        });

        // Remove o <world> do ranking
        delete playerScores[this.WORLD_IDENTIFIER];

        // Remove os nomes anteriores de cada jogador e mantém apenas o último nome
        const players = Object.keys(playerScores);
        const lastNames = players.map((player) => player.split(' ').pop());
        players.forEach((player, index) => {
            if (player !== lastNames[index]) {
                playerScores[lastNames[index]] = playerScores[player];
                delete playerScores[player];
            }
        });

        const ranking = Object.keys(playerScores).map((player) => ({
            player,
            score: playerScores[player],
        })).sort((a, b) => b.score - a.score);

        return ranking;
    }


    private extractKillerKilledAndCause(log: string): [string, string, string] {
        const [killerPart, killedPart] = log.split(' killed ');
        const killer = killerPart.split(':').pop().trim();
        const [killed, cause] = killedPart.split(' by ');
        return [killer, killed, cause.trim()];
    }
}
