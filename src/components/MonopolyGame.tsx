'use client';

import { useGameStore } from '@/lib/game-store';
import GameSetup from './GameSetup';
import GameBoard from './GameBoard';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import WinnerDisplay from './WinnerDisplay';
import { motion } from 'framer-motion';

export default function MonopolyGame() {
  const { gamePhase } = useGameStore();

  if (gamePhase === 'setup') {
    return <GameSetup />;
  }

  return (
    <div data-design-id="game-container" className="min-h-screen bg-gradient-to-br from-zinc-950 via-emerald-950/10 to-zinc-950 p-2 md:p-4">
      <motion.div
        data-design-id="game-layout"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-[1600px] mx-auto"
      >
        <header data-design-id="game-header" className="text-center mb-4">
          <h1 
            data-design-id="game-title"
            className="text-2xl md:text-3xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent"
          >
            MONOPOLY LLM BATTLE
          </h1>
        </header>

        <div 
          data-design-id="game-main-grid"
          className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4"
        >
          <aside data-design-id="players-sidebar" className="order-2 lg:order-1">
            <div className="sticky top-4">
              <h2 data-design-id="players-title" className="text-sm font-semibold text-zinc-400 mb-2 px-1">
                PLAYERS
              </h2>
              <PlayerPanel />
            </div>
          </aside>

          <main data-design-id="board-section" className="order-1 lg:order-2 flex justify-center items-start">
            <div className="transform scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100 origin-top">
              <GameBoard />
            </div>
          </main>

          <aside data-design-id="controls-sidebar" className="order-3">
            <div className="sticky top-4">
              <h2 data-design-id="controls-title" className="text-sm font-semibold text-zinc-400 mb-2 px-1">
                GAME CONTROLS
              </h2>
              <GameControls />
            </div>
          </aside>
        </div>
      </motion.div>

      <WinnerDisplay />
    </div>
  );
}