import { formatTime } from './game';
import type { LeaderboardEntry } from './types';

export const LEADERBOARD_STORAGE_KEY = 'hidong-2048-leaderboard';
export const LEADERBOARD_LIMIT = 10;

export function readLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.finalScore === 'number')
      .sort((a, b) => b.finalScore - a.finalScore || a.elapsedSeconds - b.elapsedSeconds || a.moveCount - b.moveCount)
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

export function writeLeaderboard(entries: LeaderboardEntry[]) {
  window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries.slice(0, LEADERBOARD_LIMIT)));
}

export function saveLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const next = [...readLeaderboard(), entry]
    .sort((a, b) => b.finalScore - a.finalScore || a.elapsedSeconds - b.elapsedSeconds || a.moveCount - b.moveCount)
    .slice(0, LEADERBOARD_LIMIT);
  writeLeaderboard(next);
  return next;
}

export function createLeaderboardEntry(input: Omit<LeaderboardEntry, 'id' | 'createdAt'>): LeaderboardEntry {
  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
}

export function formatLeaderboardDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function formatLeaderboardMeta(entry: LeaderboardEntry): string {
  return `${formatTime(entry.elapsedSeconds)} · ${entry.moveCount}步 · ${entry.highestTile}`;
}
