declare module 'gamedig' {
  export interface GameDigPlayer {
    name?: string;
    ping?: number;
  }

  export interface GameDigQueryResult {
    numplayers?: number;
    maxplayers?: number;
    players?: GameDigPlayer[];
  }

  export class GameDig {
    static query(options: {
      type: string;
      host: string;
      port: number;
      socketTimeout?: number;
      attemptTimeout?: number;
      requestPlayers?: boolean;
    }): Promise<GameDigQueryResult>;
  }
}
