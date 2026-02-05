'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { LLM_MODELS, PLAYER_COLORS } from '@/lib/game-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface PlayerConfig {
  name: string;
  isAI: boolean;
  llmModel: string;
}

export default function GameSetup() {
  const [apiKey, setApiKey] = useState('');
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([
    { name: 'Claude', isAI: true, llmModel: 'anthropic/claude-3.5-sonnet' },
    { name: 'GPT-4o', isAI: true, llmModel: 'openai/gpt-4o' },
  ]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [error, setError] = useState('');

  const { initializeGame, setApiKey: storeApiKey } = useGameStore();

  const addPlayer = () => {
    if (playerConfigs.length >= 6) return;
    
    const usedModels = playerConfigs.map(p => p.llmModel);
    const availableModel = LLM_MODELS.find(m => !usedModels.includes(m.id)) || LLM_MODELS[0];
    
    setPlayerConfigs([
      ...playerConfigs,
      { 
        name: availableModel.name.split(' ')[0], 
        isAI: true, 
        llmModel: availableModel.id 
      },
    ]);
  };

  const removePlayer = (index: number) => {
    if (playerConfigs.length <= 2) return;
    setPlayerConfigs(playerConfigs.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, updates: Partial<PlayerConfig>) => {
    const newConfigs = [...playerConfigs];
    newConfigs[index] = { ...newConfigs[index], ...updates };
    setPlayerConfigs(newConfigs);
  };

  const startGame = () => {
    setError('');
    
    const hasAI = playerConfigs.some(p => p.isAI);
    if (hasAI && !apiKey.trim()) {
      setError('OpenRouter API key is required for AI players');
      return;
    }

    if (playerConfigs.length < 2) {
      setError('At least 2 players are required');
      return;
    }

    storeApiKey(apiKey.trim());
    initializeGame(playerConfigs);
  };

  return (
    <div data-design-id="game-setup-container" className="min-h-screen bg-gradient-to-br from-zinc-950 via-emerald-950/20 to-zinc-950 flex items-center justify-center p-4">
      <motion.div
        data-design-id="setup-card-wrapper"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card data-design-id="setup-card" className="bg-zinc-900/95 border-amber-600/30 shadow-2xl shadow-amber-500/10">
          <CardHeader data-design-id="setup-header" className="text-center space-y-2">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <CardTitle 
                data-design-id="setup-title"
                className="text-4xl md:text-5xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent"
              >
                MONOPOLY
              </CardTitle>
              <CardDescription 
                data-design-id="setup-subtitle"
                className="text-amber-500/70 text-sm tracking-widest mt-1"
              >
                LLM BATTLE ARENA
              </CardDescription>
            </motion.div>
            <p data-design-id="setup-description" className="text-zinc-400 text-sm mt-4">
              Watch AI models compete in the classic game of Monopoly!
              Configure your players and let the battle begin.
            </p>
          </CardHeader>

          <CardContent data-design-id="setup-content" className="space-y-6">
            <div data-design-id="api-key-section" className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                OpenRouter API Key
              </label>
              <Input
                data-design-id="api-key-input"
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
              <p className="text-xs text-zinc-500">
                Get your API key from{' '}
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            <Separator className="bg-zinc-700/50" />

            <div data-design-id="players-section" className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-zinc-300">
                  Players ({playerConfigs.length}/6)
                </label>
                <Button
                  data-design-id="add-player-button"
                  variant="outline"
                  size="sm"
                  onClick={addPlayer}
                  disabled={playerConfigs.length >= 6}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  + Add Player
                </Button>
              </div>

              <AnimatePresence mode="popLayout">
                {playerConfigs.map((config, index) => (
                  <motion.div
                    key={index}
                    data-design-id={`player-config-${index}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                  >
                    <div 
                      data-design-id={`player-color-indicator-${index}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 border-white/20 shrink-0"
                      style={{ backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length].color }}
                    >
                      {PLAYER_COLORS[index % PLAYER_COLORS.length].emoji.charAt(0)}
                    </div>

                    <div className="flex-1 space-y-2">
                      <Input
                        data-design-id={`player-name-input-${index}`}
                        placeholder="Player Name"
                        value={config.name}
                        onChange={(e) => updatePlayer(index, { name: e.target.value })}
                        className="h-8 text-sm bg-zinc-700 border-zinc-600 text-zinc-100"
                      />
                      
                      {config.isAI && (
                        <select
                          data-design-id={`player-model-select-${index}`}
                          value={config.llmModel}
                          onChange={(e) => updatePlayer(index, { llmModel: e.target.value })}
                          className="w-full h-8 text-xs bg-zinc-700 border border-zinc-600 rounded-md text-zinc-100 px-2"
                        >
                          {LLM_MODELS.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-400">AI</span>
                        <Switch
                          data-design-id={`player-ai-switch-${index}`}
                          checked={config.isAI}
                          onCheckedChange={(checked) => updatePlayer(index, { isAI: checked })}
                          className="data-[state=checked]:bg-cyan-600"
                        />
                      </div>
                      
                      {playerConfigs.length > 2 && (
                        <Button
                          data-design-id={`remove-player-button-${index}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => removePlayer(index)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {error && (
              <motion.div
                data-design-id="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}

            <Button
              data-design-id="start-game-button"
              onClick={startGame}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold py-6 text-lg shadow-lg shadow-amber-500/30"
            >
              🎲 Start Battle
            </Button>

            <div data-design-id="info-badges" className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                💰 Starting Cash: $1,500
              </Badge>
              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                🏠 Full Property Set
              </Badge>
              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                🤖 AI vs AI Battles
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}