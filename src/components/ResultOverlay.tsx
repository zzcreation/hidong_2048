import { formatTime } from '../game';
import { SaveScorePanel } from './SaveScorePanel';

interface ResultOverlayProps {
  outcome: 'won' | 'lost';
  score: number;
  moveCount: number;
  elapsedSeconds: number;
  nickname: string;
  onNicknameChange: (value: string) => void;
  onSave: () => void;
  hasSaved: boolean;
  onReset: () => void;
  mobile?: boolean;
}

export function ResultOverlay({
  outcome,
  score,
  moveCount,
  elapsedSeconds,
  nickname,
  onNicknameChange,
  onSave,
  hasSaved,
  onReset,
  mobile = false,
}: ResultOverlayProps) {
  const title = outcome === 'won' ? '四位英雄已集齐！' : '棋盘堵住了';
  const description = outcome === 'won'
    ? '恭喜通关，嗨咚英雄全员登场。'
    : '这一局没有更多可移动的空间了，随时再来一把。';

  return (
    <div className={`overlay-panel ${mobile ? 'mobile-overlay' : ''}`}>
      <div className="overlay-card">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="result-metrics">
          <span>分数 {score}</span>
          <span>步数 {moveCount}</span>
          <span>用时 {formatTime(elapsedSeconds)}</span>
        </div>
        <SaveScorePanel
          nickname={nickname}
          onNicknameChange={onNicknameChange}
          onSave={onSave}
          hasSaved={hasSaved}
          outcome={outcome}
        />
        <button className="primary-btn" onClick={onReset}>再来一局</button>
      </div>
    </div>
  );
}
