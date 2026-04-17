interface RulesPanelProps {
  showHint: boolean;
}

export function RulesPanel({ showHint }: RulesPanelProps) {
  return (
    <div className="card-panel rule-panel">
      <h2>玩法简介</h2>
      <p className="subtitle compact-copy">
        保留经典 2048 合并规则，但英雄一旦被合成出来，就会变成不可再合并的特殊方块，只会跟着棋盘移动。四位英雄全部收集，即可通关。
      </p>
      <ul>
        <li>桌面端用方向键 / WASD，移动端直接滑动棋盘。</li>
        <li>普通数字方块按 2048 规则合并。</li>
        <li>一旦合成到英雄目标值，就会变成英雄方块。</li>
        <li>英雄方块不会再继续合并，只会随棋盘滑动。</li>
        <li>收集 4 位不同英雄即通关。</li>
      </ul>
      {showHint && <p className="hint-text">已修改难度配置，新开一局后会按新规则生效。</p>}
    </div>
  );
}
