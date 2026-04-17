import type { Board, HeroConfig, MoveVisualState } from '../types';

interface GameBoardProps {
  board: Board;
  heroes: HeroConfig[];
  visualState: MoveVisualState;
  onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLDivElement>) => void;
}

export function GameBoard({ board, heroes, visualState, onTouchStart, onTouchEnd }: GameBoardProps) {
  return (
    <div
      className="board-grid"
      data-pulse={visualState.boardPulse}
      role="application"
      aria-label="嗨咚 2048 棋盘"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {board.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const hero = cell?.kind === 'hero' ? heroes.find((item) => item.id === cell.heroId) : null;
          const ariaLabel = cell === null
            ? '空格子'
            : hero
              ? `英雄 ${hero.name} 数值 ${cell.value}`
              : `数字 ${cell.value}`;
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`tile ${cell ? `tile-${cell.value}` : 'tile-empty'} ${hero ? hero.themeClass : ''}`}
              role="gridcell"
              aria-label={ariaLabel}
            >
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
