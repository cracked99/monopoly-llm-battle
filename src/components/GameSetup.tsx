'use client';

import { useState, useEffect } from 'react';
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
  const [hasServerKey, setHasServerKey] = useState(false);
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([
    { name: 'Claude', isAI: true, llmModel: 'anthropic/claude-sonnet-4' },
    { name: 'GPT-4.1', isAI: true, llmModel: 'openai/gpt-4.1' },
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setHasServerKey(data.hasServerApiKey))
      .catch(() => setHasServerKey(false));
  }, []);

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
    if (hasAI && !apiKey.trim() && !hasServerKey) {
      setError('OpenRouter API key is required for AI players');
      return;
    }

    if (playerConfigs.length < 2) {
      setError('At least 2 players are required');
      return;
    }

    storeApiKey(apiKey.trim() || 'server');
    initializeGame(playerConfigs);
  };

  return (
    <div 
      data-design-id="game-setup-container" 
      className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-zinc-950 via-emerald-950/20 to-zinc-950 flex items-center justify-center p-3 sm:p-4"
      role="main"
      aria-label="Game setup"
    >
      <motion.div
        data-design-id="setup-card-wrapper"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card data-design-id="setup-card" className="bg-zinc-900/95 border-amber-600/30 shadow-2xl shadow-amber-500/10">
          <CardHeader data-design-id="setup-header" className="text-center space-y-2 p-4 sm:p-6">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <CardTitle 
                data-design-id="setup-title"
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent"
              >
                MONOPOLY
              </CardTitle>
              <CardDescription 
                data-design-id="setup-subtitle"
                className="text-amber-500/70 text-xs sm:text-sm tracking-widest mt-1"
              >
                LLM BATTLE ARENA
              </CardDescription>
            </motion.div>
            <p data-design-id="setup-description" className="text-zinc-400 text-xs sm:text-sm mt-4 px-2">
              Watch AI models compete in the classic game of Monopoly!
              Configure your players and let the battle begin.
            </p>
          </CardHeader>

          <CardContent data-design-id="setup-content" className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
            <div data-design-id="api-key-section" className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label 
                  htmlFor="api-key-input"
                  className="text-xs sm:text-sm font-medium text-zinc-300"
                >
                  OpenRouter API Key
                </label>
                {hasServerKey && (
                  <Badge 
                    data-design-id="server-key-badge" 
                    className="bg-emerald-600 text-white text-[9px] sm:text-[10px]"
                    aria-label="Server API key is configured"
                  >
                    ✓ Server Key Configured
                  </Badge>
                )}
              </div>
              <Input
                id="api-key-input"
                data-design-id="api-key-input"
                type="password"
                placeholder={hasServerKey ? 'Using server key (optional override)' : 'sk-or-v1-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-10 sm:h-11 text-sm"
                aria-describedby="api-key-help"
              />
              <p id="api-key-help" className="text-[10px] sm:text-xs text-zinc-500">
                {hasServerKey ? 'Server API key is configured. You can optionally enter a different key.' : (
                  <>
                    Get your API key from{' '}
                    <a 
                      href="https://openrouter.ai/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                    >
                      openrouter.ai/keys
                    </a>
                  </>
                )}
              </p>
            </div>

            <Separator className="bg-zinc-700/50" />

            <fieldset data-design-id="players-section" className="space-y-3">
              <legend className="sr-only">Configure players</legend>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-xs sm:text-sm font-medium text-zinc-300">
                  Players ({playerConfigs.length}/6)
                </span>
                <Button
                  data-design-id="add-player-button"
                  variant="outline"
                  size="sm"
                  onClick={addPlayer}
                  disabled={playerConfigs.length >= 6}
                  aria-label={`Add player. Currently ${playerConfigs.length} of 6 players`}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-xs sm:text-sm h-8 sm:h-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400"
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
                    className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                    role="group"
                    aria-label={`Player ${index + 1} configuration`}
                  >
                    <div 
                      data-design-id={`player-color-indicator-${index}`}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base sm:text-lg border-2 border-white/20 shrink-0 mt-1 sm:mt-0"
                      style={{ backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length].color }}
                      aria-hidden="true"
                    >
                      {PLAYER_COLORS[index % PLAYER_COLORS.length].emoji.charAt(0)}
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      <Input
                        data-design-id={`player-name-input-${index}`}
                        placeholder="Player Name"
                        value={config.name}
                        onChange={(e) => updatePlayer(index, { name: e.target.value })}
                        aria-label={`Player ${index + 1} name`}
                        className="h-8 sm:h-9 text-xs sm:text-sm bg-zinc-700 border-zinc-600 text-zinc-100"
                      />
                      
                      {config.isAI && (
                        <select
                          data-design-id={`player-model-select-${index}`}
                          value={config.llmModel}
                          onChange={(e) => updatePlayer(index, { llmModel: e.target.value })}
                          aria-label={`AI model for player ${index + 1}`}
                          className="w-full h-8 sm:h-9 text-[10px] sm:text-xs bg-zinc-700 border border-zinc-600 rounded-md text-zinc-100 px-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          {Object.entries(
                            LLM_MODELS.reduce((groups, model) => {
                              const provider = model.provider || 'Other';
                              if (!groups[provider]) groups[provider] = [];
                              groups[provider].push(model);
                              return groups;
                            }, {} as Record<string, typeof LLM_MODELS>)
                          ).map(([provider, models]) => (
                            <optgroup key={provider} label={`── ${provider} ──`}>
                              {models.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <label 
                          htmlFor={`ai-switch-${index}`}
                          className="text-[10px] sm:text-xs text-zinc-400 cursor-pointer"
                        >
                          AI
                        </label>
                        <Switch
                          id={`ai-switch-${index}`}
                          data-design-id={`player-ai-switch-${index}`}
                          checked={config.isAI}
                          onCheckedChange={(checked) => updatePlayer(index, { isAI: checked })}
                          className="data-[state=checked]:bg-cyan-600"
                          aria-label={`Toggle AI for player ${index + 1}`}
                        />
                      </div>
                      
                      {playerConfigs.length > 2 && (
                        <Button
                          data-design-id={`remove-player-button-${index}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => removePlayer(index)}
                          aria-label={`Remove player ${config.name || index + 1}`}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20 focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </fieldset>

            {error && (
              <motion.div
                data-design-id="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                aria-live="assertive"
                className="p-2 sm:p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs sm:text-sm"
              >
                {error}
              </motion.div>
            )}

            <Button
              data-design-id="start-game-button"
              onClick={startGame}
              aria-label="Start the game"
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold py-4 sm:py-6 text-base sm:text-lg shadow-lg shadow-amber-500/30 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 active:scale-[0.98] transition-transform touch-manipulation"
            >
              🎲 Start Battle
            </Button>

            <div data-design-id="info-badges" className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
              <Badge 
                variant="outline" 
                className="text-[10px] sm:text-xs border-zinc-600 text-zinc-400"
              >
                💰 Starting Cash: $1,500
              </Badge>
              <Badge 
                variant="outline" 
                className="text-[10px] sm:text-xs border-zinc-600 text-zinc-400"
              >
                🏠 Full Property Set
              </Badge>
              <Badge 
                variant="outline" 
                className="text-[10px] sm:text-xs border-cyan-600 text-cyan-400"
              >
                🤖 {LLM_MODELS.length} AI Models
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}