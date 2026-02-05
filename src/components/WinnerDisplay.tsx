'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export default function WinnerDisplay() {
  const { players, winner, gamePhase, properties } = useGameStore();

  const winningPlayer = players.find(p => p.id === winner);

  useEffect(() => {
    if (gamePhase === 'ended' && winningPlayer) {
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        data-design-id="winner-modal"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
      >
        <Card data-design-id="winner-card" className="bg-gradient-to-br from-zinc-900 via-amber-950/20 to-zinc-900 border-amber-500/50 shadow-2xl shadow-amber-500/30 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <motion.div
              data-design-id="trophy-icon"
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="text-7xl"
            >
              🏆
            </motion.div>

            <div data-design-id="winner-title" className="space-y-2">
              <h1 className="text-3xl font-black text-amber-400 tracking-wide">
                WINNER!
              </h1>
              <div className="flex items-center justify-center gap-3">
                <motion.div 
                  data-design-id="winner-avatar"
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-4 border-amber-500"
                  style={{ backgroundColor: winningPlayer.color }}
                  animate={{ boxShadow: ['0 0 20px rgba(251, 191, 36, 0.5)', '0 0 40px rgba(251, 191, 36, 0.8)', '0 0 20px rgba(251, 191, 36, 0.5)'] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                >
                  {winningPlayer.emoji.charAt(0)}
                </motion.div>
                <div className="text-left">
                  <h2 data-design-id="winner-name" className="text-2xl font-bold text-zinc-100">
                    {winningPlayer.name}
                  </h2>
                  {winningPlayer.isAI && winningPlayer.llmModel && (
                    <p data-design-id="winner-model" className="text-sm text-cyan-400">
                      {winningPlayer.llmModel.split('/')[1]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div data-design-id="winner-stats" className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Final Cash:</span>
                <span className="text-emerald-400 font-bold text-xl">${winningPlayer.money.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Properties Owned:</span>
                <span className="text-amber-400 font-bold">{winnerProperties.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total Assets:</span>
                <span className="text-yellow-400 font-bold text-xl">${totalAssets.toLocaleString()}</span>
              </div>
            </div>

            <Button
              data-design-id="play-again-button"
              onClick={handlePlayAgain}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold py-6 text-lg"
            >
              🎲 Play Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}