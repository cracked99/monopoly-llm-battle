'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

function getSpaceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    go: 'Go - Collect $200',
    jail: 'Jail',
    freeParking: 'Free Parking',
    goToJail: 'Go to Jail',
    chance: 'Chance card',
    communityChest: 'Community Chest card',
    tax: 'Tax',
    railroad: 'Railroad',
    utility: 'Utility',
    property: 'Property',
  };
  return labels[type] || type;
}

function PlayerPositionHighlight({ 
  players, 
  currentPlayerId,
  cellSize 
}: { 
  players: { id: string; color: string; emoji: string; name: string }[];
  currentPlayerId: string | null;
  cellSize: number;
}) {
  const hasCurrentPlayer = players.some(p => p.id === currentPlayerId);
  const primaryColor = hasCurrentPlayer 
    ? players.find(p => p.id === currentPlayerId)?.color 
    : players[0]?.color;

  if (players.length === 0) return null;

  return (
    <>
      {/* Smooth outer glow - organic breathing effect */}
      <div
        data-design-id="highlight-outer-glow"
        className="absolute -inset-1 pointer-events-none rounded-md animate-breathe-glow will-change-[opacity,transform]"
        style={{
          background: `radial-gradient(ellipse at center, ${primaryColor}40 0%, ${primaryColor}20 40%, transparent 70%)`,
          filter: 'blur(4px)',
        }}
      />

      {/* Inner radial glow - subtle pulsing */}
      <div
        data-design-id="highlight-inner-glow"
        className="absolute inset-0 pointer-events-none rounded-sm animate-soft-pulse will-change-opacity"
        style={{
          background: `radial-gradient(ellipse at center, ${primaryColor}30 0%, transparent 60%)`,
        }}
      />

      {/* Smooth border glow for current player */}
      {hasCurrentPlayer && (
        <div
          data-design-id="highlight-border-glow"
          className="absolute inset-0 pointer-events-none rounded-sm animate-border-breathe will-change-[opacity,box-shadow]"
          style={{
            boxShadow: `inset 0 0 0 2px ${primaryColor}`,
          }}
        />
      )}

      {/* Ambient light ring - very subtle */}
      <div
        data-design-id="highlight-ambient"
        className="absolute inset-0 pointer-events-none rounded-sm animate-ambient-glow will-change-opacity"
        style={{
          boxShadow: `0 0 ${hasCurrentPlayer ? '12px' : '8px'} ${hasCurrentPlayer ? '3px' : '2px'} ${primaryColor}50`,
        }}
      />

      {/* Multiple player indicator dots - smooth animations */}
      {players.length > 1 && (
        <div
          data-design-id="highlight-multi-indicator"
          className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-0.5 pointer-events-none"
        >
          {players.map((player, idx) => (
            <div
              key={player.id}
              className={`rounded-full will-change-transform ${player.id === currentPlayerId ? 'animate-gentle-pulse' : ''}`}
              style={{
                width: Math.max(cellSize * 0.08, 3),
                height: Math.max(cellSize * 0.08, 3),
                backgroundColor: player.color,
                boxShadow: player.id === currentPlayerId 
                  ? `0 0 6px 2px ${player.color}80` 
                  : `0 0 3px 1px ${player.color}40`,
                animationDelay: `${idx * 150}ms`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function BoardSpaceComponent({ 
  space, 
  playersOnSpace,
  currentPlayerId,
  property,
  cellSize
}: { 
  space: BoardSpace; 
  playersOnSpace: { id: string; color: string; emoji: string; name: string }[];
  currentPlayerId: string | null;
  property?: { owner: string | null; houses: number; hasHotel: boolean; isMortgaged: boolean };
  cellSize: number;
}) {
  const { row, col, side } = getBoardPosition(space.position);
  const isCorner = space.position % 10 === 0;
  const colorBg = COLOR_MAP[space.color] || 'transparent';
  const cornerSize = cellSize * 1.4;
  const hasCurrentPlayer = playersOnSpace.some(p => p.id === currentPlayerId);
  
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
    width: isCorner ? cornerSize : cellSize,
    height: isCorner ? cornerSize : cellSize * 1.4,
  };

  const ownerPlayer = property?.owner 
    ? useGameStore.getState().players.find(p => p.id === property.owner) 
    : null;

  const accessibleLabel = `${space.name}${space.price ? `, costs $${space.price}` : ''}, ${getSpaceTypeLabel(space.type)}${
    playersOnSpace.length > 0 ? `, Players: ${playersOnSpace.map(p => p.name).join(', ')}` : ''
  }${ownerPlayer ? `, owned by ${ownerPlayer.name}` : ''}${
    property?.houses ? `, ${property.houses} houses` : ''
  }${property?.hasHotel ? ', has hotel' : ''}${property?.isMortgaged ? ', mortgaged' : ''}${
    hasCurrentPlayer ? ', current player here' : ''
  }`;

  const currentPlayerColor = playersOnSpace.find(p => p.id === currentPlayerId)?.color || '#ffffff';
  
  return (
    <div
      data-design-id={`board-space-${space.position}`}
      role="gridcell"
      aria-label={accessibleLabel}
      tabIndex={0}
      className={`relative border overflow-hidden flex flex-col transition-all duration-200 hover:z-10 hover:scale-105 hover:shadow-lg focus:z-20 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:shadow-lg focus:shadow-amber-500/30 ${
        playersOnSpace.length > 0 
          ? 'border-white/30 bg-zinc-800/90 z-5' 
          : 'border-zinc-700/50 bg-zinc-900/80'
      } ${hasCurrentPlayer ? 'z-10 animate-glow-ring will-change-[box-shadow]' : ''}`}
      style={{
        ...gridStyles,
        '--glow-color': currentPlayerColor,
        boxShadow: !hasCurrentPlayer && playersOnSpace.length > 0 
          ? `0 0 10px 2px ${playersOnSpace[0]?.color}50` 
          : undefined,
      } as React.CSSProperties}
    >
      {/* Animated highlight overlay for player positions */}
      <AnimatePresence>
        {playersOnSpace.length > 0 && (
          <PlayerPositionHighlight 
            players={playersOnSpace} 
            currentPlayerId={currentPlayerId}
            cellSize={cellSize}
          />
        )}
      </AnimatePresence>

      <div className={`w-full h-full flex flex-col ${getRotation()}`}>
        {space.color !== 'none' && space.type === 'property' && (
          <div 
            className="w-full shrink-0"
            style={{ backgroundColor: colorBg, height: Math.max(cellSize * 0.2, 4) }}
            aria-hidden="true"
          />
        )}
        
        <div className="flex-1 flex flex-col items-center justify-center p-0.5 min-h-0">
          {getSpaceIcon() && (
            <span 
              className="leading-none" 
              style={{ fontSize: Math.max(cellSize * 0.35, 10) }}
              aria-hidden="true"
            >
              {getSpaceIcon()}
            </span>
          )}
          <span 
            className="text-center text-zinc-300 leading-tight line-clamp-2 font-medium"
            style={{ fontSize: Math.max(cellSize * 0.14, 5) }}
          >
            {space.name}
          </span>
          {space.price && (
            <span 
              className="text-emerald-400 font-bold"
              style={{ fontSize: Math.max(cellSize * 0.12, 4) }}
            >
              ${space.price}
            </span>
          )}
        </div>

        {property && (property.houses > 0 || property.hasHotel) && (
          <div className="absolute bottom-0.5 left-0.5 flex gap-0.5" aria-hidden="true">
            {property.hasHotel ? (
              <span style={{ fontSize: Math.max(cellSize * 0.18, 6) }}>🏨</span>
            ) : (
              Array.from({ length: property.houses }).map((_, i) => (
                <span key={i} style={{ fontSize: Math.max(cellSize * 0.14, 5) }}>🏠</span>
              ))
            )}
          </div>
        )}

        {property?.isMortgaged && (
          <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center" aria-hidden="true">
            <span 
              className="text-red-300 font-bold"
              style={{ fontSize: Math.max(cellSize * 0.12, 5) }}
            >
              MORTGAGED
            </span>
          </div>
        )}
      </div>

      {playersOnSpace.length > 0 && (
        <div className="absolute bottom-0.5 right-0.5 flex flex-wrap gap-0.5 max-w-[80%] justify-end z-10" aria-hidden="true">
          {playersOnSpace.map((player) => (
            <div
              key={player.id}
              className={`rounded-full border-2 flex items-center justify-center shadow-lg will-change-transform ${
                player.id === currentPlayerId ? 'animate-player-bounce' : ''
              }`}
              style={{ 
                backgroundColor: player.color,
                borderColor: player.id === currentPlayerId ? '#ffffff' : 'rgba(255,255,255,0.5)',
                width: Math.max(cellSize * 0.32, 10),
                height: Math.max(cellSize * 0.32, 10),
                fontSize: Math.max(cellSize * 0.18, 6),
                boxShadow: player.id === currentPlayerId 
                  ? `0 0 8px 2px ${player.color}, 0 0 2px 1px white`
                  : `0 2px 4px rgba(0,0,0,0.3)`,
              }}
              title={player.name}
            >
              {player.emoji.charAt(0)}
            </div>
          ))}
        </div>
      )}

      {ownerPlayer && (
        <div 
          className="absolute top-0.5 right-0.5 rounded-full border border-white/30 animate-pulse will-change-transform"
          style={{ 
            backgroundColor: ownerPlayer.color,
            width: Math.max(cellSize * 0.16, 4),
            height: Math.max(cellSize * 0.16, 4)
          }}
          aria-hidden="true"
          title={`Owned by ${ownerPlayer.name}`}
        />
      )}
    </div>
  );
}

export default function GameBoard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);
  const { players, properties, currentPlayerIndex, gamePhase } = useGameStore();
  
  const currentPlayer = gamePhase === 'playing' ? players[currentPlayerIndex] : null;

  useEffect(() => {
    const calculateSize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const parent = container.parentElement;
      
      const parentWidth = parent?.clientWidth || window.innerWidth;
      const parentHeight = parent?.clientHeight || window.innerHeight;
      
      const padding = 8;
      const availableWidth = parentWidth - padding * 2;
      const availableHeight = parentHeight - padding * 2;
      
      const cornerRatio = 1.4;
      const totalCols = 2 * cornerRatio + 9;
      const totalRows = 2 * cornerRatio + 9 * 1.4;
      
      const cellFromWidth = availableWidth / totalCols;
      const cellFromHeight = availableHeight / totalRows;
      
      const optimalSize = Math.min(cellFromWidth, cellFromHeight);
      const finalSize = Math.max(Math.min(optimalSize, 70), 16);
      
      setCellSize(finalSize);
    };

    calculateSize();
    
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateSize);
    });
    
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', calculateSize);
    window.addEventListener('orientationchange', () => {
      setTimeout(calculateSize, 100);
    });
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateSize);
      window.removeEventListener('orientationchange', calculateSize);
    };
  }, []);

  const getPlayersOnSpace = (position: number) => {
    return players
      .filter(p => !p.isBankrupt && p.position === position)
      .map(p => ({ id: p.id, color: p.color, emoji: p.emoji, name: p.name }));
  };

  const getPropertyInfo = (position: number) => {
    return properties.find(p => p.position === position);
  };

  const cornerSize = cellSize * 1.4;
  const regularWidth = cellSize;
  const regularHeight = cellSize * 1.4;

  return (
    <div 
      ref={containerRef}
      data-design-id="game-board-container" 
      className="relative w-full h-full flex items-center justify-center"
      role="region"
      aria-label="Monopoly Game Board"
    >
      <div 
        data-design-id="game-board-grid"
        role="grid"
        aria-label="Game board spaces"
        className="grid gap-px bg-zinc-950 p-1 rounded-lg border-2 border-amber-600/30 shadow-2xl shadow-black/50"
        style={{
          gridTemplateColumns: `${cornerSize}px repeat(9, ${regularWidth}px) ${cornerSize}px`,
          gridTemplateRows: `${cornerSize}px repeat(9, ${regularHeight}px) ${cornerSize}px`,
        }}
      >
        {BOARD_SPACES.map((space) => (
          <BoardSpaceComponent
            key={space.position}
            space={space}
            playersOnSpace={getPlayersOnSpace(space.position)}
            currentPlayerId={currentPlayer?.id || null}
            property={getPropertyInfo(space.position)}
            cellSize={cellSize}
          />
        ))}

        <div 
          data-design-id="board-center"
          className="col-start-2 col-end-11 row-start-2 row-end-11 bg-gradient-to-br from-emerald-950 via-zinc-900 to-emerald-950 flex items-center justify-center rounded-lg border border-emerald-800/30"
          role="banner"
          aria-label="Monopoly LLM Battle Arena"
        >
          <div data-design-id="board-center-content" className="text-center p-2 sm:p-4">
            <h1 
              data-design-id="board-title"
              className="font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-2xl animate-title-glow will-change-[filter,text-shadow]"
              style={{ fontSize: Math.max(cellSize * 0.6, 16) }}
            >
              MONOPOLY
            </h1>
            <p 
              data-design-id="board-subtitle" 
              className="text-amber-500/70 mt-0.5 font-medium tracking-widest"
              style={{ fontSize: Math.max(cellSize * 0.22, 8) }}
            >
              LLM BATTLE ARENA
            </p>
            
            <div data-design-id="board-dice-display" className="mt-2 sm:mt-4 flex justify-center gap-2">
              <DiceDisplay cellSize={cellSize} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiceDisplay({ cellSize }: { cellSize: number }) {
  const { lastDiceRoll } = useGameStore();

  if (!lastDiceRoll) return null;

  const getDiceFace = (value: number) => {
    const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return faces[value - 1] || '⚀';
  };

  const diceSize = Math.max(cellSize * 0.9, 24);

  return (
    <motion.div 
      data-design-id="dice-display"
      className="flex gap-2 sm:gap-3"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      key={`${lastDiceRoll.die1}-${lastDiceRoll.die2}-${Date.now()}`}
      role="status"
      aria-live="polite"
      aria-label={`Dice rolled: ${lastDiceRoll.die1} and ${lastDiceRoll.die2}, total ${lastDiceRoll.die1 + lastDiceRoll.die2}${lastDiceRoll.isDoubles ? ', doubles!' : ''}`}
    >
      <motion.span 
        data-design-id="dice-1"
        className="drop-shadow-lg"
        style={{ fontSize: diceSize }}
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 0.5 }}
        aria-hidden="true"
      >
        {getDiceFace(lastDiceRoll.die1)}
      </motion.span>
      <motion.span 
        data-design-id="dice-2"
        className="drop-shadow-lg"
        style={{ fontSize: diceSize }}
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 0.5, delay: 0.1 }}
        aria-hidden="true"
      >
        {getDiceFace(lastDiceRoll.die2)}
      </motion.span>
    </motion.div>
  );
}