import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_HERO_TARGET, HERO_TARGET_OPTIONS, STORAGE_KEY, createDefaultHeroTargetOverrides, withHeroTargets } from './config';
import { addRandomTile, calculateFinalScore, canMove, createHeroTile, createInitialBoard, formatTime, getHighestTile, isHeroUnlocked, moveBoard } from './game';
import type { Board, Direction, GameSnapshot, MoveVisualState } from './types';

const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right',
};

function readSnapshot(): GameSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: GameSnapshot) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function createFreshState() {
  return {
    board: createInitialBoard(),
    score: 0,
    bestScore: 0,
    collectedHeroIds: [] as string[],
    elapsedSeconds: 0,
    moveCount: 0,
  };
}

function GameBoard({
  board,
  heroes,
  visualState,
  onTouchStart,
  onTouchEnd,
}: {
  board: Board;
  heroes: ReturnType<typeof withHeroTargets>;
  visualState: MoveVisualState;
  onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`board-grid move-${visualState.lastMoveDirection ?? 'idle'}`}
      data-pulse={visualState.boardPulse}
      role="application"
      aria-label="2048 board"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {board.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const hero = cell?.kind === 'hero' ? heroes.find((item) => item.id === cell.heroId) : null;
          return (
            <div key={`${rowIndex}-${colIndex}`} className={`tile ${cell ? `tile-${cell.value}` : 'tile-empty'} ${hero ? hero.themeClass : ''}`}>
              {hero ? (
                <div className="hero-tile-content">
                  <img src={hero.image} alt={hero.title} />
                </div>
              ) : cell?.kind === 'number' ? (
                <span>{cell.value}</span>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

function HeroConfigPanel({
  heroes,
  heroTargetOverrides,
  onChange,
  onReset,
  compact = false,
}: {
  heroes: ReturnType<typeof withHeroTargets>;
  heroTargetOverrides: Record<string, number>;
  onChange: (heroId: string, targetValue: number) => void;
  onReset: () => void;
  compact?: boolean;
}) {
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
            <select value={heroTargetOverrides[hero.id] ?? DEFAULT_HERO_TARGET} onChange={(event) => onChange(hero.id, Number(event.target.value))}>
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

function HeroCollectionPanel({
  heroes,
  collectedHeroIds,
  highestTile,
  lastCollectedHeroId,
}: {
  heroes: ReturnType<typeof withHeroTargets>;
  collectedHeroIds: string[];
  highestTile: number;
  lastCollectedHeroId: string | null;
}) {
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
        {collectedHeroIds.length === 0 ? '还没收集到英雄，先冲第一个！' : `已点亮 ${collectedHeroIds.length} 位英雄，还差 ${heroes.length - collectedHeroIds.length} 位。`}
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

function RulesPanel({ onReset, showHint }: { onReset: () => void; showHint: boolean }) {
  return (
    <div className="card-panel rule-panel">
      <h2>规则说明</h2>
      <ul>
        <li>桌面端用方向键 / WASD，移动端直接滑动棋盘。</li>
        <li>普通数字方块按 2048 规则合并。</li>
        <li>一旦合成到英雄目标值，就会变成英雄方块。</li>
        <li>英雄方块不会再继续合并，只会随棋盘滑动。</li>
        <li>收集 4 位不同英雄即通关。</li>
      </ul>
      <div className="action-row dual-actions">
        <button className="secondary-btn" onClick={onReset}>默认难度</button>
      </div>
      {showHint && <p className="hint-text">已修改难度配置，新开一局后会按新规则生效。</p>}
    </div>
  );
}

export default function App() {
  const saved = typeof window !== 'undefined' ? readSnapshot() : null;
  const initial = createFreshState();
  const initialOverrides = saved?.heroTargetOverrides ?? createDefaultHeroTargetOverrides();

  const [board, setBoard] = useState<Board>(saved?.board ?? initial.board);
  const [score, setScore] = useState(saved?.score ?? initial.score);
  const [bestScore, setBestScore] = useState(saved?.bestScore ?? initial.bestScore);
  const [collectedHeroIds, setCollectedHeroIds] = useState<string[]>(saved?.collectedHeroIds ?? initial.collectedHeroIds);
  const [elapsedSeconds, setElapsedSeconds] = useState(saved?.elapsedSeconds ?? initial.elapsedSeconds);
  const [moveCount, setMoveCount] = useState(saved?.moveCount ?? initial.moveCount);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastCollectedHeroId, setLastCollectedHeroId] = useState<string | null>(null);
  const [visualState, setVisualState] = useState<MoveVisualState>({ boardPulse: 0, lastMoveDirection: null });
  const [heroTargetOverrides, setHeroTargetOverrides] = useState<Record<string, number>>(initialOverrides);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSettingsOpen, setDesktopSettingsOpen] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const clearHighlightRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const heroes = useMemo(() => withHeroTargets(heroTargetOverrides), [heroTargetOverrides]);

  const playBeep = useCallback((frequency: number, duration = 0.08, type: OscillatorType = 'sine') => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioRef.current) audioRef.current = new AudioContextClass();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = 0.0001;
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore audio failures
    }
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (gameWon || gameOver) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameWon, gameOver]);

  useEffect(() => {
    writeSnapshot({ board, score, bestScore, collectedHeroIds, elapsedSeconds, moveCount, heroTargetOverrides });
  }, [board, score, bestScore, collectedHeroIds, elapsedSeconds, moveCount, heroTargetOverrides]);

  useEffect(() => () => {
    if (clearHighlightRef.current) {
      window.clearTimeout(clearHighlightRef.current);
    }
  }, []);

  const resetGame = useCallback(() => {
    const fresh = createFreshState();
    setBoard(fresh.board);
    setScore(0);
    setCollectedHeroIds([]);
    setElapsedSeconds(0);
    setMoveCount(0);
    setGameWon(false);
    setGameOver(false);
    setLastCollectedHeroId(null);
    setVisualState({ boardPulse: Date.now(), lastMoveDirection: null });
    playBeep(420, 0.12, 'triangle');
  }, [playBeep]);

  const highestTile = useMemo(() => getHighestTile(board), [board]);
  const finalScore = useMemo(() => calculateFinalScore(score, elapsedSeconds, collectedHeroIds.length), [score, elapsedSeconds, collectedHeroIds.length]);
  const configChanged = score > 0 || moveCount > 0 || collectedHeroIds.length > 0;

  const move = useCallback((direction: Direction) => {
    if (gameWon || gameOver) return;

    const result = moveBoard(board, direction, heroes);
    if (!result.moved) {
      playBeep(180, 0.05, 'square');
      return;
    }

    const resolvedBoard = result.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    const nextHeroIds = [...collectedHeroIds];
    let newlyCollected: string | null = null;

    result.heroSpawnRequests.forEach(({ row, col, value }) => {
      const candidate = heroes.find((hero) => hero.targetValue === value && !nextHeroIds.includes(hero.id));
      if (!candidate) return;
      resolvedBoard[row][col] = createHeroTile(candidate.id, value);
      nextHeroIds.push(candidate.id);
      newlyCollected = candidate.id;
    });

    const nextBoard = addRandomTile(resolvedBoard);

    const nextScore = score + result.scoreGain;
    const nextBest = Math.max(bestScore, nextScore);
    const won = nextHeroIds.length === heroes.length;
    const stuck = !won && !canMove(nextBoard);

    setBoard(nextBoard);
    setScore(nextScore);
    setBestScore(nextBest);
    setCollectedHeroIds(nextHeroIds);
    setMoveCount((value) => value + 1);
    setGameWon(won);
    setGameOver(stuck);
    setLastCollectedHeroId(newlyCollected);
    setVisualState({ boardPulse: Date.now(), lastMoveDirection: direction });

    if (clearHighlightRef.current) window.clearTimeout(clearHighlightRef.current);
    if (newlyCollected) {
      playBeep(660, 0.14, 'triangle');
      clearHighlightRef.current = window.setTimeout(() => setLastCollectedHeroId(null), 1400);
    } else if (result.scoreGain > 0) {
      playBeep(320, 0.08, 'sine');
    } else {
      playBeep(220, 0.06, 'square');
    }

    if (won) {
      window.setTimeout(() => playBeep(880, 0.18, 'triangle'), 60);
      window.setTimeout(() => playBeep(1174, 0.24, 'triangle'), 180);
    }
    if (stuck) window.setTimeout(() => playBeep(140, 0.25, 'sawtooth'), 80);
  }, [bestScore, board, collectedHeroIds, gameOver, gameWon, heroes, playBeep, score]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = DIRECTIONS[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move]);

  const handleTargetChange = (heroId: string, targetValue: number) => {
    setHeroTargetOverrides((current) => ({
      ...current,
      [heroId]: targetValue,
    }));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const threshold = 24;

    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      move(deltaX > 0 ? 'right' : 'left');
    } else {
      move(deltaY > 0 ? 'down' : 'up');
    }

    touchStartRef.current = null;
  };

  return (
    <div className={`page-shell ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
      <div className="page-glow glow-a" />
      <div className="page-glow glow-b" />
      <main className={`app-shell ${isMobile ? 'mobile-shell' : ''}`}>
        {!isMobile ? (
          <>
            <section className="desktop-topbar card-panel">
              <div className="desktop-topbar-copy">
                <div className="eyebrow">HIDONG 2048</div>
                <h1>嗨咚豆豆英雄收集战</h1>
              </div>
              <div className="dashboard-metrics compact">
                <div className="metric-card primary"><span>当前分数</span><strong>{score}</strong></div>
                <div className="metric-card"><span>最佳分数</span><strong>{bestScore}</strong></div>
                <div className="metric-card"><span>最高数值</span><strong>{highestTile || 0}</strong></div>
                <div className="metric-card"><span>步数</span><strong>{moveCount}</strong></div>
                <div className="metric-card"><span>用时</span><strong>{formatTime(elapsedSeconds)}</strong></div>
                <div className="metric-card accent"><span>预估结算</span><strong>{finalScore}</strong></div>
              </div>
              <button className="settings-fab" onClick={() => setDesktopSettingsOpen(true)} aria-label="Open settings">⚙️</button>
            </section>

            <section className="dashboard-grid">
              <aside className="left-column">
                <div className="card-panel collection-panel desktop-collection-panel">
                  <HeroCollectionPanel heroes={heroes} collectedHeroIds={collectedHeroIds} highestTile={highestTile} lastCollectedHeroId={lastCollectedHeroId} />
                </div>
              </aside>

              <section className="game-column">
                <div className="board-frame card-panel">
                  <div className="board-header">
                    <div>
                      <span className="label">英雄收集进度</span>
                      <strong>{collectedHeroIds.length} / {heroes.length}</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${(collectedHeroIds.length / heroes.length) * 100}%` }} />
                    </div>
                  </div>
                  <GameBoard board={board} heroes={heroes} visualState={visualState} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
                  {(gameWon || gameOver) && (
                    <div className="overlay-panel">
                      <div className="overlay-card">
                        <h2>{gameWon ? '四位英雄已集齐！' : '棋盘堵住了'}</h2>
                        <p>{gameWon ? '恭喜通关，嗨咚英雄全员登场。' : '这一局没有更多可移动的空间了，随时再来一把。'}</p>
                        <div className="result-metrics"><span>分数 {score}</span><span>步数 {moveCount}</span><span>用时 {formatTime(elapsedSeconds)}</span></div>
                        <button className="primary-btn" onClick={resetGame}>再来一局</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="right-column">
                <div className="card-panel scoreboard-panel desktop-score-panel">
                  <div className="score-card"><span>当前分数</span><strong>{score}</strong></div>
                  <div className="score-card muted"><span>最佳分数</span><strong>{bestScore}</strong></div>
                  <div className="score-card"><span>最高数值</span><strong>{highestTile || 0}</strong></div>
                  <div className="score-card"><span>步数</span><strong>{moveCount}</strong></div>
                  <div className="score-card"><span>用时</span><strong>{formatTime(elapsedSeconds)}</strong></div>
                  <div className="score-card accent"><span>通关结算预估</span><strong>{finalScore}</strong></div>
                </div>
                <section className="hero-intro card-panel desktop-bottom-info">
                  <div>
                    <h2>游戏介绍</h2>
                    <p className="subtitle compact-copy">
                      保留经典 2048 合并规则，但英雄一旦被合成出来，就会变成不可再合并的特殊方块，只会跟着棋盘移动。四位英雄全部收集，即可通关。
                    </p>
                  </div>
                </section>
                <RulesPanel onReset={() => setHeroTargetOverrides(createDefaultHeroTargetOverrides())} showHint={configChanged} />
              </aside>
            </section>

            {desktopSettingsOpen && (
              <div className="desktop-settings-backdrop" onClick={() => setDesktopSettingsOpen(false)}>
                <div className="desktop-settings-modal card-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-settings-header">
                    <div>
                      <div className="eyebrow small">SETTINGS</div>
                      <h2>英雄配置</h2>
                    </div>
                    <button className="menu-btn close" onClick={() => setDesktopSettingsOpen(false)}>×</button>
                  </div>
                  <HeroConfigPanel heroes={heroes} heroTargetOverrides={heroTargetOverrides} onChange={handleTargetChange} onReset={() => setHeroTargetOverrides(createDefaultHeroTargetOverrides())} />
                  {configChanged && <p className="hint-text">难度修改将在新开一局后生效。</p>}
                </div>
              </div>
            )}
          </>
        ) : (
          <section className="mobile-game-layout">
            <header className="mobile-topbar card-panel">
              <div>
                <div className="eyebrow small">HIDONG 2048</div>
                <strong className="mobile-title">嗨咚英雄收集战</strong>
              </div>
              <button className="menu-btn" onClick={() => setMobileMenuOpen(true)}>☰</button>
            </header>

            <section className="mobile-status-combo card-panel">
              <div className="mobile-status-row compact-grid">
                <div className="score-card compact"><span>分数</span><strong>{score}</strong></div>
                <div className="score-card compact"><span>进度</span><strong>{collectedHeroIds.length}/{heroes.length}</strong></div>
                <div className="score-card compact"><span>时间</span><strong>{formatTime(elapsedSeconds)}</strong></div>
              </div>
              <div className="mobile-hero-strip compact-strip">
                {heroes.map((hero) => {
                  const collected = collectedHeroIds.includes(hero.id);
                  return (
                    <div key={hero.id} className={`mobile-hero-chip ${collected ? 'done' : ''}`} style={{ ['--hero-accent' as string]: hero.accent }}>
                      <img src={hero.image} alt={hero.title} />
                      <span>{hero.targetValue}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mobile-board-panel card-panel">
              <div className="mobile-board-head">
                <div>
                  <span className="label">当前目标</span>
                  <strong>{collectedHeroIds.length === heroes.length ? '全员已收集' : '继续收集剩余英雄'}</strong>
                </div>
                <button className="primary-btn small-btn" onClick={resetGame}>新开一局</button>
              </div>

              <div className="mobile-progress-wrap">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${(collectedHeroIds.length / heroes.length) * 100}%` }} />
                </div>
              </div>

              <div className="mobile-board-wrap">
                <GameBoard board={board} heroes={heroes} visualState={visualState} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
              </div>

              <p className="mobile-hint">滑动棋盘操作；更多配置和图鉴在右上角菜单里。</p>

              {(gameWon || gameOver) && (
                <div className="overlay-panel mobile-overlay">
                  <div className="overlay-card">
                    <h2>{gameWon ? '四位英雄已集齐！' : '棋盘堵住了'}</h2>
                    <p>{gameWon ? '恭喜通关，嗨咚英雄全员登场。' : '这一局没有更多可移动的空间了。'}</p>
                    <div className="result-metrics"><span>分数 {score}</span><span>步数 {moveCount}</span><span>用时 {formatTime(elapsedSeconds)}</span></div>
                    <button className="primary-btn" onClick={resetGame}>再来一局</button>
                  </div>
                </div>
              )}
            </section>

            {mobileMenuOpen && (
              <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
                <aside className="mobile-drawer card-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="mobile-drawer-header">
                    <div>
                      <div className="eyebrow small">MENU</div>
                      <h2>游戏菜单</h2>
                    </div>
                    <button className="menu-btn close" onClick={() => setMobileMenuOpen(false)}>×</button>
                  </div>
                  <div className="drawer-section">
                    <HeroConfigPanel heroes={heroes} heroTargetOverrides={heroTargetOverrides} onChange={handleTargetChange} onReset={() => setHeroTargetOverrides(createDefaultHeroTargetOverrides())} compact />
                  </div>
                  <div className="drawer-section card-subpanel">
                    <div className="drawer-score-grid">
                      <div className="score-card compact"><span>最佳分数</span><strong>{bestScore}</strong></div>
                      <div className="score-card compact"><span>预估结算</span><strong>{finalScore}</strong></div>
                    </div>
                  </div>
                  <div className="drawer-section card-subpanel">
                    <HeroCollectionPanel heroes={heroes} collectedHeroIds={collectedHeroIds} highestTile={highestTile} lastCollectedHeroId={lastCollectedHeroId} />
                  </div>
                  <div className="drawer-section card-subpanel mobile-rules">
                    <h3>规则说明</h3>
                    <ul>
                      <li>滑动棋盘移动。</li>
                      <li>普通数字方块继续按 2048 规则合并。</li>
                      <li>英雄一旦出现，就不会继续合并。</li>
                    </ul>
                    {configChanged && <p className="hint-text">难度修改将在新开一局后生效。</p>}
                  </div>
                </aside>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
