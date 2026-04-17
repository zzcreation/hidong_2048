import { formatTime } from '../game';

interface StatsModalProps {
  score: number;
  bestScore: number;
  highestTile: number;
  moveCount: number;
  elapsedSeconds: number;
  finalScore: number;
  hasAnyHistory: boolean;
  onClose: () => void;
}

export function StatsModal({
  score,
  bestScore,
  highestTile,
  moveCount,
  elapsedSeconds,
  finalScore,
  hasAnyHistory,
  onClose,
}: StatsModalProps) {
  const bestScoreDisplay = hasAnyHistory || bestScore > 0 ? String(bestScore) : '——';
  const highestTileDisplay = highestTile > 0 ? String(highestTile) : '——';

  return (
    <div className="desktop-settings-backdrop" onClick={onClose}>
      <div className="desktop-settings-modal card-panel" onClick={(event) => event.stopPropagation()}>
        <div className="desktop-settings-header">
          <div>
            <div className="eyebrow small">STATS</div>
            <h2>详细数据</h2>
          </div>
          <button className="menu-btn close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="stats-modal-grid">
          <div className="score-card"><span>当前分数</span><strong>{score}</strong></div>
          <div className="score-card"><span>步数</span><strong>{moveCount}</strong></div>
          <div className="score-card"><span>用时</span><strong>{formatTime(elapsedSeconds)}</strong></div>
          <div className="score-card"><span>最高数值</span><strong>{highestTileDisplay}</strong></div>
          <div className="score-card muted"><span>最佳分数</span><strong>{bestScoreDisplay}</strong></div>
          <div className="score-card accent"><span>通关结算预估</span><strong>{finalScore}</strong></div>
        </div>
        <p className="hint-text">结算预估 = 原始分 + 速通奖励 + 英雄收集奖励。通关越快、收集越多，加成越高。</p>
      </div>
    </div>
  );
}
