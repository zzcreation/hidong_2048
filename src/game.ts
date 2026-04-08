import { GRID_SIZE } from './config';
import type { Board, Cell, Direction, HeroConfig, HeroSpawnRequest, HeroTile, MoveResult, NumberTile } from './types';

function cloneCell(cell: Cell): Cell {
  if (cell === null) return null;
  return { ...cell };
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map(cloneCell));
}

export function createNumberTile(value: number): NumberTile {
  return { kind: 'number', value };
}

export function createHeroTile(heroId: string, value: number): HeroTile {
  return { kind: 'hero', heroId, value };
}

export function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array<Cell>(GRID_SIZE).fill(null));
}

function isSameCell(a: Cell, b: Cell): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'hero' && b.kind === 'hero') return a.heroId === b.heroId && a.value === b.value;
  return a.value === b.value;
}

function getRandomEmptyCell(board: Board): [number, number] | null {
  const emptyCells: Array<[number, number]> = [];
  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === null) emptyCells.push([rowIndex, colIndex]);
    });
  });
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

export function addRandomTile(board: Board): Board {
  const nextBoard = cloneBoard(board);
  const emptyCell = getRandomEmptyCell(nextBoard);
  if (!emptyCell) return nextBoard;
  const [row, col] = emptyCell;
  nextBoard[row][col] = createNumberTile(Math.random() < 0.9 ? 2 : 4);
  return nextBoard;
}

export function createInitialBoard(): Board {
  let board = createEmptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
}

function cellToComparable(cell: Cell): string {
  if (cell === null) return 'empty';
  if (cell.kind === 'hero') return `hero:${cell.heroId}:${cell.value}`;
  return `number:${cell.value}`;
}

function isHeroTargetValue(value: number, heroes: HeroConfig[]): boolean {
  return heroes.some((item) => item.targetValue === value);
}

function slideAndMergeLine(line: Cell[], heroes: HeroConfig[]): { nextLine: Cell[]; moved: boolean; scoreGain: number; heroSpawnValues: number[] } {
  const compact = line.filter((value): value is Exclude<Cell, null> => value !== null);
  const merged: Cell[] = [];
  let scoreGain = 0;
  const heroSpawnValues: number[] = [];

  for (let index = 0; index < compact.length; index += 1) {
    const current = compact[index];
    const next = compact[index + 1];

    if (
      current && next &&
      current.kind === 'number' &&
      next.kind === 'number' &&
      current.value === next.value
    ) {
      const mergedValue = current.value * 2;
      merged.push(createNumberTile(mergedValue));
      scoreGain += mergedValue;
      if (isHeroTargetValue(mergedValue, heroes)) heroSpawnValues.push(mergedValue);
      index += 1;
    } else {
      merged.push(cloneCell(current));
    }
  }

  while (merged.length < GRID_SIZE) merged.push(null);
  const nextLine = merged;
  const moved = line.some((value, idx) => cellToComparable(value) !== cellToComparable(nextLine[idx]));
  return { nextLine, moved, scoreGain, heroSpawnValues };
}

function getLine(board: Board, direction: Direction, index: number): Cell[] {
  switch (direction) {
    case 'left':
      return board[index].map(cloneCell);
    case 'right':
      return [...board[index]].reverse().map(cloneCell);
    case 'up':
      return board.map((row) => cloneCell(row[index]));
    case 'down':
      return board.map((row) => cloneCell(row[index])).reverse();
  }
}

function setLine(board: Board, direction: Direction, index: number, line: Cell[]): void {
  switch (direction) {
    case 'left':
      board[index] = line.map(cloneCell);
      break;
    case 'right':
      board[index] = [...line].reverse().map(cloneCell);
      break;
    case 'up':
      line.forEach((value, rowIndex) => {
        board[rowIndex][index] = cloneCell(value);
      });
      break;
    case 'down':
      [...line].reverse().forEach((value, rowIndex) => {
        board[rowIndex][index] = cloneCell(value);
      });
      break;
  }
}

function collectHeroSpawnRequests(board: Board, heroSpawnValues: number[]): HeroSpawnRequest[] {
  const requests: HeroSpawnRequest[] = [];
  const remainingValues = [...heroSpawnValues];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = board[row][col];
      if (cell?.kind !== 'number') continue;
      const matchIndex = remainingValues.indexOf(cell.value);
      if (matchIndex === -1) continue;
      requests.push({ row, col, value: cell.value });
      remainingValues.splice(matchIndex, 1);
    }
  }

  return requests;
}

export function moveBoard(board: Board, direction: Direction, heroes: HeroConfig[]): MoveResult {
  const nextBoard = createEmptyBoard();
  let moved = false;
  let scoreGain = 0;
  const heroSpawnValues: number[] = [];

  for (let index = 0; index < GRID_SIZE; index += 1) {
    const line = getLine(board, direction, index);
    const result = slideAndMergeLine(line, heroes);
    setLine(nextBoard, direction, index, result.nextLine);
    moved = moved || result.moved;
    scoreGain += result.scoreGain;
    heroSpawnValues.push(...result.heroSpawnValues);
  }

  return {
    board: nextBoard,
    moved,
    scoreGain,
    createdHeroIds: [],
    heroSpawnRequests: collectHeroSpawnRequests(nextBoard, heroSpawnValues),
  };
}

export function canMove(board: Board): boolean {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const current = board[row][col];
      if (current === null) return true;
      const right = col + 1 < GRID_SIZE ? board[row][col + 1] : null;
      const down = row + 1 < GRID_SIZE ? board[row + 1][col] : null;

      if (right && current.kind === 'number' && right.kind === 'number' && current.value === right.value) return true;
      if (down && current.kind === 'number' && down.kind === 'number' && current.value === down.value) return true;
    }
  }
  return false;
}

export function getHighestTile(board: Board): number {
  return board.flat().reduce<number>((max, cell) => (cell !== null && cell.value > max ? cell.value : max), 0);
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function calculateFinalScore(score: number, elapsedSeconds: number, collectedCount: number): number {
  const speedBonus = Math.max(0, 360 - elapsedSeconds) * 3;
  const collectionBonus = collectedCount * 500;
  return score + speedBonus + collectionBonus;
}

export function isHeroUnlocked(hero: HeroConfig, highestTile: number, collectedHeroIds: string[]): boolean {
  return collectedHeroIds.includes(hero.id) || highestTile >= hero.targetValue;
}

export function boardsEqual(a: Board, b: Board): boolean {
  return a.every((row, rowIndex) => row.every((cell, colIndex) => isSameCell(cell, b[rowIndex][colIndex])));
}
