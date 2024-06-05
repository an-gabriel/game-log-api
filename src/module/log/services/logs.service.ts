import { Injectable } from '@nestjs/common';
import { LogProcessedEvent } from '../events/log-processed.event';
import { EventBus } from '@nestjs/cqrs';
import * as fs from 'fs';

@Injectable()
export class LogsService {
    private logs: string[];

    constructor(private readonly eventBus: EventBus) { }

    setLogs(logs: string[]) {
        this.logs = logs;
    }

    async fetchLogsFromFile(filePath: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.split('\n'));
                }
            });
        });
    }

    getAllLogs() {
        return this.logs;
    }

    emitLogProcessedEvent(logs: string[]) {
        this.eventBus.publish(new LogProcessedEvent(logs));
    }

    getInitGames() {
        return this.logs.filter(log => log.includes('InitGame'));
    }

    getClientConnections() {
        return this.logs.filter(log => log.includes('ClientConnect'));
    }

    getItemsCollected(playerId: string) {
        return this.logs.filter(log => log.includes(`Item: ${playerId}`));
    }

    getKills() {
        return this.logs.filter(log => log.includes('Kill'));
    }

    getKillStats() {
        const totalKills = this.logs.filter(log => log.includes('Kill')).length;
        const killsByCause = {};
        const killsByPlayer = {};
        let killsByWorld = 0;

        this.logs.forEach(log => {
            const parts = log.split(' ');
            const causeIndex = parts.indexOf('by');
            if (causeIndex !== -1 && parts[causeIndex + 1] !== '<world>') {
                const cause = parts[causeIndex + 1];
                killsByCause[cause] = (killsByCause[cause] || 0) + 1;
            } else if (causeIndex !== -1 && parts[causeIndex + 1] === '<world>') {
                killsByWorld++;
            }

            const killerIndex = parts.indexOf('killed');
            if (killerIndex !== -1) {
                const player = parts[killerIndex + 1];
                killsByPlayer[player] = (killsByPlayer[player] || 0) + 1;
            }
        });

        return {
            totalKills,
            killsByCause,
            killsByPlayer,
            killsByWorld
        };
    }


    groupLogsByGame(): string[][] {
        const games = [];
        let currentGameLogs = [];

        for (const log of this.logs) {
            if (log.includes('InitGame')) {
                // Inicia um novo conjunto de logs para um novo jogo
                currentGameLogs = [];
            }

            // Adiciona o log atual ao conjunto de logs do jogo atual
            currentGameLogs.push(log);

            if (log.includes('ShutdownGame')) {
                // Finaliza o jogo e adiciona o conjunto de logs ao array de jogos
                games.push([...currentGameLogs]);
            }
        }

        return games.reverse();;
    }


    getGameStatistics(): any[] {
        const games = this.groupLogsByGame();
        return games.map(game => this.calculateGameStatistics(game));
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

    private calculateTotalKills(gameLogs: string[]): number {
        return gameLogs.filter(log => log.includes('Kill')).length;
    }

    private calculateKillsByCause(gameLogs: string[]): any[] {
        const killsByCause = [];

        gameLogs.forEach(log => {
            const parts = log.split(' ');
            const killIndex = parts.indexOf('Kill:');

            if (killIndex !== -1) {
                const [killerName, killedName] = log.split(":")[log.split(":").length - 1].split(' killed ');
                const [killed, causeOfDeath] = killedName.split(' by ');

                if (!causeOfDeath.startsWith('<world>')) {
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
        return gameLogs.filter(log => log.includes('<world>')).length;
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
