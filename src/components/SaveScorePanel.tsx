interface SaveScorePanelProps {
  nickname: string;
  onNicknameChange: (value: string) => void;
  onSave: () => void;
  hasSaved: boolean;
  outcome: 'won' | 'lost';
}

export function SaveScorePanel({ nickname, onNicknameChange, onSave, hasSaved, outcome }: SaveScorePanelProps) {
  const saveLabel = hasSaved
    ? '本局已保存'
    : outcome === 'won'
      ? '保存到排行榜'
      : '记录这一局成绩';

  return (
    <div className="win-save-panel">
      <label className="save-form-field">
        <span>昵称</span>
        <input
          value={nickname}
          maxLength={16}
          placeholder="玩家"
          onChange={(event) => onNicknameChange(event.target.value)}
        />
      </label>
      <button className="secondary-btn save-btn" onClick={onSave} disabled={hasSaved}>
        {saveLabel}
      </button>
    </div>
  );
}
