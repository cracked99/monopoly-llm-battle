import { create } from 'zustand';
import type { 
  GameState, 
  Player, 
  Property, 
  DiceRoll, 
  GameLogEntry,
  AuctionState,
  ChanceCard,
  CommunityChestCard
} from './game-types';
import { BOARD_SPACES, CHANCE_CARDS, COMMUNITY_CHEST_CARDS, COLOR_GROUP_PROPERTIES } from './board-data';
import { PLAYER_COLORS } from './game-types';

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function initializeProperties(): Property[] {
  return BOARD_SPACES.filter(
    space => space.type === 'property' || space.type === 'railroad' || space.type === 'utility'
  ).map(space => ({
    name: space.name,
    position: space.position,
    type: space.type,
    color: space.color,
    price: space.price || 0,
    rent: space.rent || [],
    houseCost: space.houseCost || 0,
    hotelCost: space.hotelCost || 0,
    mortgage: space.mortgage || 0,
    owner: null,
    houses: 0,
    hasHotel: false,
    isMortgaged: false,
  }));
}

interface GameStore extends GameState {
  initializeGame: (playerConfigs: { name: string; isAI: boolean; llmModel?: string }[]) => void;
  rollDice: () => DiceRoll;
  movePlayer: (playerId: string, spaces: number, passGo?: boolean) => void;
  movePlayerToPosition: (playerId: string, position: number, collectGoMoney?: boolean) => void;
  buyProperty: (playerId: string, propertyPosition: number) => boolean;
  payRent: (payerId: string, ownerId: string, amount: number) => boolean;
  buildHouse: (playerId: string, propertyPosition: number) => boolean;
  buildHotel: (playerId: string, propertyPosition: number) => boolean;
  sellHouse: (playerId: string, propertyPosition: number) => boolean;
  mortgageProperty: (playerId: string, propertyPosition: number) => boolean;
  unmortgageProperty: (playerId: string, propertyPosition: number) => boolean;
  sendToJail: (playerId: string) => void;
  releaseFromJail: (playerId: string) => void;
  payJailFine: (playerId: string) => boolean;
  useGetOutOfJailCard: (playerId: string) => boolean;
  drawChanceCard: () => ChanceCard;
  drawCommunityChestCard: () => CommunityChestCard;
  executeCardAction: (playerId: string, card: ChanceCard | CommunityChestCard) => void;
  payTax: (playerId: string, amount: number) => boolean;
  collectMoney: (playerId: string, amount: number) => void;
  payMoney: (playerId: string, amount: number) => boolean;
  transferMoney: (fromId: string, toId: string, amount: number) => boolean;
  declareBankruptcy: (playerId: string, creditorId?: string) => void;
  nextTurn: () => void;
  startAuction: (propertyPosition: number) => void;
  placeBid: (playerId: string, amount: number) => void;
  passBid: (playerId: string) => void;
  endAuction: () => void;
  addLogEntry: (playerId: string, message: string) => void;
  getCurrentPlayer: () => Player | null;
  getPropertyByPosition: (position: number) => Property | undefined;
  getPlayerProperties: (playerId: string) => Property[];
  canBuildHouse: (playerId: string, propertyPosition: number) => boolean;
  calculateRent: (property: Property, diceRoll?: number) => number;
  checkMonopoly: (playerId: string, color: string) => boolean;
  getActivePlayers: () => Player[];
  checkWinner: () => void;
  setPendingAction: (action: GameState['pendingAction']) => void;
  setApiKey: (key: string) => void;
  apiKey: string;
}

