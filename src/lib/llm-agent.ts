import type { GameState, Player, Property, LLMDecision } from './game-types';
import { BOARD_SPACES } from './board-data';

interface GameContext {
  player: Player;
  allPlayers: Player[];
  properties: Property[];
  currentPosition: number;
  spaceName: string;
  lastDiceRoll: { die1: number; die2: number } | null;
  turnNumber: number;
  freeParking: number;
}

function buildGameContext(state: GameState): GameContext {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const space = BOARD_SPACES[currentPlayer.position];
  
  return {
    player: currentPlayer,
    allPlayers: state.players.filter(p => !p.isBankrupt),
    properties: state.properties,
    currentPosition: currentPlayer.position,
    spaceName: space.name,
    lastDiceRoll: state.lastDiceRoll,
    turnNumber: state.turnNumber,
    freeParking: state.freeParking,
  };
}

function buildSystemPrompt(): string {
  return `You are an expert Monopoly player AI. You must analyze the game state and make optimal strategic decisions.

MONOPOLY RULES SUMMARY:
- Goal: Be the last player with money/assets
- Properties: Buy to collect rent from opponents
- Monopolies: Own all properties of one color to double rent and build houses
- Houses/Hotels: Build on monopolies to increase rent significantly
- Jail: Pay $50 or use card to exit; or try rolling doubles (3 turns max)
- Bankruptcy: Occurs when you can't pay debts

STRATEGY TIPS:
- Orange and red properties have best ROI
- Railroads provide steady income
- Don't overspend early - keep cash reserves
- Build houses evenly across monopolies
- Mortgage low-value properties if needed
- Consider opponents' positions and cash

You must respond with a valid JSON object containing your decision.`;
}

function buildDecisionPrompt(
  context: GameContext,
  decisionType: string,
  options: string[]
): string {
  const ownedProperties = context.properties.filter(p => p.owner === context.player.id);
  const opponentSummary = context.allPlayers
    .filter(p => p.id !== context.player.id)
    .map(p => `${p.name}: $${p.money}, ${context.properties.filter(prop => prop.owner === p.id).length} properties`)
    .join('; ');

  return `
CURRENT GAME STATE:
- Turn: ${context.turnNumber}
- Your name: ${context.player.name}
- Your money: $${context.player.money}
- Your position: ${context.spaceName} (space ${context.currentPosition})
- Your properties: ${ownedProperties.map(p => `${p.name} (${p.houses}H${p.hasHotel ? '+Hotel' : ''})`).join(', ') || 'None'}
- Jail cards: ${context.player.getOutOfJailCards}
- In jail: ${context.player.inJail}
- Last dice roll: ${context.lastDiceRoll ? `${context.lastDiceRoll.die1} + ${context.lastDiceRoll.die2} = ${context.lastDiceRoll.die1 + context.lastDiceRoll.die2}` : 'Not rolled yet'}
- Opponents: ${opponentSummary}
- Free Parking pot: $${context.freeParking}

DECISION REQUIRED: ${decisionType}
AVAILABLE OPTIONS: ${options.join(', ')}

Analyze the situation and respond with a JSON object:
{
  "action": "your_chosen_action",
  "reasoning": "brief explanation of your strategic thinking",
  "confidence": 0.0 to 1.0
}

Choose the action that maximizes your chance of winning the game.`;
}

export async function getLLMDecision(
  state: GameState,
  decisionType: string,
  options: string[],
  apiKey: string,
  model?: string
): Promise<LLMDecision> {
  const context = buildGameContext(state);
  
  try {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        model: model || 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildDecisionPrompt(context, decisionType, options) },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from LLM');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse LLM response as JSON');
    }

    const decision = JSON.parse(jsonMatch[0]) as LLMDecision;
    
    if (!options.includes(decision.action)) {
      decision.action = options[0];
      decision.reasoning += ' (action corrected to valid option)';
    }

    return decision;
  } catch (error) {
    console.error('LLM decision error:', error);
    return {
      action: options[0],
      reasoning: 'Fallback decision due to LLM error',
      confidence: 0.1,
    };
  }
}

export async function getAIBuyDecision(
  state: GameState,
  property: Property,
  apiKey: string,
  model?: string
): Promise<LLMDecision> {
  const player = state.players[state.currentPlayerIndex];
  const options = ['buy', 'auction'];
  
  const decisionType = `Should you buy ${property.name} for $${property.price}? 
You have $${player.money}. After purchase you'd have $${player.money - property.price}.
Property details: Color=${property.color}, Base rent=$${property.rent[0]}, House cost=$${property.houseCost}`;

  return getLLMDecision(state, decisionType, options, apiKey, model);
}

export async function getAIJailDecision(
  state: GameState,
  apiKey: string,
  model?: string
): Promise<LLMDecision> {
  const player = state.players[state.currentPlayerIndex];
  const options: string[] = ['roll'];
  
  if (player.money >= 50) options.push('pay');
  if (player.getOutOfJailCards > 0) options.push('useCard');

  const decisionType = `You are in jail (turn ${player.jailTurns + 1} of 3). How do you want to try to get out?
- roll: Try to roll doubles (free if successful)
- pay: Pay $50 fine
- useCard: Use Get Out of Jail Free card`;

  return getLLMDecision(state, decisionType, options, apiKey, model);
}

export async function getAIAuctionBid(
  state: GameState,
  property: Property,
  currentBid: number,
  apiKey: string,
  model?: string
): Promise<LLMDecision> {
  const player = state.players[state.currentPlayerIndex];
  const maxBid = Math.min(player.money, property.price * 2);
  const options = ['pass'];
  
  const bidIncrements = [10, 25, 50, 100];
  for (const inc of bidIncrements) {
    const newBid = currentBid + inc;
    if (newBid <= maxBid) {
      options.push(`bid_${newBid}`);
    }
  }

  const decisionType = `Auction for ${property.name} (value: $${property.price}). Current bid: $${currentBid}.
You have $${player.money}. What's your bid?`;

  return getLLMDecision(state, decisionType, options, apiKey, model);
}

export async function getAIBuildDecision(
  state: GameState,
  buildableProperties: Property[],
  apiKey: string,
  model?: string
): Promise<LLMDecision> {
  const options = ['skip', ...buildableProperties.map(p => `build_${p.position}`)];

  const decisionType = `You can build houses. Properties available:
${buildableProperties.map(p => `- ${p.name}: ${p.houses} houses, cost $${p.houseCost}, next rent $${p.rent[p.houses + 1]}`).join('\n')}
Choose skip or build_<position>`;

  return getLLMDecision(state, decisionType, options, apiKey, model);
}

export async function getAIMortgageDecision(
  state: GameState,
  neededMoney: number,
  apiKey: string,
  model?: string
): Promise<LLMDecision> {
  const player = state.players[state.currentPlayerIndex];
  const mortgageableProps = state.properties.filter(
    p => p.owner === player.id && !p.isMortgaged && p.houses === 0 && !p.hasHotel
  );
  
  const options = ['bankrupt', ...mortgageableProps.map(p => `mortgage_${p.position}`)];

  const decisionType = `You need $${neededMoney} but only have $${player.money}. 
Mortgageable properties:
${mortgageableProps.map(p => `- ${p.name}: mortgage value $${p.mortgage}`).join('\n')}
Choose bankrupt to give up, or mortgage_<position> to raise funds`;

  return getLLMDecision(state, decisionType, options, apiKey, model);
}