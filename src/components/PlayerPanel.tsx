'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { COLOR_MAP } from '@/lib/board-data';

export default function PlayerPanel() {
  const { players, currentPlayerIndex, properties, gamePhase } = useGameStore();

  return (
    <div data-design-id="player-panel" className="space-y-3">
      {players.map((player, index) => {
        const isCurrentPlayer = index === currentPlayerIndex && gamePhase === 'playing';
        const playerProperties = properties.filter(p => p.owner === player.id);
        const totalAssets = player.money + 
          playerProperties.reduce((sum, p) => sum + p.price + (p.houses * p.houseCost) + (p.hasHotel ? p.hotelCost : 0), 0);
        
        const groupedProperties: Record<string, typeof playerProperties> = {};
        for (const prop of playerProperties) {
          if (!groupedProperties[prop.color]) {
            groupedProperties[prop.color] = [];
          }
          groupedProperties[prop.color].push(prop);
        }

        return (
          <motion.div
            key={player.id}
            data-design-id={`player-card-${index}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`
                transition-all duration-300 bg-zinc-900/90 border-zinc-700
                ${isCurrentPlayer ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/20' : ''}
                ${player.isBankrupt ? 'opacity-50 grayscale' : ''}
              `}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div 
                      data-design-id={`player-avatar-${index}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 border-white/20"
                      style={{ backgroundColor: player.color }}
                      animate={isCurrentPlayer ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                    >
                      {player.emoji.charAt(0)}
                    </motion.div>
                    <div>
                      <CardTitle data-design-id={`player-name-${index}`} className="text-sm font-bold text-zinc-100">
                        {player.name}
                        {player.isAI && (
                          <Badge data-design-id={`player-ai-badge-${index}`} variant="outline" className="ml-2 text-[10px] py-0 px-1 border-cyan-500 text-cyan-400">
                            AI
                          </Badge>
                        )}
                      </CardTitle>
                      {player.isAI && player.llmModel && (
                        <p data-design-id={`player-model-${index}`} className="text-[10px] text-zinc-500">
                          {player.llmModel.split('/')[1]}
                        </p>
                      )}
                    </div>
                  </div>
                  {isCurrentPlayer && (
                    <Badge data-design-id={`player-turn-badge-${index}`} className="bg-amber-500 text-black text-[10px] animate-pulse">
                      TURN
                    </Badge>
                  )}
                  {player.isBankrupt && (
                    <Badge data-design-id={`player-bankrupt-badge-${index}`} variant="destructive" className="text-[10px]">
                      BANKRUPT
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-3 pt-0 space-y-2">
                <div data-design-id={`player-money-${index}`} className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Cash:</span>
                  <span className="text-lg font-bold text-emerald-400">${player.money.toLocaleString()}</span>
                </div>
                
                <div data-design-id={`player-assets-${index}`} className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Total Assets:</span>
                  <span className="text-amber-400 font-semibold">${totalAssets.toLocaleString()}</span>
                </div>

                {player.inJail && (
                  <div data-design-id={`player-jail-status-${index}`} className="flex items-center gap-1 text-xs text-red-400">
                    <span>🔒</span>
                    <span>In Jail ({player.jailTurns}/3 turns)</span>
                  </div>
                )}

                {player.getOutOfJailCards > 0 && (
                  <div data-design-id={`player-jail-cards-${index}`} className="flex items-center gap-1 text-xs text-purple-400">
                    <span>🎫</span>
                    <span>{player.getOutOfJailCards}x Get Out of Jail</span>
                  </div>
                )}

                {Object.keys(groupedProperties).length > 0 && (
                  <>
                    <Separator className="bg-zinc-700/50" />
                    <div data-design-id={`player-properties-${index}`} className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Properties</span>
                      <ScrollArea className="h-20">
                        <div className="space-y-1">
                          {Object.entries(groupedProperties).map(([color, props]) => (
                            <div key={color} className="flex items-center gap-1 flex-wrap">
                              <div 
                                className="w-2 h-2 rounded-sm"
                                style={{ backgroundColor: COLOR_MAP[color] }}
                              />
                              {props.map(prop => (
                                <span 
                                  key={prop.position}
                                  className={`text-[9px] px-1 py-0.5 rounded ${prop.isMortgaged ? 'bg-red-900/50 text-red-300 line-through' : 'bg-zinc-800 text-zinc-300'}`}
                                >
                                  {prop.name.split(' ').slice(-1)[0]}
                                  {prop.houses > 0 && ` 🏠${prop.houses}`}
                                  {prop.hasHotel && ' 🏨'}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}