export const useGameStore = create<GameStore>((set, get) => ({
  players: [],
  currentPlayerIndex: 0,
  properties: [],
  chanceCards: shuffleArray(CHANCE_CARDS),
  communityChestCards: shuffleArray(COMMUNITY_CHEST_CARDS),
  currentChanceIndex: 0,
  currentCommunityChestIndex: 0,
  lastDiceRoll: null,
  doublesCount: 0,
  gamePhase: 'setup',
  winner: null,
  freeParking: 0,
  turnNumber: 1,
  gameLog: [],
  pendingAction: 'none',
  auctionState: null,
  apiKey: '',

  setApiKey: (key: string) => set({ apiKey: key }),

  initializeGame: (playerConfigs) => {
    const players: Player[] = playerConfigs.map((config, index) => ({
      id: `player-${index}`,
      name: config.name,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length].color,
      emoji: PLAYER_COLORS[index % PLAYER_COLORS.length].emoji,
      money: 1500,
      position: 0,
      properties: [],
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      isAI: config.isAI,
      isBankrupt: false,
      llmModel: config.llmModel,
    }));

    set({
      players,
      currentPlayerIndex: 0,
      properties: initializeProperties(),
      chanceCards: shuffleArray(CHANCE_CARDS),
      communityChestCards: shuffleArray(COMMUNITY_CHEST_CARDS),
      currentChanceIndex: 0,
      currentCommunityChestIndex: 0,
      lastDiceRoll: null,
      doublesCount: 0,
      gamePhase: 'playing',
      winner: null,
      freeParking: 0,
      turnNumber: 1,
      gameLog: [],
      pendingAction: 'none',
      auctionState: null,
    });

    get().addLogEntry('system', 'Game started!');
  },

  rollDice: () => {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const isDoubles = die1 === die2;
    const roll: DiceRoll = { die1, die2, isDoubles };
    
    set((state) => ({
      lastDiceRoll: roll,
      doublesCount: isDoubles ? state.doublesCount + 1 : 0,
    }));

    return roll;
  },

  movePlayer: (playerId, spaces, passGo = true) => {
    set((state) => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const player = state.players[playerIndex];
      const newPosition = (player.position + spaces + 40) % 40;
      const passedGo = passGo && player.position + spaces >= 40 && spaces > 0;

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        position: newPosition,
        money: passedGo ? player.money + 200 : player.money,
      };

      return { players: updatedPlayers };
    });

    if (spaces > 0) {
      const player = get().players.find(p => p.id === playerId);
      if (player && player.position + spaces >= 40) {
        get().addLogEntry(playerId, 'passed GO and collected $200');
      }
    }
  },

  movePlayerToPosition: (playerId, position, collectGoMoney = true) => {
    set((state) => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const player = state.players[playerIndex];
      const passedGo = collectGoMoney && position < player.position && position !== 10;

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        position,
        money: passedGo ? player.money + 200 : player.money,
      };

      return { players: updatedPlayers };
    });
  },

  buyProperty: (playerId, propertyPosition) => {
    const state = get();
    const property = state.properties.find(p => p.position === propertyPosition);
    const player = state.players.find(p => p.id === playerId);

    if (!property || !player || property.owner || player.money < property.price) {
      return false;
    }

    set((state) => {
      const propertyIndex = state.properties.findIndex(p => p.position === propertyPosition);
      const playerIndex = state.players.findIndex(p => p.id === playerId);

      const updatedProperties = [...state.properties];
      updatedProperties[propertyIndex] = { ...property, owner: playerId };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money - property.price,
        properties: [...player.properties, propertyPosition],
      };

      return { properties: updatedProperties, players: updatedPlayers };
    });

    get().addLogEntry(playerId, `bought ${property.name} for $${property.price}`);
    return true;
  },

  payRent: (payerId, ownerId, amount) => {
    return get().transferMoney(payerId, ownerId, amount);
  },

  buildHouse: (playerId, propertyPosition) => {
    const state = get();
    const property = state.properties.find(p => p.position === propertyPosition);
    const player = state.players.find(p => p.id === playerId);

    if (!property || !player || property.owner !== playerId) return false;
    if (property.houses >= 4 || property.hasHotel) return false;
    if (player.money < property.houseCost) return false;
    if (!get().checkMonopoly(playerId, property.color)) return false;

    set((state) => {
      const propertyIndex = state.properties.findIndex(p => p.position === propertyPosition);
      const playerIndex = state.players.findIndex(p => p.id === playerId);

      const updatedProperties = [...state.properties];
      updatedProperties[propertyIndex] = { ...property, houses: property.houses + 1 };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money - property.houseCost,
      };

      return { properties: updatedProperties, players: updatedPlayers };
    });

    get().addLogEntry(playerId, `built a house on ${property.name}`);
    return true;
  },

  buildHotel: (playerId, propertyPosition) => {
    const state = get();
    const property = state.properties.find(p => p.position === propertyPosition);
    const player = state.players.find(p => p.id === playerId);

    if (!property || !player || property.owner !== playerId) return false;
    if (property.houses !== 4 || property.hasHotel) return false;
    if (player.money < property.hotelCost) return false;

    set((state) => {
      const propertyIndex = state.properties.findIndex(p => p.position === propertyPosition);
      const playerIndex = state.players.findIndex(p => p.id === playerId);

      const updatedProperties = [...state.properties];
      updatedProperties[propertyIndex] = { ...property, houses: 0, hasHotel: true };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money - property.hotelCost,
      };

      return { properties: updatedProperties, players: updatedPlayers };
    });

    get().addLogEntry(playerId, `built a hotel on ${property.name}`);
    return true;
  },

  sellHouse: (playerId, propertyPosition) => {
    const state = get();
    const property = state.properties.find(p => p.position === propertyPosition);
    const player = state.players.find(p => p.id === playerId);

    if (!property || !player || property.owner !== playerId) return false;
    if (property.houses === 0 && !property.hasHotel) return false;

    const salePrice = property.hasHotel ? property.hotelCost / 2 : property.houseCost / 2;

    set((state) => {
      const propertyIndex = state.properties.findIndex(p => p.position === propertyPosition);
      const playerIndex = state.players.findIndex(p => p.id === playerId);

      const updatedProperties = [...state.properties];
      if (property.hasHotel) {
        updatedProperties[propertyIndex] = { ...property, hasHotel: false, houses: 4 };
      } else {
        updatedProperties[propertyIndex] = { ...property, houses: property.houses - 1 };
      }

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money + salePrice,
      };

      return { properties: updatedProperties, players: updatedPlayers };
    });

    get().addLogEntry(playerId, `sold a house from ${property.name} for $${salePrice}`);
    return true;
  },

  mortgageProperty: (playerId, propertyPosition) => {
    const state = get();
    const property = state.properties.find(p => p.position === propertyPosition);
    const player = state.players.find(p => p.id === playerId);

    if (!property || !player || property.owner !== playerId) return false;
    if (property.isMortgaged || property.houses > 0 || property.hasHotel) return false;

    set((state) => {
      const propertyIndex = state.properties.findIndex(p => p.position === propertyPosition);
      const playerIndex = state.players.findIndex(p => p.id === playerId);

      const updatedProperties = [...state.properties];
      updatedProperties[propertyIndex] = { ...property, isMortgaged: true };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money + property.mortgage,
      };

      return { properties: updatedProperties, players: updatedPlayers };
    });

    get().addLogEntry(playerId, `mortgaged ${property.name} for $${property.mortgage}`);
    return true;
  },

  unmortgageProperty: (playerId, propertyPosition) => {
    const state = get();
    const property = state.properties.find(p => p.position === propertyPosition);
    const player = state.players.find(p => p.id === playerId);

    if (!property || !player || property.owner !== playerId) return false;
    if (!property.isMortgaged) return false;

    const unmortgageCost = Math.floor(property.mortgage * 1.1);
    if (player.money < unmortgageCost) return false;

    set((state) => {
      const propertyIndex = state.properties.findIndex(p => p.position === propertyPosition);
      const playerIndex = state.players.findIndex(p => p.id === playerId);

      const updatedProperties = [...state.properties];
      updatedProperties[propertyIndex] = { ...property, isMortgaged: false };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        money: player.money - unmortgageCost,
      };

      return { properties: updatedProperties, players: updatedPlayers };
    });

    get().addLogEntry(playerId, `unmortgaged ${property.name} for $${Math.floor(property.mortgage * 1.1)}`);
    return true;
  },

  sendToJail: (playerId) => {
    set((state) => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        position: 10,
        inJail: true,
        jailTurns: 0,
      };

      return { players: updatedPlayers, doublesCount: 0 };
    });

    get().addLogEntry(playerId, 'was sent to Jail!');
  },

  releaseFromJail: (playerId) => {
    set((state) => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        inJail: false,
        jailTurns: 0,
      };

      return { players: updatedPlayers };
    });

    get().addLogEntry(playerId, 'was released from Jail');
  },

  payJailFine: (playerId) => {
    const player = get().players.find(p => p.id === playerId);
    if (!player || player.money < 50) return false;

    get().payMoney(playerId, 50);
    get().releaseFromJail(playerId);
    get().addLogEntry(playerId, 'paid $50 to get out of Jail');
    return true;
  },

  useGetOutOfJailCard: (playerId) => {
    const player = get().players.find(p => p.id === playerId);
    if (!player || player.getOutOfJailCards === 0) return false;

    set((state) => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        getOutOfJailCards: player.getOutOfJailCards - 1,
      };
      return { players: updatedPlayers };
    });

    get().releaseFromJail(playerId);
    get().addLogEntry(playerId, 'used Get Out of Jail Free card');
    return true;
  },

  drawChanceCard: () => {
    const state = get();
    const card = state.chanceCards[state.currentChanceIndex];
    set({ currentChanceIndex: (state.currentChanceIndex + 1) % state.chanceCards.length });
    return card;
  },

  drawCommunityChestCard: () => {
    const state = get();
    const card = state.communityChestCards[state.currentCommunityChestIndex];
    set({ currentCommunityChestIndex: (state.currentCommunityChestIndex + 1) % state.communityChestCards.length });
    return card;
  },

  executeCardAction: (playerId, card) => {
    const player = get().players.find(p => p.id === playerId);
    if (!player) return;

    get().addLogEntry(playerId, `drew: "${card.text}"`);

    switch (card.action) {
      case 'moveTo':
        if (card.destination !== undefined && card.destination >= 0) {
          get().movePlayerToPosition(playerId, card.destination, true);
        } else if (card.destination === -1) {
          const railroads = [5, 15, 25, 35];
          const nearestRailroad = railroads.find(r => r > player.position) || railroads[0];
          get().movePlayerToPosition(playerId, nearestRailroad, true);
        } else if (card.destination === -2) {
          const utilities = [12, 28];
          const nearestUtility = utilities.find(u => u > player.position) || utilities[0];
          get().movePlayerToPosition(playerId, nearestUtility, true);
        }
        break;
      case 'moveSpaces':
        if (card.value) {
          get().movePlayer(playerId, card.value, card.value > 0);
        }
        break;
      case 'payMoney':
        if (card.value) {
          get().payMoney(playerId, card.value);
          set((state) => ({ freeParking: state.freeParking + card.value! }));
        }
        break;
      case 'collectMoney':
        if (card.value) {
          get().collectMoney(playerId, card.value);
        }
        break;
      case 'payEach':
        if (card.value) {
          const activePlayers = get().getActivePlayers().filter(p => p.id !== playerId);
          for (const otherPlayer of activePlayers) {
            get().transferMoney(playerId, otherPlayer.id, card.value);
          }
        }
        break;
      case 'collectEach':
        if (card.value) {
          const activePlayers = get().getActivePlayers().filter(p => p.id !== playerId);
          for (const otherPlayer of activePlayers) {
            get().transferMoney(otherPlayer.id, playerId, card.value);
          }
        }
        break;
      case 'goToJail':
        get().sendToJail(playerId);
        break;
      case 'getOutOfJail':
        set((state) => {
          const playerIndex = state.players.findIndex(p => p.id === playerId);
          const updatedPlayers = [...state.players];
          updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            getOutOfJailCards: updatedPlayers[playerIndex].getOutOfJailCards + 1,
          };
          return { players: updatedPlayers };
        });
        break;
      case 'repairs':
        const playerProperties = get().getPlayerProperties(playerId);
        let totalCost = 0;
        for (const prop of playerProperties) {
          if (prop.hasHotel) {
            totalCost += (card.value === 25 ? 100 : 115);
          } else {
            totalCost += prop.houses * (card.value || 25);
          }
        }
        if (totalCost > 0) {
          get().payMoney(playerId, totalCost);
        }
        break;
    }
  },

  payTax: (playerId, amount) => {
    const result = get().payMoney(playerId, amount);
    if (result) {
      set((state) => ({ freeParking: state.freeParking + amount }));
      get().addLogEntry(playerId, `paid $${amount} in taxes`);
    }
    return result;
  },

  collectMoney: (playerId, amount) => {
    set((state) => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        money: updatedPlayers[playerIndex].money + amount,
      };

      return { players: updatedPlayers };
    });
  },

  payMoney: (playerId, amount) => {
    const player = get().players.find(p => p.id === playerId);
    if (!player) return false;

    if (player.money >= amount) {
      set((state) => {
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          money: updatedPlayers[playerIndex].money - amount,
        };
        return { players: updatedPlayers };
      });
      return true;
    }
    return false;
  },

  transferMoney: (fromId, toId, amount) => {
    const fromPlayer = get().players.find(p => p.id === fromId);
    const toPlayer = get().players.find(p => p.id === toId);

    if (!fromPlayer || !toPlayer) return false;

    if (fromPlayer.money >= amount) {
      set((state) => {
        const fromIndex = state.players.findIndex(p => p.id === fromId);
        const toIndex = state.players.findIndex(p => p.id === toId);
        const updatedPlayers = [...state.players];

        updatedPlayers[fromIndex] = {
          ...updatedPlayers[fromIndex],
          money: updatedPlayers[fromIndex].money - amount,
        };
        updatedPlayers[toIndex] = {
          ...updatedPlayers[toIndex],
          money: updatedPlayers[toIndex].money + amount,
        };

        return { players: updatedPlayers };
      });
      return true;
    }
    return false;
  },

  declareBankruptcy: (playerId, creditorId) => {
    set((state) => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        isBankrupt: true,
        money: 0,
        properties: [],
      };

      let updatedProperties = [...state.properties];
      if (creditorId) {
        const creditorIndex = state.players.findIndex(p => p.id === creditorId);
        const bankruptPlayer = state.players[playerIndex];
        
        updatedProperties = updatedProperties.map(p => {
          if (p.owner === playerId) {
            return { ...p, owner: creditorId };
          }
          return p;
        });

        if (creditorIndex !== -1) {
          updatedPlayers[creditorIndex] = {
            ...updatedPlayers[creditorIndex],
            money: updatedPlayers[creditorIndex].money + bankruptPlayer.money,
            properties: [
              ...updatedPlayers[creditorIndex].properties,
              ...bankruptPlayer.properties,
            ],
          };
        }
      } else {
        updatedProperties = updatedProperties.map(p => {
          if (p.owner === playerId) {
            return { ...p, owner: null, houses: 0, hasHotel: false, isMortgaged: false };
          }
          return p;
        });
      }

      return { players: updatedPlayers, properties: updatedProperties };
    });

    get().addLogEntry(playerId, 'declared bankruptcy!');
    get().checkWinner();
  },

  nextTurn: () => {
    const state = get();
    const activePlayers = state.getActivePlayers();
    
    if (activePlayers.length <= 1) {
      get().checkWinner();
      return;
    }

    let nextIndex = state.currentPlayerIndex;
    do {
      nextIndex = (nextIndex + 1) % state.players.length;
    } while (state.players[nextIndex].isBankrupt);

    set((state) => ({
      currentPlayerIndex: nextIndex,
      doublesCount: 0,
      pendingAction: 'none',
      turnNumber: state.turnNumber + 1,
    }));
  },

  startAuction: (propertyPosition) => {
    const activePlayers = get().getActivePlayers();
    set({
      auctionState: {
        propertyIndex: propertyPosition,
        currentBid: 0,
        highestBidder: null,
        participants: activePlayers.map(p => p.id),
        currentBidderIndex: 0,
      },
      pendingAction: 'auction',
    });

    const property = get().properties.find(p => p.position === propertyPosition);
    get().addLogEntry('system', `Auction started for ${property?.name}`);
  },

  placeBid: (playerId, amount) => {
    const state = get();
    if (!state.auctionState) return;

    const player = state.players.find(p => p.id === playerId);
    if (!player || player.money < amount || amount <= state.auctionState.currentBid) return;

    set((state) => ({
      auctionState: state.auctionState ? {
        ...state.auctionState,
        currentBid: amount,
        highestBidder: playerId,
        currentBidderIndex: (state.auctionState.currentBidderIndex + 1) % state.auctionState.participants.length,
      } : null,
    }));

    get().addLogEntry(playerId, `bid $${amount}`);
  },

  passBid: (playerId) => {
    const state = get();
    if (!state.auctionState) return;

    const newParticipants = state.auctionState.participants.filter(id => id !== playerId);
    
    if (newParticipants.length <= 1 && state.auctionState.highestBidder) {
      get().endAuction();
      return;
    }

    if (newParticipants.length === 0) {
      set({ auctionState: null, pendingAction: 'none' });
      get().addLogEntry('system', 'Auction ended with no bids');
      return;
    }

    set((state) => ({
      auctionState: state.auctionState ? {
        ...state.auctionState,
        participants: newParticipants,
        currentBidderIndex: state.auctionState.currentBidderIndex % newParticipants.length,
      } : null,
    }));

    get().addLogEntry(playerId, 'passed on auction');
  },

  endAuction: () => {
    const state = get();
    if (!state.auctionState || !state.auctionState.highestBidder) {
      set({ auctionState: null, pendingAction: 'none' });
      return;
    }

    const { propertyIndex: propertyPosition, currentBid, highestBidder } = state.auctionState;
    const property = state.properties.find(p => p.position === propertyPosition);

    if (property && highestBidder) {
      set((state) => {
        const propIndex = state.properties.findIndex(p => p.position === propertyPosition);
        const playerIndex = state.players.findIndex(p => p.id === highestBidder);

        const updatedProperties = [...state.properties];
        updatedProperties[propIndex] = { ...property, owner: highestBidder };

        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          money: updatedPlayers[playerIndex].money - currentBid,
          properties: [...updatedPlayers[playerIndex].properties, propertyPosition],
        };

        return {
          properties: updatedProperties,
          players: updatedPlayers,
          auctionState: null,
          pendingAction: 'none',
        };
      });

      get().addLogEntry(highestBidder, `won auction for ${property.name} with $${currentBid}`);
    }
  },

  addLogEntry: (playerId, message) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    const displayName = playerId === 'system' ? '🎲 System' : `${player?.emoji} ${player?.name}`;
    
    const entry: GameLogEntry = {
      turn: state.turnNumber,
      playerId,
      message: `${displayName}: ${message}`,
      timestamp: Date.now(),
    };

    set((state) => ({
      gameLog: [...state.gameLog.slice(-99), entry],
    }));
  },

  getCurrentPlayer: () => {
    const state = get();
    return state.players[state.currentPlayerIndex] || null;
  },

  getPropertyByPosition: (position) => {
    return get().properties.find(p => p.position === position);
  },

  getPlayerProperties: (playerId) => {
    return get().properties.filter(p => p.owner === playerId);
  },

  canBuildHouse: (playerId, propertyPosition) => {
    const state = get();
    const property = state.properties.find(p => p.position === propertyPosition);
    const player = state.players.find(p => p.id === playerId);

    if (!property || !player) return false;
    if (property.owner !== playerId) return false;
    if (property.type !== 'property') return false;
    if (property.houses >= 4 || property.hasHotel) return false;
    if (player.money < property.houseCost) return false;
    if (!get().checkMonopoly(playerId, property.color)) return false;

    return true;
  },

  calculateRent: (property, diceRoll) => {
    if (!property.owner || property.isMortgaged) return 0;

    const state = get();
    
    if (property.type === 'railroad') {
      const ownedRailroads = state.properties.filter(
        p => p.type === 'railroad' && p.owner === property.owner
      ).length;
      return property.rent[ownedRailroads - 1] || 25;
    }

    if (property.type === 'utility') {
      const ownedUtilities = state.properties.filter(
        p => p.type === 'utility' && p.owner === property.owner
      ).length;
      const multiplier = ownedUtilities === 2 ? 10 : 4;
      return (diceRoll || 7) * multiplier;
    }

    if (property.hasHotel) {
      return property.rent[5] || property.rent[property.rent.length - 1];
    }

    if (property.houses > 0) {
      return property.rent[property.houses];
    }

    const hasMonopoly = get().checkMonopoly(property.owner, property.color);
    return hasMonopoly ? property.rent[0] * 2 : property.rent[0];
  },

  checkMonopoly: (playerId, color) => {
    if (color === 'railroad' || color === 'utility' || color === 'none') return false;
    
    const colorProperties = COLOR_GROUP_PROPERTIES[color] || [];
    const ownedInColor = get().properties.filter(
      p => colorProperties.includes(p.position) && p.owner === playerId
    );
    
    return ownedInColor.length === colorProperties.length;
  },

  getActivePlayers: () => {
    return get().players.filter(p => !p.isBankrupt);
  },

  checkWinner: () => {
    const activePlayers = get().getActivePlayers();
    if (activePlayers.length === 1) {
      set({
        gamePhase: 'ended',
        winner: activePlayers[0].id,
      });
      get().addLogEntry(activePlayers[0].id, 'WON THE GAME! 🏆');
    }
  },

  setPendingAction: (action) => {
    set({ pendingAction: action });
  },
}));