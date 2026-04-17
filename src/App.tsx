import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEY, createDefaultHeroTargetOverrides, withHeroTargets } from './config';
import { addRandomTile, calculateFinalScore, canMove, createHeroTile, createInitialBoard, formatTime, getHighestTile, moveBoard } from './game';
import { createLeaderboardEntry, readLeaderboard, saveLeaderboardEntry } from './leaderboard';
import type { Board, Direction, GameSnapshot, LeaderboardEntry, MoveVisualState } from './types';
import { GameBoard } from './components/GameBoard';
import { HeroConfigPanel } from './components/HeroConfigPanel';
import { HeroCollectionPanel } from './components/HeroCollectionPanel';
import { RulesPanel } from './components/RulesPanel';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { StatsModal } from './components/StatsModal';
import { ResultOverlay } from './components/ResultOverlay';

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

const SNAPSHOT_THROTTLE_MS = 5000;

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
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => (typeof window !== 'undefined' ? readLeaderboard() : []));
  const [nickname, setNickname] = useState('');
  const [hasSavedCurrentRun, setHasSavedCurrentRun] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const clearHighlightRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const lastSnapshotWriteRef = useRef(0);

  const heroes = useMemo(() => withHeroTargets(heroTargetOverrides), [heroTargetOverrides]);
  const highestTile = useMemo(() => getHighestTile(board), [board]);
  const finalScore = useMemo(() => calculateFinalScore(score, elapsedSeconds, collectedHeroIds.length), [score, elapsedSeconds, collectedHeroIds.length]);
  const configChanged = score > 0 || moveCount > 0 || collectedHeroIds.length > 0;
  const runOutcome: 'won' | 'lost' = gameWon ? 'won' : 'lost';
  const isRunEnded = gameWon || gameOver;

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
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    if (gameWon || gameOver) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameWon, gameOver]);

  // Persist snapshot whenever state meaningfully changes (excluding elapsedSeconds tick).
  useEffect(() => {
    writeSnapshot({ board, score, bestScore, collectedHeroIds, elapsedSeconds: elapsedSecondsRef.current, moveCount, heroTargetOverrides });
    lastSnapshotWriteRef.current = Date.now();
  }, [board, score, bestScore, collectedHeroIds, moveCount, heroTargetOverrides]);

  // Periodically flush elapsedSeconds without re-serializing on every tick.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() - lastSnapshotWriteRef.current < SNAPSHOT_THROTTLE_MS) return;
      writeSnapshot({ board, score, bestScore, collectedHeroIds, elapsedSeconds: elapsedSecondsRef.current, moveCount, heroTargetOverrides });
      lastSnapshotWriteRef.current = Date.now();
    }, SNAPSHOT_THROTTLE_MS);
    return () => window.clearInterval(timer);
  }, [board, score, bestScore, collectedHeroIds, moveCount, heroTargetOverrides]);

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
    setHasSavedCurrentRun(false);
    setNickname('');
    setVisualState({ boardPulse: Date.now(), lastMoveDirection: null });
    playBeep(420, 0.12, 'triangle');
  }, [playBeep]);

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

    if (won || stuck) {
      setHasSavedCurrentRun(false);
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

  const handleSaveScore = () => {
    if (!isRunEnded || hasSavedCurrentRun) return;
    const entry = createLeaderboardEntry({
      nickname: nickname.trim() || '玩家',
      score,
      finalScore,
      moveCount,
      elapsedSeconds,
      highestTile,
      collectedHeroCount: collectedHeroIds.length,
      outcome: runOutcome,
    });
    const next = saveLeaderboardEntry(entry);
    setLeaderboard(next);
    setHasSavedCurrentRun(true);
  };

  const statsModal = statsModalOpen ? (
    <StatsModal
      score={score}
      bestScore={bestScore}
      highestTile={highestTile}
      moveCount={moveCount}
      elapsedSeconds={elapsedSeconds}
      finalScore={finalScore}
      hasAnyHistory={leaderboard.length > 0}
      onClose={() => setStatsModalOpen(false)}
    />
  ) : null;

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
                <div className="metric-card"><span>步数</span><strong>{moveCount}</strong></div>
                <div className="metric-card"><span>用时</span><strong>{formatTime(elapsedSeconds)}</strong></div>
              </div>
              <div className="topbar-actions">
                <button
                  className="settings-fab"
                  onClick={() => setStatsModalOpen(true)}
                  aria-label="查看详细数据"
                  title="详细数据"
                >📊</button>
                <button
                  className="settings-fab"
                  onClick={() => setDesktopSettingsOpen(true)}
                  aria-label="打开设置"
                  title="设置"
                >⚙️</button>
              </div>
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
                    <div className="board-header-main">
                      <div>
                        <span className="label">英雄收集进度</span>
                        <strong>{collectedHeroIds.length} / {heroes.length}</strong>
                      </div>
                      <button className="primary-btn small-btn" onClick={resetGame}>新开一局</button>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${(collectedHeroIds.length / heroes.length) * 100}%` }} />
                    </div>
                  </div>
                  <GameBoard board={board} heroes={heroes} visualState={visualState} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
                  {isRunEnded && (
                    <ResultOverlay
                      outcome={runOutcome}
                      score={score}
                      moveCount={moveCount}
                      elapsedSeconds={elapsedSeconds}
                      nickname={nickname}
                      onNicknameChange={setNickname}
                      onSave={handleSaveScore}
                      hasSaved={hasSavedCurrentRun}
                      onReset={resetGame}
                    />
                  )}
                </div>
              </section>

              <aside className="right-column">
                <LeaderboardPanel leaderboard={leaderboard} />
                <RulesPanel showHint={configChanged} />
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
                    <button className="menu-btn close" onClick={() => setDesktopSettingsOpen(false)} aria-label="关闭">×</button>
                  </div>
                  <HeroConfigPanel heroes={heroes} heroTargetOverrides={heroTargetOverrides} onChange={handleTargetChange} onReset={() => setHeroTargetOverrides(createDefaultHeroTargetOverrides())} />
                  {configChanged && <p className="hint-text">难度修改将在新开一局后生效。</p>}
                </div>
              </div>
            )}

            {statsModal}
          </>
        ) : (
          <section className="mobile-game-layout">
            <header className="mobile-topbar card-panel">
              <div>
                <div className="eyebrow small">HIDONG 2048</div>
                <strong className="mobile-title">嗨咚英雄收集战</strong>
              </div>
              <div className="topbar-actions">
                <button
                  className="menu-btn"
                  onClick={() => setStatsModalOpen(true)}
                  aria-label="查看详细数据"
                  title="详细数据"
                >📊</button>
                <button className="menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="打开菜单">☰</button>
              </div>
            </header>

            <section className="mobile-status-combo card-panel">
              <div className="mobile-status-row compact-grid">
                <div className="score-card compact"><span>分数</span><strong>{score}</strong></div>
                <div className="score-card compact"><span>步数</span><strong>{moveCount}</strong></div>
                <div className="score-card compact"><span>用时</span><strong>{formatTime(elapsedSeconds)}</strong></div>
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

              {isRunEnded && (
                <ResultOverlay
                  outcome={runOutcome}
                  score={score}
                  moveCount={moveCount}
                  elapsedSeconds={elapsedSeconds}
                  nickname={nickname}
                  onNicknameChange={setNickname}
                  onSave={handleSaveScore}
                  hasSaved={hasSavedCurrentRun}
                  onReset={resetGame}
                  mobile
                />
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
                    <button className="menu-btn close" onClick={() => setMobileMenuOpen(false)} aria-label="关闭菜单">×</button>
                  </div>
                  <div className="drawer-section">
                    <HeroConfigPanel heroes={heroes} heroTargetOverrides={heroTargetOverrides} onChange={handleTargetChange} onReset={() => setHeroTargetOverrides(createDefaultHeroTargetOverrides())} compact />
                    {configChanged && <p className="hint-text">难度修改将在新开一局后生效。</p>}
                  </div>
                  <div className="drawer-section card-subpanel leaderboard-drawer-section">
                    <LeaderboardPanel leaderboard={leaderboard} />
                  </div>
                  <div className="drawer-section card-subpanel">
                    <HeroCollectionPanel heroes={heroes} collectedHeroIds={collectedHeroIds} highestTile={highestTile} lastCollectedHeroId={lastCollectedHeroId} />
                  </div>
                  <div className="drawer-section card-subpanel mobile-rules">
                    <RulesPanel showHint={configChanged} />
                  </div>
                </aside>
              </div>
            )}

            {statsModal}
          </section>
        )}
      </main>
    </div>
  );
}
