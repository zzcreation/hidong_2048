export type TileValue = number;

export interface NumberTile {
  kind: 'number';
  value: number;
}

export interface HeroTile {
  kind: 'hero';
  heroId: string;
  value: number;
}

export type Cell = NumberTile | HeroTile | null;
export type Board = Cell[][];

export interface HeroConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  image: string;
  themeClass: string;
  targetValue: number;
  accent: string;
}

export interface HeroSpawnRequest {
  row: number;
  col: number;
  value: number;
}

export interface MoveResult {
  board: Board;
  moved: boolean;
  scoreGain: number;
  createdHeroIds: string[];
  heroSpawnRequests: HeroSpawnRequest[];
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameSnapshot {
  board: Board;
  score: number;
  bestScore: number;
  collectedHeroIds: string[];
  elapsedSeconds: number;
  moveCount: number;
  heroTargetOverrides: Record<string, number>;
}

export interface MoveVisualState {
  boardPulse: number;
  lastMoveDirection: Direction | null;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  finalScore: number;
  moveCount: number;
  elapsedSeconds: number;
  highestTile: number;
  collectedHeroCount: number;
  createdAt: string;
}
