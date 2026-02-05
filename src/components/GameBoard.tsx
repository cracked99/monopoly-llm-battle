'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { BOARD_SPACES, COLOR_MAP } from '@/lib/board-data';
import type { BoardSpace } from '@/lib/game-types';

function getBoardPosition(index: number): { row: number; col: number; side: string } {
  if (index >= 0 && index <= 10) {
    return { row: 10, col: 10 - index, side: 'bottom' };
  }
  if (index >= 11 && index <= 19) {
    return { row: 10 - (index - 10), col: 0, side: 'left' };
  }
  if (index >= 20 && index <= 30) {
    return { row: 0, col: index - 20, side: 'top' };
  }
  return { row: index - 30, col: 10, side: 'right' };
}

function BoardSpaceComponent({ 
  space, 
  playersOnSpace,
  property 
}: { 
  space: BoardSpace; 
  playersOnSpace: { id: string; color: string; emoji: string }[];
  property?: { owner: string | null; houses: number; hasHotel: boolean; isMortgaged: boolean };
}) {
  const { row, col, side } = getBoardPosition(space.position);
  const isCorner = space.position % 10 === 0;
  const colorBg = COLOR_MAP[space.color] || 'transparent';
  
  const getSpaceIcon = () => {
    switch (space.type) {
      case 'go': return '➡️';
      case 'jail': return '🔒';
      case 'freeParking': return '🅿️';
      case 'goToJail': return '👮';
      case 'chance': return '❓';
      case 'communityChest': return '💰';
      case 'tax': return '💸';
      case 'railroad': return '🚂';
      case 'utility': return space.name.includes('Electric') ? '💡' : '🚰';
      default: return null;
    }
  };

  const getRotation = () => {
    if (isCorner) return 'rotate-0';
    switch (side) {
      case 'left': return 'rotate-90';
      case 'top': return 'rotate-180';
      case 'right': return '-rotate-90';
      default: return 'rotate-0';
    }
  };

  const gridStyles: React.CSSProperties = {
    gridRow: row + 1,
    gridColumn: col + 1,
  };

  return (
    <div
      data-design-id={`board-space-${space.position}`}
      className={`
        relative border border-zinc-700/50 bg-zinc-900/80 overflow-hidden
        ${isCorner ? 'w-20 h-20 md:w-24 md:h-24' : 'w-14 h-20 md:w-16 md:h-24'}
        flex flex-col transition-all hover:z-10 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20
      `}
      style={gridStyles}
    >
      <div className={`w-full h-full flex flex-col ${getRotation()}`}>
        {space.color !== 'none' && space.type === 'property' && (
          <div 
            className="h-4 md:h-5 w-full shrink-0"
            style={{ backgroundColor: colorBg }}
          />
        )}
        
        <div className="flex-1 flex flex-col items-center justify-center p-0.5 min-h-0">
          {getSpaceIcon() && (
            <span className="text-base md:text-lg">{getSpaceIcon()}</span>
          )}
          <span className="text-[6px] md:text-[8px] text-center text-zinc-300 leading-tight line-clamp-2 font-medium">
            {space.name}
          </span>
          {space.price && (
            <span className="text-[6px] md:text-[7px] text-emerald-400 font-bold">
              ${space.price}
            </span>
          )}
        </div>

        {property && (property.houses > 0 || property.hasHotel) && (
          <div className="absolute bottom-1 left-1 flex gap-0.5">
            {property.hasHotel ? (
              <span className="text-[8px]">🏨</span>
            ) : (
              Array.from({ length: property.houses }).map((_, i) => (
                <span key={i} className="text-[6px]">🏠</span>
              ))
            )}
          </div>
        )}

        {property?.isMortgaged && (
          <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
            <span className="text-[8px] text-red-300 font-bold">MORTGAGED</span>
          </div>
        )}
      </div>

      {playersOnSpace.length > 0 && (
        <div className="absolute bottom-0.5 right-0.5 flex flex-wrap gap-0.5 max-w-[80%] justify-end">
          {playersOnSpace.map((player) => (
            <motion.div
              key={player.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-white/50 flex items-center justify-center text-[8px] shadow-lg"
              style={{ backgroundColor: player.color }}
            >
              {player.emoji.charAt(0)}
            </motion.div>
          ))}
        </div>
      )}

      {property?.owner && (
        <div 
          className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-white/30"
          style={{ 
            backgroundColor: useGameStore.getState().players.find(p => p.id === property.owner)?.color || '#666'
          }}
        />
      )}
    </div>
  );
}

export default function GameBoard() {
  const { players, properties } = useGameStore();

  const getPlayersOnSpace = (position: number) => {
    return players
      .filter(p => !p.isBankrupt && p.position === position)
      .map(p => ({ id: p.id, color: p.color, emoji: p.emoji }));
  };

  const getPropertyInfo = (position: number) => {
    return properties.find(p => p.position === position);
  };

  return (
    <div data-design-id="game-board-container" className="relative">
      <div 
        data-design-id="game-board-grid"
        className="grid gap-0.5 bg-zinc-950 p-1 rounded-lg border-2 border-amber-600/30"
        style={{
          gridTemplateColumns: 'repeat(11, auto)',
          gridTemplateRows: 'repeat(11, auto)',
        }}
      >
        {BOARD_SPACES.map((space) => (
          <BoardSpaceComponent
            key={space.position}
            space={space}
            playersOnSpace={getPlayersOnSpace(space.position)}
            property={getPropertyInfo(space.position)}
          />
        ))}

        <div 
          data-design-id="board-center"
          className="col-start-2 col-end-11 row-start-2 row-end-11 bg-gradient-to-br from-emerald-950 via-zinc-900 to-emerald-950 flex items-center justify-center rounded-lg border border-emerald-800/30"
        >
          <div data-design-id="board-center-content" className="text-center p-4">
            <motion.h1 
              data-design-id="board-title"
              className="text-2xl md:text-4xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-2xl"
              animate={{ 
                textShadow: ['0 0 20px rgba(251, 191, 36, 0.3)', '0 0 40px rgba(251, 191, 36, 0.5)', '0 0 20px rgba(251, 191, 36, 0.3)']
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              MONOPOLY
            </motion.h1>
            <p data-design-id="board-subtitle" className="text-xs md:text-sm text-amber-500/70 mt-1 font-medium tracking-widest">
              LLM BATTLE ARENA
            </p>
            
            <div data-design-id="board-dice-display" className="mt-4 flex justify-center gap-2">
              <DiceDisplay />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiceDisplay() {
  const { lastDiceRoll } = useGameStore();

  if (!lastDiceRoll) return null;

  const getDiceFace = (value: number) => {
    const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return faces[value - 1] || '⚀';
  };

  return (
    <motion.div 
      data-design-id="dice-display"
      className="flex gap-3"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      key={`${lastDiceRoll.die1}-${lastDiceRoll.die2}-${Date.now()}`}
    >
      <motion.span 
        data-design-id="dice-1"
        className="text-4xl md:text-5xl drop-shadow-lg"
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 0.5 }}
      >
        {getDiceFace(lastDiceRoll.die1)}
      </motion.span>
      <motion.span 
        data-design-id="dice-2"
        className="text-4xl md:text-5xl drop-shadow-lg"
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {getDiceFace(lastDiceRoll.die2)}
      </motion.span>
    </motion.div>
  );
}