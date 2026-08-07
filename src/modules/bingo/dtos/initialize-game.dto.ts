export class InitializeGameDto {
  state?: string;
  currentRound?: number;
  rounds?: Array<{
    roundNumber: number;
    number: number;
    drawnAt?: string | Date;
  }>;
  winners?: Array<{
    playerId: string;
    cardId: string;
    winType: string;
    prizeAmount: number;
  }>;
  prizes?: {
    line?: number;
    doubleLine?: number;
    bingo?: number;
    superbingo?: number;
  };
  resultSummary?: Record<string, any>;
  drawnNumbers?: number[];
  currentBall?: number | null;
  superbingoThreshold?: number | null;
  superbingoPoolAmount?: number;
  persistedSnapshot?: Record<string, any>;
  startAt?: string | Date;
  endAt?: string | Date;
}
