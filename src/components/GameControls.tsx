'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { BOARD_SPACES } from '@/lib/board-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  getAIBuyDecision, 
  getAIJailDecision, 
  getAIAuctionBid,
  getAIBuildDecision 
} from '@/lib/llm-agent';

export default function GameControls() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiThinking, setAiThinking] = useState<string | null>(null);
  const [lastDecision, setLastDecision] = useState<{ action: string; reasoning: string } | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [gameSpeed, setGameSpeed] = useState(1500);
  const autoPlayRef = useRef(autoPlay);
  
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);
  
  const {
    gamePhase,
    players,
    currentPlayerIndex,
    properties,
    lastDiceRoll,
    doublesCount,
    pendingAction,
    auctionState,
    gameLog,
    freeParking,
    turnNumber,
    apiKey,
    rollDice,
    movePlayer,
    movePlayerToPosition,
    buyProperty,
    payRent,
    buildHouse,
    sendToJail,
    releaseFromJail,
    payJailFine,
    useGetOutOfJailCard,
    drawChanceCard,
    drawCommunityChestCard,
    executeCardAction,
    payTax,
    collectMoney,
    declareBankruptcy,
    nextTurn,
    startAuction,
    placeBid,
    passBid,
    endAuction,
    addLogEntry,
    setPendingAction,
    getPropertyByPosition,
    calculateRent,
    getPlayerProperties,
    canBuildHouse,
    getActivePlayers,
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];
  const currentSpace = currentPlayer ? BOARD_SPACES[currentPlayer.position] : null;

  useEffect(() => {
    if (!autoPlayRef.current) return;
    if (gamePhase !== 'playing') return;
    if (isProcessing) return;
    if (!currentPlayer) return;
    if (pendingAction !== 'none') return;

    const timeoutId = setTimeout(() => {
      if (!autoPlayRef.current) return;
      
      if (currentPlayer.inJail) {
        handleJailTurnAuto();
      } else {
        handleRollDiceAuto();
      }
    }, gameSpeed);

    return () => clearTimeout(timeoutId);
  }, [currentPlayerIndex, gamePhase, isProcessing, pendingAction, currentPlayer?.inJail, autoPlay, gameSpeed]);

  const handleRollDiceAuto = async () => {
    if (!currentPlayer || isProcessing) return;
    setIsProcessing(true);

    try {
      const roll = rollDice();
      addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2} = ${roll.die1 + roll.die2}${roll.isDoubles ? ' (DOUBLES!)' : ''}`);

      await new Promise(resolve => setTimeout(resolve, 500));

      const currentDoublesCount = useGameStore.getState().doublesCount;
      if (currentDoublesCount >= 3) {
        addLogEntry(currentPlayer.id, 'rolled doubles 3 times - going to jail!');
        sendToJail(currentPlayer.id);
        nextTurn();
        return;
      }

      movePlayer(currentPlayer.id, roll.die1 + roll.die2);

      await new Promise(resolve => setTimeout(resolve, 300));
      await handleLandingAuto(roll.die1 + roll.die2);

      if (!roll.isDoubles) {
        nextTurn();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJailTurnAuto = async () => {
    if (!currentPlayer || isProcessing) return;
    setIsProcessing(true);

    try {
      let decision: { action: string; reasoning: string };

      if (currentPlayer.isAI && apiKey) {
        setAiThinking('Deciding jail strategy...');
        const gameState = useGameStore.getState();
        const aiDecision = await getAIJailDecision(gameState, apiKey, currentPlayer.llmModel);
        decision = aiDecision;
        setLastDecision(decision);
        setAiThinking(null);
      } else {
        if (currentPlayer.getOutOfJailCards > 0) {
          decision = { action: 'useCard', reasoning: 'Using get out of jail card' };
        } else if (currentPlayer.money >= 50) {
          decision = { action: Math.random() > 0.5 ? 'pay' : 'roll', reasoning: 'Random choice' };
        } else {
          decision = { action: 'roll', reasoning: 'Must roll' };
        }
      }

      addLogEntry(currentPlayer.id, `chose to ${decision.action} (${decision.reasoning})`);

      if (decision.action === 'pay') {
        if (payJailFine(currentPlayer.id)) {
          const roll = rollDice();
          addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2} = ${roll.die1 + roll.die2}`);
          movePlayer(currentPlayer.id, roll.die1 + roll.die2);
          await handleLandingAuto(roll.die1 + roll.die2);
        }
      } else if (decision.action === 'useCard') {
        if (useGetOutOfJailCard(currentPlayer.id)) {
          const roll = rollDice();
          addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2} = ${roll.die1 + roll.die2}`);
          movePlayer(currentPlayer.id, roll.die1 + roll.die2);
          await handleLandingAuto(roll.die1 + roll.die2);
        }
      } else {
        const roll = rollDice();
        addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2}${roll.isDoubles ? ' - DOUBLES! Free!' : ''}`);
        
        if (roll.isDoubles) {
          releaseFromJail(currentPlayer.id);
          movePlayer(currentPlayer.id, roll.die1 + roll.die2);
          await handleLandingAuto(roll.die1 + roll.die2);
        } else {
          const state = useGameStore.getState();
          const updatedPlayer = state.players.find(p => p.id === currentPlayer.id);
          if (updatedPlayer && updatedPlayer.jailTurns >= 2) {
            if (payJailFine(currentPlayer.id)) {
              movePlayer(currentPlayer.id, roll.die1 + roll.die2);
              await handleLandingAuto(roll.die1 + roll.die2);
            } else {
              declareBankruptcy(currentPlayer.id);
            }
          } else {
            useGameStore.setState(state => {
              const idx = state.players.findIndex(p => p.id === currentPlayer.id);
              const updated = [...state.players];
              updated[idx] = { ...updated[idx], jailTurns: updated[idx].jailTurns + 1 };
              return { players: updated };
            });
          }
        }
      }

      nextTurn();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLandingAuto = async (diceTotal: number) => {
    const state = useGameStore.getState();
    const player = state.players[state.currentPlayerIndex];
    const space = BOARD_SPACES[player.position];

    addLogEntry(player.id, `landed on ${space.name}`);

    switch (space.type) {
      case 'property':
      case 'railroad':
      case 'utility': {
        const property = getPropertyByPosition(space.position);
        if (!property) return;

        if (!property.owner) {
          if (player.money >= property.price) {
            await handleBuyDecisionAuto(player, property);
          } else {
            startAuction(property.position);
            await handleAuctionAuto();
          }
        } else if (property.owner !== player.id && !property.isMortgaged) {
          const rentAmount = calculateRent(property, diceTotal);
          if (player.money >= rentAmount) {
            payRent(player.id, property.owner, rentAmount);
            addLogEntry(player.id, `paid $${rentAmount} rent to ${players.find(p => p.id === property.owner)?.name}`);
          } else {
            addLogEntry(player.id, `cannot afford $${rentAmount} rent!`);
            declareBankruptcy(player.id, property.owner);
          }
        }
        break;
      }

      case 'chance': {
        const card = drawChanceCard();
        executeCardAction(player.id, card);
        break;
      }

      case 'communityChest': {
        const card = drawCommunityChestCard();
        executeCardAction(player.id, card);
        break;
      }

      case 'tax': {
        const taxAmount = space.taxAmount || 200;
        if (player.money >= taxAmount) {
          payTax(player.id, taxAmount);
        } else {
          declareBankruptcy(player.id);
        }
        break;
      }

      case 'goToJail': {
        sendToJail(player.id);
        break;
      }

      case 'freeParking': {
        if (freeParking > 0) {
          collectMoney(player.id, freeParking);
          addLogEntry(player.id, `collected $${freeParking} from Free Parking!`);
          useGameStore.setState({ freeParking: 0 });
        }
        break;
      }
    }

    await handleBuildPhaseAuto(player);
  };

  const handleBuyDecisionAuto = async (player: typeof currentPlayer, property: NonNullable<ReturnType<typeof getPropertyByPosition>>) => {
    if (!player) return;

    let decision: { action: string; reasoning: string };

    if (player.isAI && apiKey) {
      setAiThinking(`Evaluating ${property.name}...`);
      const gameState = useGameStore.getState();
      const aiDecision = await getAIBuyDecision(gameState, property, apiKey, player.llmModel);
      decision = aiDecision;
      setLastDecision(decision);
      setAiThinking(null);
    } else {
      const shouldBuy = player.money >= property.price * 2 || Math.random() > 0.3;
      decision = { 
        action: shouldBuy ? 'buy' : 'auction', 
        reasoning: shouldBuy ? 'Good value' : 'Saving money' 
      };
    }

    addLogEntry(player.id, `decided to ${decision.action} (${decision.reasoning})`);

    if (decision.action === 'buy') {
      buyProperty(player.id, property.position);
    } else {
      startAuction(property.position);
      await handleAuctionAuto();
    }
  };

  const handleAuctionAuto = async () => {
    const state = useGameStore.getState();
    if (!state.auctionState) return;

    const property = state.properties.find(p => p.position === state.auctionState?.propertyIndex);
    if (!property) return;

    let rounds = 0;
    while (rounds < 20) {
      const currentState = useGameStore.getState();
      if (!currentState.auctionState || currentState.auctionState.participants.length <= 1) {
        break;
      }

      const bidderIndex = currentState.auctionState.currentBidderIndex;
      const bidderId = currentState.auctionState.participants[bidderIndex];
      const bidder = currentState.players.find(p => p.id === bidderId);

      if (!bidder) break;

      await new Promise(resolve => setTimeout(resolve, 200));

      if (bidder.isAI && apiKey) {
        setAiThinking(`${bidder.name} is thinking...`);
        const aiDecision = await getAIAuctionBid(
          currentState, 
          property, 
          currentState.auctionState.currentBid,
          apiKey,
          bidder.llmModel
        );
        setAiThinking(null);

        if (aiDecision.action === 'pass') {
          passBid(bidderId);
        } else if (aiDecision.action.startsWith('bid_')) {
          const bidAmount = Number.parseInt(aiDecision.action.split('_')[1]);
          placeBid(bidderId, bidAmount);
        } else {
          passBid(bidderId);
        }
      } else {
        const currentBid = currentState.auctionState.currentBid;
        const maxBid = Math.min(bidder.money, property.price);
        
        if (currentBid < maxBid && Math.random() > 0.4) {
          const newBid = Math.min(currentBid + 10 + Math.floor(Math.random() * 40), maxBid);
          placeBid(bidderId, newBid);
        } else {
          passBid(bidderId);
        }
      }

      rounds++;
    }

    endAuction();
  };

  const handleBuildPhaseAuto = async (player: typeof currentPlayer) => {
    if (!player) return;
    
    const buildableProperties = properties.filter(p => canBuildHouse(player.id, p.position));
    
    if (buildableProperties.length === 0) return;

    if (player.isAI && apiKey) {
      setAiThinking('Considering building...');
      const gameState = useGameStore.getState();
      const decision = await getAIBuildDecision(gameState, buildableProperties, apiKey, player.llmModel);
      setAiThinking(null);

      if (decision.action.startsWith('build_')) {
        const propPosition = Number.parseInt(decision.action.split('_')[1]);
        buildHouse(player.id, propPosition);
        addLogEntry(player.id, `built a house (${decision.reasoning})`);
      }
    }
  };

  const handleRollDice = useCallback(async () => {
    if (!currentPlayer || isProcessing) return;
    setIsProcessing(true);

    try {
      const roll = rollDice();
      addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2} = ${roll.die1 + roll.die2}${roll.isDoubles ? ' (DOUBLES!)' : ''}`);

      await new Promise(resolve => setTimeout(resolve, 500));

      if (doublesCount >= 3) {
        addLogEntry(currentPlayer.id, 'rolled doubles 3 times - going to jail!');
        sendToJail(currentPlayer.id);
        nextTurn();
        return;
      }

      movePlayer(currentPlayer.id, roll.die1 + roll.die2);

      await new Promise(resolve => setTimeout(resolve, 300));
      await handleLanding(roll.die1 + roll.die2);

      if (!roll.isDoubles && pendingAction === 'none') {
        nextTurn();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [currentPlayer, isProcessing, doublesCount]);

  const handleJailTurn = useCallback(async () => {
    if (!currentPlayer || isProcessing) return;
    setIsProcessing(true);

    try {
      let decision: { action: string; reasoning: string };

      if (currentPlayer.isAI && apiKey) {
        setAiThinking('Deciding jail strategy...');
        const gameState = useGameStore.getState();
        const aiDecision = await getAIJailDecision(gameState, apiKey, currentPlayer.llmModel);
        decision = aiDecision;
        setLastDecision(decision);
        setAiThinking(null);
      } else {
        decision = { action: 'roll', reasoning: 'Default action' };
      }

      addLogEntry(currentPlayer.id, `chose to ${decision.action} (${decision.reasoning})`);

      if (decision.action === 'pay') {
        if (payJailFine(currentPlayer.id)) {
          const roll = rollDice();
          addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2} = ${roll.die1 + roll.die2}`);
          movePlayer(currentPlayer.id, roll.die1 + roll.die2);
          await handleLanding(roll.die1 + roll.die2);
        }
      } else if (decision.action === 'useCard') {
        if (useGetOutOfJailCard(currentPlayer.id)) {
          const roll = rollDice();
          addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2} = ${roll.die1 + roll.die2}`);
          movePlayer(currentPlayer.id, roll.die1 + roll.die2);
          await handleLanding(roll.die1 + roll.die2);
        }
      } else {
        const roll = rollDice();
        addLogEntry(currentPlayer.id, `rolled ${roll.die1} + ${roll.die2}${roll.isDoubles ? ' - DOUBLES! Free!' : ''}`);
        
        if (roll.isDoubles) {
          releaseFromJail(currentPlayer.id);
          movePlayer(currentPlayer.id, roll.die1 + roll.die2);
          await handleLanding(roll.die1 + roll.die2);
        } else {
          const state = useGameStore.getState();
          const updatedPlayer = state.players.find(p => p.id === currentPlayer.id);
          if (updatedPlayer && updatedPlayer.jailTurns >= 2) {
            if (payJailFine(currentPlayer.id)) {
              movePlayer(currentPlayer.id, roll.die1 + roll.die2);
              await handleLanding(roll.die1 + roll.die2);
            } else {
              declareBankruptcy(currentPlayer.id);
            }
          } else {
            useGameStore.setState(state => {
              const idx = state.players.findIndex(p => p.id === currentPlayer.id);
              const updated = [...state.players];
              updated[idx] = { ...updated[idx], jailTurns: updated[idx].jailTurns + 1 };
              return { players: updated };
            });
          }
        }
      }

      nextTurn();
    } finally {
      setIsProcessing(false);
    }
  }, [currentPlayer, isProcessing, apiKey]);

  const handleLanding = useCallback(async (diceTotal: number) => {
    const state = useGameStore.getState();
    const player = state.players[state.currentPlayerIndex];
    const space = BOARD_SPACES[player.position];

    addLogEntry(player.id, `landed on ${space.name}`);

    switch (space.type) {
      case 'property':
      case 'railroad':
      case 'utility': {
        const property = getPropertyByPosition(space.position);
        if (!property) return;

        if (!property.owner) {
          if (player.money >= property.price) {
            setPendingAction('buyDecision');
            await handleBuyDecision(player, property);
          } else {
            startAuction(property.position);
            await handleAuction();
          }
        } else if (property.owner !== player.id && !property.isMortgaged) {
          const rentAmount = calculateRent(property, diceTotal);
          if (player.money >= rentAmount) {
            payRent(player.id, property.owner, rentAmount);
            addLogEntry(player.id, `paid $${rentAmount} rent to ${players.find(p => p.id === property.owner)?.name}`);
          } else {
            addLogEntry(player.id, `cannot afford $${rentAmount} rent!`);
            declareBankruptcy(player.id, property.owner);
          }
        }
        break;
      }

      case 'chance': {
        const card = drawChanceCard();
        executeCardAction(player.id, card);
        break;
      }

      case 'communityChest': {
        const card = drawCommunityChestCard();
        executeCardAction(player.id, card);
        break;
      }

      case 'tax': {
        const taxAmount = space.taxAmount || 200;
        if (player.money >= taxAmount) {
          payTax(player.id, taxAmount);
        } else {
          declareBankruptcy(player.id);
        }
        break;
      }

      case 'goToJail': {
        sendToJail(player.id);
        break;
      }

      case 'freeParking': {
        if (freeParking > 0) {
          collectMoney(player.id, freeParking);
          addLogEntry(player.id, `collected $${freeParking} from Free Parking!`);
          useGameStore.setState({ freeParking: 0 });
        }
        break;
      }
    }

    await handleBuildPhase(player);
  }, []);

  const handleBuyDecision = useCallback(async (player: typeof currentPlayer, property: NonNullable<ReturnType<typeof getPropertyByPosition>>) => {
    if (!player) return;

    let decision: { action: string; reasoning: string };

    if (player.isAI && apiKey) {
      setAiThinking(`Evaluating ${property.name}...`);
      const gameState = useGameStore.getState();
      const aiDecision = await getAIBuyDecision(gameState, property, apiKey, player.llmModel);
      decision = aiDecision;
      setLastDecision(decision);
      setAiThinking(null);
    } else {
      const shouldBuy = player.money >= property.price * 2 || Math.random() > 0.3;
      decision = { 
        action: shouldBuy ? 'buy' : 'auction', 
        reasoning: shouldBuy ? 'Good value' : 'Saving money' 
      };
    }

    addLogEntry(player.id, `decided to ${decision.action} (${decision.reasoning})`);

    if (decision.action === 'buy') {
      buyProperty(player.id, property.position);
    } else {
      startAuction(property.position);
      await handleAuction();
    }

    setPendingAction('none');
  }, [apiKey]);

  const handleAuction = useCallback(async () => {
    const state = useGameStore.getState();
    if (!state.auctionState) return;

    const property = state.properties.find(p => p.position === state.auctionState?.propertyIndex);
    if (!property) return;

    let rounds = 0;
    while (rounds < 20) {
      const currentState = useGameStore.getState();
      if (!currentState.auctionState || currentState.auctionState.participants.length <= 1) {
        break;
      }

      const bidderIndex = currentState.auctionState.currentBidderIndex;
      const bidderId = currentState.auctionState.participants[bidderIndex];
      const bidder = currentState.players.find(p => p.id === bidderId);

      if (!bidder) break;

      await new Promise(resolve => setTimeout(resolve, 300));

      if (bidder.isAI && apiKey) {
        setAiThinking(`${bidder.name} is thinking...`);
        const aiDecision = await getAIAuctionBid(
          currentState, 
          property, 
          currentState.auctionState.currentBid,
          apiKey,
          bidder.llmModel
        );
        setAiThinking(null);

        if (aiDecision.action === 'pass') {
          passBid(bidderId);
        } else if (aiDecision.action.startsWith('bid_')) {
          const bidAmount = Number.parseInt(aiDecision.action.split('_')[1]);
          placeBid(bidderId, bidAmount);
        } else {
          passBid(bidderId);
        }
      } else {
        const currentBid = currentState.auctionState.currentBid;
        const maxBid = Math.min(bidder.money, property.price);
        
        if (currentBid < maxBid && Math.random() > 0.4) {
          const newBid = Math.min(currentBid + 10 + Math.floor(Math.random() * 40), maxBid);
          placeBid(bidderId, newBid);
        } else {
          passBid(bidderId);
        }
      }

      rounds++;
    }

    endAuction();
  }, [apiKey]);

  const handleBuildPhase = useCallback(async (player: typeof currentPlayer) => {
    if (!player) return;
    
    const buildableProperties = properties.filter(p => canBuildHouse(player.id, p.position));
    
    if (buildableProperties.length === 0) return;

    if (player.isAI && apiKey) {
      setAiThinking('Considering building...');
      const gameState = useGameStore.getState();
      const decision = await getAIBuildDecision(gameState, buildableProperties, apiKey, player.llmModel);
      setAiThinking(null);

      if (decision.action.startsWith('build_')) {
        const propPosition = Number.parseInt(decision.action.split('_')[1]);
        buildHouse(player.id, propPosition);
        addLogEntry(player.id, `built a house (${decision.reasoning})`);
      }
    }
  }, [apiKey, properties]);

  const handleManualAction = useCallback(async (action: string) => {
    if (!currentPlayer || isProcessing) return;
    setIsProcessing(true);

    try {
      if (action === 'buy' && pendingAction === 'buyDecision') {
        const property = getPropertyByPosition(currentPlayer.position);
        if (property) {
          buyProperty(currentPlayer.id, property.position);
          setPendingAction('none');
        }
      } else if (action === 'auction' && pendingAction === 'buyDecision') {
        const property = getPropertyByPosition(currentPlayer.position);
        if (property) {
          startAuction(property.position);
          await handleAuction();
        }
      } else if (action === 'endTurn') {
        nextTurn();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [currentPlayer, isProcessing, pendingAction]);

  const canRoll = gamePhase === 'playing' && 
    currentPlayer && 
    !currentPlayer.inJail && 
    pendingAction === 'none' &&
    !isProcessing;

  const isInJail = currentPlayer?.inJail && pendingAction === 'none' && !isProcessing;

  return (
    <div 
      data-design-id="game-controls" 
      className="space-y-3 sm:space-y-4"
      role="region"
      aria-label="Game controls"
    >
      <Card data-design-id="turn-info-card" className="bg-zinc-900/90 border-zinc-700">
        <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
          <div className="flex justify-between items-center">
            <CardTitle 
              data-design-id="turn-info-title" 
              className="text-xs sm:text-sm text-zinc-300"
              aria-label={`Turn number ${turnNumber}`}
            >
              Turn {turnNumber}
            </CardTitle>
            <Badge 
              data-design-id="game-phase-badge" 
              variant="outline" 
              className="text-[9px] sm:text-[10px]"
              aria-label={`Game phase: ${gamePhase}`}
            >
              {gamePhase.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 pt-0">
          {currentPlayer && (
            <div data-design-id="current-player-info" className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm shrink-0"
                  style={{ backgroundColor: currentPlayer.color }}
                  aria-hidden="true"
                >
                  {currentPlayer.emoji.charAt(0)}
                </div>
                <span className="font-semibold text-zinc-100 text-sm sm:text-base truncate">
                  {currentPlayer.name}
                </span>
                {currentPlayer.isAI && (
                  <Badge className="text-[9px] sm:text-[10px] bg-cyan-600 shrink-0">AI</Badge>
                )}
              </div>
              
              <div 
                data-design-id="player-position-info" 
                className="text-[10px] sm:text-xs text-zinc-400"
                aria-label={`Current position: ${currentSpace?.name}`}
              >
                Position: {currentSpace?.name}
              </div>

              {lastDiceRoll && (
                <div 
                  data-design-id="last-roll-info" 
                  className="text-[10px] sm:text-xs text-zinc-400"
                  role="status"
                  aria-live="polite"
                >
                  Last Roll: {lastDiceRoll.die1} + {lastDiceRoll.die2} = {lastDiceRoll.die1 + lastDiceRoll.die2}
                  {lastDiceRoll.isDoubles && <span className="text-amber-400 ml-1">(Doubles!)</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {aiThinking && (
          <motion.div
            data-design-id="ai-thinking-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="status"
            aria-live="polite"
            aria-label={`AI is thinking: ${aiThinking}`}
          >
            <Card className="bg-cyan-950/50 border-cyan-700">
              <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                  className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-cyan-400 border-t-transparent rounded-full shrink-0"
                  aria-hidden="true"
                />
                <span className="text-xs sm:text-sm text-cyan-300">{aiThinking}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {lastDecision && (
        <Card data-design-id="last-decision-card" className="bg-zinc-800/50 border-zinc-600">
          <CardContent className="p-2 sm:p-3">
            <div className="text-[10px] sm:text-xs text-zinc-400">Last AI Decision:</div>
            <div className="text-xs sm:text-sm text-zinc-200 font-medium">{lastDecision.action}</div>
            <div className="text-[10px] sm:text-xs text-zinc-400 italic truncate">"{lastDecision.reasoning}"</div>
          </CardContent>
        </Card>
      )}

      <div data-design-id="action-buttons" className="space-y-2">
        {canRoll && (
          <Button 
            data-design-id="roll-dice-button"
            onClick={handleRollDice}
            disabled={isProcessing}
            aria-label="Roll dice"
            className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold py-4 sm:py-6 text-base sm:text-lg shadow-lg shadow-amber-500/30 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 active:scale-[0.98] transition-transform touch-manipulation"
          >
            🎲 Roll Dice
          </Button>
        )}

        {isInJail && (
          <Button 
            data-design-id="jail-turn-button"
            onClick={handleJailTurn}
            disabled={isProcessing}
            aria-label="Take jail turn"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold py-4 sm:py-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-400 active:scale-[0.98] transition-transform touch-manipulation"
          >
            🔒 Take Jail Turn
          </Button>
        )}

        {pendingAction === 'buyDecision' && currentPlayer && !currentPlayer.isAI && (
          <div data-design-id="buy-decision-buttons" className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => handleManualAction('buy')}
              aria-label="Buy property"
              className="bg-emerald-600 hover:bg-emerald-500 py-3 sm:py-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 active:scale-[0.98] transition-transform touch-manipulation"
            >
              Buy Property
            </Button>
            <Button 
              onClick={() => handleManualAction('auction')}
              variant="outline"
              aria-label="Start auction"
              className="border-zinc-600 py-3 sm:py-4 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] transition-transform touch-manipulation"
            >
              Auction
            </Button>
          </div>
        )}

        {pendingAction === 'auction' && auctionState && (
          <Card 
            data-design-id="auction-card" 
            className="bg-amber-950/50 border-amber-700"
            role="status"
            aria-live="polite"
          >
            <CardContent className="p-2 sm:p-3">
              <div className="text-center">
                <div className="text-xs sm:text-sm text-amber-300">Auction in Progress</div>
                <div 
                  className="text-xl sm:text-2xl font-bold text-amber-400"
                  aria-label={`Current bid: $${auctionState.currentBid}`}
                >
                  ${auctionState.currentBid}
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-400">
                  {auctionState.highestBidder 
                    ? `Leading: ${players.find(p => p.id === auctionState.highestBidder)?.name}`
                    : 'No bids yet'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card data-design-id="auto-play-card" className="bg-zinc-900/90 border-zinc-700">
        <CardContent className="p-2 sm:p-3 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <label 
              htmlFor="auto-play-switch" 
              className="text-xs sm:text-sm text-zinc-300 cursor-pointer"
            >
              Auto-Play
            </label>
            <Switch
              id="auto-play-switch"
              data-design-id="auto-play-switch"
              checked={autoPlay}
              onCheckedChange={setAutoPlay}
              className="data-[state=checked]:bg-emerald-600"
              aria-label={`Auto-play is ${autoPlay ? 'on' : 'off'}`}
            />
          </div>
          {autoPlay && (
            <div className="space-y-1">
              <label 
                htmlFor="speed-slider"
                className="text-[10px] sm:text-xs text-zinc-400 block"
              >
                Speed: {gameSpeed}ms {gameSpeed < 1000 ? '(Fast)' : gameSpeed > 2000 ? '(Slow)' : '(Normal)'}
              </label>
              <input
                id="speed-slider"
                data-design-id="speed-slider"
                type="range"
                min={500}
                max={3000}
                step={100}
                value={gameSpeed}
                onChange={(e) => setGameSpeed(Number(e.target.value))}
                aria-label={`Game speed: ${gameSpeed} milliseconds`}
                aria-valuemin={500}
                aria-valuemax={3000}
                aria-valuenow={gameSpeed}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 touch-manipulation"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-design-id="game-log-card" className="bg-zinc-900/90 border-zinc-700">
        <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
          <CardTitle data-design-id="game-log-title" className="text-xs sm:text-sm text-zinc-300">
            Game Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-32 sm:h-48">
            <div 
              data-design-id="game-log-entries" 
              className="p-2 sm:p-3 space-y-1"
              role="log"
              aria-label="Game event log"
              aria-live="polite"
            >
              {gameLog.slice().reverse().map((entry, idx) => (
                <motion.div
                  key={`${entry.timestamp}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] sm:text-xs text-zinc-400 border-l-2 border-zinc-700 pl-2"
                >
                  <span className="text-zinc-500 mr-1">[T{entry.turn}]</span>
                  {entry.message}
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}