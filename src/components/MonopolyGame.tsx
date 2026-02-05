'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/game-store';
import GameSetup from './GameSetup';
import GameBoard from './GameBoard';
import PlayerPanel from './PlayerPanel';
import GameControls from './GameControls';
import WinnerDisplay from './WinnerDisplay';
import { motion, AnimatePresence } from 'framer-motion';

type MobileTab = 'board' | 'players' | 'controls';

export default function MonopolyGame() {
  const { gamePhase } = useGameStore();
  const [mobileTab, setMobileTab] = useState<MobileTab>('board');

  if (gamePhase === 'setup') {
    return <GameSetup />;
  }

  return (
    <div 
      data-design-id="game-container" 
      className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-zinc-950 via-emerald-950/10 to-zinc-950 flex flex-col"
      role="main"
      aria-label="Monopoly LLM Battle Game"
    >
      <motion.div
        data-design-id="game-layout"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full"
      >
        <header 
          data-design-id="game-header" 
          className="text-center py-2 sm:py-3 px-2 shrink-0"
          role="banner"
        >
          <h1 
            data-design-id="game-title"
            className="text-lg sm:text-2xl md:text-3xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent"
          >
            MONOPOLY LLM BATTLE
          </h1>
        </header>

        {/* Mobile Tab Navigation */}
        <nav 
          data-design-id="mobile-tabs"
          className="lg:hidden flex border-b border-zinc-800 px-2 shrink-0"
          role="tablist"
          aria-label="Game sections"
        >
          <button
            role="tab"
            aria-selected={mobileTab === 'board'}
            aria-controls="board-panel"
            onClick={() => setMobileTab('board')}
            className={`flex-1 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              mobileTab === 'board' 
                ? 'text-amber-400 border-b-2 border-amber-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🎲 Board
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === 'players'}
            aria-controls="players-panel"
            onClick={() => setMobileTab('players')}
            className={`flex-1 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              mobileTab === 'players' 
                ? 'text-amber-400 border-b-2 border-amber-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            👥 Players
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === 'controls'}
            aria-controls="controls-panel"
            onClick={() => setMobileTab('controls')}
            className={`flex-1 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              mobileTab === 'controls' 
                ? 'text-amber-400 border-b-2 border-amber-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚙️ Controls
          </button>
        </nav>

        {/* Desktop Layout */}
        <div 
          data-design-id="game-main-grid"
          className="hidden lg:grid lg:grid-cols-[260px_1fr_280px] xl:grid-cols-[280px_1fr_320px] gap-3 xl:gap-4 flex-1 p-3 xl:p-4 overflow-hidden"
        >
          <aside 
            data-design-id="players-sidebar" 
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            role="complementary"
            aria-label="Players information"
          >
            <h2 
              data-design-id="players-title" 
              className="text-xs font-semibold text-zinc-400 mb-2 px-1 uppercase tracking-wider"
            >
              Players
            </h2>
            <PlayerPanel />
          </aside>

          <main 
            data-design-id="board-section" 
            className="flex justify-center items-center overflow-hidden"
            role="region"
            aria-label="Game board"
          >
            <GameBoard />
          </main>

          <aside 
            data-design-id="controls-sidebar" 
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            role="complementary"
            aria-label="Game controls"
          >
            <h2 
              data-design-id="controls-title" 
              className="text-xs font-semibold text-zinc-400 mb-2 px-1 uppercase tracking-wider"
            >
              Controls
            </h2>
            <GameControls />
          </aside>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileTab === 'board' && (
              <motion.div
                key="board"
                id="board-panel"
                role="tabpanel"
                aria-labelledby="board-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="h-full p-2 flex items-center justify-center overflow-auto"
              >
                <GameBoard />
              </motion.div>
            )}
            {mobileTab === 'players' && (
              <motion.div
                key="players"
                id="players-panel"
                role="tabpanel"
                aria-labelledby="players-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="h-full p-3 overflow-y-auto"
              >
                <PlayerPanel />
              </motion.div>
            )}
            {mobileTab === 'controls' && (
              <motion.div
                key="controls"
                id="controls-panel"
                role="tabpanel"
                aria-labelledby="controls-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="h-full p-3 overflow-y-auto"
              >
                <GameControls />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <WinnerDisplay />
    </div>
  );
}