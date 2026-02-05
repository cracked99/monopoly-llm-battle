'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';

export default function WinnerDisplay() {
  const { players, winner, gamePhase, properties } = useGameStore();
  const dialogRef = useRef<HTMLDivElement>(null);

  const winningPlayer = players.find(p => p.id === winner);

  useEffect(() => {
    if (gamePhase === 'ended' && winningPlayer) {
      dialogRef.current?.focus();
      
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#fbbf24', '#f59e0b', '#d97706'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#fbbf24', '#f59e0b', '#d97706'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [gamePhase, winningPlayer]);

  if (gamePhase !== 'ended' || !winningPlayer) return null;

  const winnerProperties = properties.filter(p => p.owner === winningPlayer.id);
  const totalAssets = winningPlayer.money + 
    winnerProperties.reduce((sum, p) => sum + p.price + (p.houses * p.houseCost) + (p.hasHotel ? p.hotelCost : 0), 0);

  const handlePlayAgain = () => {
    window.location.reload();
  };

  return (
    <motion.div
      data-design-id="winner-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-title"
      aria-describedby="winner-description"
      ref={dialogRef}
      tabIndex={-1}
    >
      <motion.div
        data-design-id="winner-modal"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="w-full max-w-md"
      >
        <Card data-design-id="winner-card" className="bg-gradient-to-br from-zinc-900 via-amber-950/20 to-zinc-900 border-amber-500/50 shadow-2xl shadow-amber-500/30">
          <CardContent className="p-4 sm:p-6 md:p-8 text-center space-y-4 sm:space-y-6">
            <motion.div
              data-design-id="trophy-icon"
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="text-5xl sm:text-7xl"
              aria-hidden="true"
            >
              🏆
            </motion.div>

            <div data-design-id="winner-title" className="space-y-2">
              <h1 
                id="winner-title"
                className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide"
              >
                WINNER!
              </h1>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <motion.div 
                  data-design-id="winner-avatar"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl border-4 border-amber-500 shrink-0"
                  style={{ backgroundColor: winningPlayer.color }}
                  animate={{ boxShadow: ['0 0 20px rgba(251, 191, 36, 0.5)', '0 0 40px rgba(251, 191, 36, 0.8)', '0 0 20px rgba(251, 191, 36, 0.5)'] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  aria-hidden="true"
                >
                  {winningPlayer.emoji.charAt(0)}
                </motion.div>
                <div className="text-left">
                  <h2 data-design-id="winner-name" className="text-xl sm:text-2xl font-bold text-zinc-100">
                    {winningPlayer.name}
                  </h2>
                  {winningPlayer.isAI && winningPlayer.llmModel && (
                    <p data-design-id="winner-model" className="text-xs sm:text-sm text-cyan-400">
                      {winningPlayer.llmModel.split('/')[1]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div 
              id="winner-description"
              data-design-id="winner-stats" 
              className="bg-zinc-800/50 rounded-lg p-3 sm:p-4 space-y-2"
              aria-label="Winner statistics"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-zinc-400">Final Cash:</span>
                <span 
                  className="text-base sm:text-xl text-emerald-400 font-bold"
                  aria-label={`Final cash: $${winningPlayer.money.toLocaleString()}`}
                >
                  ${winningPlayer.money.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-zinc-400">Properties Owned:</span>
                <span 
                  className="text-sm sm:text-base text-amber-400 font-bold"
                  aria-label={`${winnerProperties.length} properties owned`}
                >
                  {winnerProperties.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-zinc-400">Total Assets:</span>
                <span 
                  className="text-base sm:text-xl text-yellow-400 font-bold"
                  aria-label={`Total assets: $${totalAssets.toLocaleString()}`}
                >
                  ${totalAssets.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              data-design-id="play-again-button"
              onClick={handlePlayAgain}
              aria-label="Play again - start a new game"
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold py-4 sm:py-6 text-base sm:text-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 active:scale-[0.98] transition-transform touch-manipulation"
            >
              🎲 Play Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}