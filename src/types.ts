import React from 'react';

// Game Configuration
export const GAME_CONFIG = {
  FLOORS: 5,
  INITIAL_FLOOR: 3,
  TOTAL_MOVES: 15,
  CHEAT_CODE: "42"
} as const;

// API Configuration
export const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  ENDPOINT: 'https://text.pollinations.ai/openai'
} as const;

// Message Display Configuration
export const MESSAGE_STYLES = {
  user: 'text-yellow-400',
  guide: 'text-blue-400',
  elevator: 'text-green-400',
  marvin: 'text-green-400'
} as const;

export const MESSAGE_PREFIXES = {
  user: '> ',
  guide: '',
  elevator: 'Elevator: ',
  marvin: 'Marvin: '
} as const;

export const ACTION_INDICATORS = {
  up: {
    symbol: '↑',
    className: 'text-blue-400'
  },
  down: {
    symbol: '↓',
    className: 'text-red-400'
  }
} as const;

// Game Types
export type Persona = 'elevator' | 'marvin' | 'guide';
export type Action = 'none' | 'join' | 'up' | 'down';

export type Message = {
  persona: 'user' | 'marvin' | 'elevator' | 'guide';
  message: string;
  action: Action;
}

export type GameState = {
  currentFloor: number;
  movesLeft: number;
  currentPersona: Persona;
  firstStageComplete: boolean;
  hasWon: boolean;
  messages: Message[];
}

export type UiState = {
  input: string;
  isLoading: boolean;
  showInstruction: boolean;
}

export type GameAction =
  | { type: 'CHEAT_CODE' }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SWITCH_PERSONA'; persona: Persona }
  | { type: 'ROBOT_RESPONSE'; response: any };

// API Types
export type PollingsMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type PollingsResponse = {
  choices: Array<{
    message: {
      content: string;
    }
  }>;
}

// Component Props Types
export type MessageDisplayProps = {
  msg: Message;
  gameState: GameState;
}

export type ElevatorAsciiProps = {
  floor: number;
  showLegend?: boolean;
  isMarvinMode?: boolean;
  hasMarvinJoined?: boolean;
}

// Utility Types
export type LMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: 'elevator' | 'marvin' | 'guide'; // Optional name property for assistant messages
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
