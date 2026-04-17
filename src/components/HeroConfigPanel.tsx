import { DEFAULT_HERO_TARGET, HERO_TARGET_OPTIONS } from '../config';
import type { HeroConfig } from '../types';

interface HeroConfigPanelProps {
  heroes: HeroConfig[];
  heroTargetOverrides: Record<string, number>;
  onChange: (heroId: string, targetValue: number) => void;
  onReset: () => void;
  compact?: boolean;
}

export function HeroConfigPanel({
  heroes,
  heroTargetOverrides,
  onChange,
  onReset,
  compact = false,
}: HeroConfigPanelProps) {
  return (
    <div className={`config-panel ${compact ? 'compact' : ''}`}>
      <div className="config-title-row">
        <strong>英雄目标值配置</strong>
        <button className="text-btn" onClick={onReset}>恢复默认</button>
      </div>
      <div className="config-grid">
        {heroes.map((hero) => (
          <label key={hero.id} className="config-item">
            <span>{hero.name}</span>
            <select
              value={heroTargetOverrides[hero.id] ?? DEFAULT_HERO_TARGET}
              onChange={(event) => onChange(hero.id, Number(event.target.value))}
            >
              {HERO_TARGET_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
