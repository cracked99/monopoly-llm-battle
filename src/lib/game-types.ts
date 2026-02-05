export type PropertyColor = 
  | 'brown' 
  | 'lightBlue' 
  | 'pink' 
  | 'orange' 
  | 'red' 
  | 'yellow' 
  | 'green' 
  | 'darkBlue'
  | 'railroad'
  | 'utility'
  | 'none';

export type SpaceType = 
  | 'property' 
  | 'railroad' 
  | 'utility' 
  | 'tax' 
  | 'chance' 
  | 'communityChest' 
  | 'corner' 
  | 'go'
  | 'jail'
  | 'freeParking'
  | 'goToJail';

export interface Property {
  name: string;
  position: number;
  type: SpaceType;
  color: PropertyColor;
  price: number;
  rent: number[];
  houseCost: number;
  hotelCost: number;
  mortgage: number;
  owner: string | null;
  houses: number;
  hasHotel: boolean;
  isMortgaged: boolean;
}

export interface BoardSpace {
  name: string;
  position: number;
  type: SpaceType;
  color: PropertyColor;
  price?: number;
  rent?: number[];
  houseCost?: number;
  hotelCost?: number;
  mortgage?: number;
  taxAmount?: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  emoji: string;
  money: number;
  position: number;
  properties: number[];
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  isAI: boolean;
  isBankrupt: boolean;
  llmModel?: string;
}

export interface ChanceCard {
  id: number;
  text: string;
  action: 'moveTo' | 'moveSpaces' | 'payMoney' | 'collectMoney' | 'payEach' | 'collectEach' | 'goToJail' | 'getOutOfJail' | 'repairs';
  value?: number;
  destination?: number;
}

export interface CommunityChestCard {
  id: number;
  text: string;
  action: 'moveTo' | 'payMoney' | 'collectMoney' | 'payEach' | 'collectEach' | 'goToJail' | 'getOutOfJail' | 'repairs';
  value?: number;
  destination?: number;
}

export interface TradeOffer {
  fromPlayerId: string;
  toPlayerId: string;
  offeredProperties: number[];
  requestedProperties: number[];
  offeredMoney: number;
  requestedMoney: number;
}

export interface GameAction {
  type: 'roll' | 'buy' | 'auction' | 'payRent' | 'buildHouse' | 'buildHotel' | 'sellHouse' | 'mortgage' | 'unmortgage' | 'trade' | 'useGetOutOfJail' | 'payJailFine' | 'endTurn' | 'bankrupt';
  playerId: string;
  data?: Record<string, unknown>;
}

export interface DiceRoll {
  die1: number;
  die2: number;
  isDoubles: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  properties: Property[];
  chanceCards: ChanceCard[];
  communityChestCards: CommunityChestCard[];
  currentChanceIndex: number;
  currentCommunityChestIndex: number;
  lastDiceRoll: DiceRoll | null;
  doublesCount: number;
  gamePhase: 'setup' | 'playing' | 'ended';
  winner: string | null;
  freeParking: number;
  turnNumber: number;
  gameLog: GameLogEntry[];
  pendingAction: 'none' | 'buyDecision' | 'auction' | 'cardAction' | 'jailDecision' | 'trade';
  auctionState: AuctionState | null;
}

export interface AuctionState {
  propertyIndex: number;
  currentBid: number;
  highestBidder: string | null;
  participants: string[];
  currentBidderIndex: number;
}

export interface GameLogEntry {
  turn: number;
  playerId: string;
  message: string;
  timestamp: number;
}

export interface LLMDecision {
  action: string;
  reasoning: string;
  confidence: number;
}

export const PLAYER_COLORS = [
  { color: '#e74c3c', emoji: '🔴', name: 'Red' },
  { color: '#3498db', emoji: '🔵', name: 'Blue' },
  { color: '#2ecc71', emoji: '🟢', name: 'Green' },
  { color: '#f1c40f', emoji: '🟡', name: 'Yellow' },
  { color: '#9b59b6', emoji: '🟣', name: 'Purple' },
  { color: '#e67e22', emoji: '🟠', name: 'Orange' },
];

export const LLM_MODELS = [
  // Anthropic
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  
  // OpenAI
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  
  // Google
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
  
  // DeepSeek
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-v3.1', name: 'DeepSeek V3.1', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  
  // xAI Grok
  { id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI' },
  { id: 'x-ai/grok-3-mini', name: 'Grok 3 Mini', provider: 'xAI' },
  
  // Qwen
  { id: 'qwen/qwen3-max', name: 'Qwen3 Max', provider: 'Qwen' },
  { id: 'qwen/qwen3-235b-a22b-instruct', name: 'Qwen3 235B', provider: 'Qwen' },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', provider: 'Qwen' },
  
  // Mistral
  { id: 'mistralai/mistral-large-2512', name: 'Mistral Large', provider: 'Mistral' },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2', provider: 'Mistral' },
  
  // Meta Llama
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
  
  // NVIDIA
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Nemotron Super 49B', provider: 'NVIDIA' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Nemotron Ultra 253B', provider: 'NVIDIA' },
  
  // Moonshot
  { id: 'moonshotai/kimi-k2', name: 'Kimi K2', provider: 'Moonshot' },
  
  // Amazon
  { id: 'amazon/nova-premier-v1', name: 'Nova Premier', provider: 'Amazon' },
  { id: 'amazon/nova-lite-v1', name: 'Nova Lite', provider: 'Amazon' },
  
  // MiniMax
  { id: 'minimax/minimax-m2', name: 'MiniMax M2', provider: 'MiniMax' },
  
  // Cohere
  { id: 'cohere/command-r-plus', name: 'Command R+', provider: 'Cohere' },
  { id: 'cohere/command-r7b-12-2024', name: 'Command R7B', provider: 'Cohere' },
];