import { isHeroUnlocked } from '../game';
import type { HeroConfig } from '../types';

interface HeroCollectionPanelProps {
  heroes: HeroConfig[];
  collectedHeroIds: string[];
  highestTile: number;
  lastCollectedHeroId: string | null;
}

export function HeroCollectionPanel({
  heroes,
  collectedHeroIds,
  highestTile,
  lastCollectedHeroId,
}: HeroCollectionPanelProps) {
  const heroCards = heroes.map((hero) => {
    const collected = collectedHeroIds.includes(hero.id);
    const unlocked = isHeroUnlocked(hero, highestTile, collectedHeroIds);
    const highlighted = lastCollectedHeroId === hero.id;
    return { hero, collected, unlocked, highlighted };
  });

  return (
    <>
      <div className="collection-header">
        <h2>英雄图鉴</h2>
        <span>{collectedHeroIds.length} / {heroes.length}</span>
      </div>
      <div className="celebration-strip">
        {collectedHeroIds.length === 0
          ? '还没收集到英雄，先冲第一个！'
          : `已点亮 ${collectedHeroIds.length} 位英雄，还差 ${heroes.length - collectedHeroIds.length} 位。`}
      </div>
      <div className="hero-list">
        {heroCards.map(({ hero, collected, unlocked, highlighted }) => (
          <article
            key={hero.id}
            className={`hero-card ${collected ? 'collected' : ''} ${highlighted ? 'highlighted' : ''}`}
            style={{ ['--hero-accent' as string]: hero.accent }}
          >
            <div className="hero-thumb">
              <img src={hero.image} alt={hero.title} />
            </div>
            <div className="hero-meta">
              <div className="hero-topline">
                <span className="hero-name">{hero.name}</span>
                <span className="hero-target">{hero.targetValue}</span>
              </div>
              <strong>{hero.title}</strong>
              <p>{hero.description}</p>
              <div className="hero-status-row">
                <span className={`pill ${collected ? 'done' : unlocked ? 'warm' : ''}`}>
                  {collected ? '已收集' : unlocked ? '接近达成' : '未解锁'}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
