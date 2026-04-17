import { formatLeaderboardDate, formatLeaderboardMeta } from '../leaderboard';
import type { LeaderboardEntry } from '../types';

interface LeaderboardPanelProps {
  leaderboard: LeaderboardEntry[];
}

export function LeaderboardPanel({ leaderboard }: LeaderboardPanelProps) {
  return (
    <div className="card-panel leaderboard-panel">
      <div className="leaderboard-header">
        <div>
          <div className="eyebrow small">LOCAL RANKING</div>
          <h2>本地排行榜</h2>
        </div>
        <span>{leaderboard.length} / 10</span>
      </div>
      {leaderboard.length === 0 ? (
        <div className="leaderboard-empty">还没有通关成绩，冲一把成为榜一吧。</div>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => {
            const isWon = entry.outcome !== 'lost';
            return (
              <article key={entry.id} className="leaderboard-item">
                <div className="leaderboard-rank">#{index + 1}</div>
                <div className="leaderboard-main">
                  <div className="leaderboard-topline">
                    <div className="leaderboard-nickline">
                      <strong>{entry.nickname}</strong>
                      <span className={`pill ${isWon ? 'done' : ''}`}>
                        {isWon ? '🏆 通关' : '未通关'}
                      </span>
                    </div>
                    <span>{entry.finalScore}</span>
                  </div>
                  <div className="leaderboard-subline">
                    <span>原始分 {entry.score}</span>
                    <span>{formatLeaderboardMeta(entry)}</span>
                  </div>
                </div>
                <time>{formatLeaderboardDate(entry.createdAt)}</time>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
