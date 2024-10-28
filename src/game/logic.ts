import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  GameState, 
  Message, 
  GameAction, 
  Persona, 
  GAME_CONFIG,
  PollingsMessage,
  UiState,
  Action,
} from '@/types';
import { fetchFromPollinations } from '@/utils/api';
import { getPersonaPrompt } from '@/prompts';

// Core message management hook
export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  return { messages, addMessage };
};

// Pure function to compute game state from messages
export const computeGameState = (messages: Message[]): GameState => {
  return messages.reduce((state, msg) => {
    const nextState = { ...state };

    if (msg.persona === 'guide' && msg.message === GAME_CONFIG.MARVIN_TRANSITION_MSG) {
      nextState.currentPersona = 'marvin';
    }

    switch (msg.action) {
      case 'join':
        return {
          ...nextState,
          conversationMode: 'autonomous',
          lastSpeaker: 'marvin',
          marvinJoined: true
        };
      case 'up': {
        const newFloor = Math.min(GAME_CONFIG.FLOORS, state.currentFloor + 1);
        return {
          ...nextState,
          currentFloor: newFloor,
          hasWon: state.marvinJoined && newFloor === GAME_CONFIG.FLOORS
        };
      }
      case 'down': {
        const newFloor = Math.max(1, state.currentFloor - 1);
        return {
          ...nextState,
          currentFloor: newFloor,
          firstStageComplete: newFloor === 1
        };
      }
      default:
        return nextState;
    }
  }, {
    currentFloor: GAME_CONFIG.INITIAL_FLOOR,
    movesLeft: GAME_CONFIG.TOTAL_MOVES - messages.filter(m => m.persona === 'user').length,
    currentPersona: 'elevator',
    firstStageComplete: false,
    hasWon: false,
    conversationMode: 'user-interactive',
    lastSpeaker: null,
    marvinJoined: false
  });
};

const safeJsonParse = (data: string): { message: string; action?: Action } => {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('JSON parse error:', error);
    return { message: data };
  }
};

const isValidFloor = (floor: number): floor is 1 | 2 | 3 | 4 | 5 => {
  return floor >= 1 && floor <= 5;
};

export const fetchPersonaMessage = async (
  persona: Persona, 
  floor: number,
  existingMessages: Message[] = [],
): Promise<Message> => {
  try {
    if (!isValidFloor(floor)) {
      throw new Error(`Invalid floor number: ${floor}`);
    }

    const messages: PollingsMessage[] = [
      {
        role: 'system',
        content: getPersonaPrompt(persona, floor)
      },
      ...existingMessages.map(msg => ({
        role: msg.persona === 'user' ? 'user' : 'assistant',
        content: JSON.stringify({ message: msg.message, action: msg.action }),
        ...(msg.persona !== 'user' && { name: msg.persona })
      }))
    ];

    const data = await fetchFromPollinations(messages);
    const response = safeJsonParse(data.choices[0].message.content);
    
    return { 
      persona, 
      message: typeof response === 'string' ? response : response.message,
      action: typeof response === 'string' ? 'none' : (response.action || 'none')
    };
  } catch (error) {
    console.error('Error:', error);
    return { persona, message: "Apologies, I'm experiencing some difficulties.", action: 'none' };
  }
};

// Game state management hook
export const useGameState = (messages: Message[]) => {
  return useMemo(() => computeGameState(messages), [messages]);
};

// Effect hook for guide messages
export const useGuideMessages = (
  gameState: GameState, 
  messages: Message[], 
  addMessage: (message: Message) => void
) => {
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Handle Marvin join message
    if (lastMessage.action === 'join' && 
        !messages.some(m => m.message.includes('Marvin has joined the elevator'))) {
      addMessage({
        persona: 'guide',
        message: 'Marvin has joined the elevator. Now sit back and watch the fascinating interaction between these two Genuine People Personalities™...',
        action: 'none'
      });
      addMessage({
        persona: 'guide',
        message: 'Note: The conversation is now autonomous. Don\'t panic! This is perfectly normal behavior for Sirius Cybernetics products.',
        action: 'none'
      });
    }

    // Handle reaching ground floor message
    if (lastMessage.action === 'down' && 
        gameState.currentFloor === 1 && 
        !messages.some(m => m.message.includes('successfully convinced the elevator'))) {
      addMessage({
        persona: 'guide',
        message: 'You\'ve successfully convinced the elevator to reach the ground floor! But your journey isn\'t over yet...',
        action: 'none'
      });
    }
  }, [messages, gameState.currentFloor, addMessage]);
};

// Autonomous conversation hook
export const useAutonomousConversation = (
  gameState: GameState,
  messages: Message[],
  addMessage: (message: Message) => void
) => {
  useEffect(() => {
    if (gameState.conversationMode !== 'autonomous' || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const nextSpeaker = lastMessage.persona === 'marvin' ? 'elevator' : 'marvin';
    const delay = 1000 + (messages.length * 500);

    const timer = setTimeout(async () => {
      const response = await fetchPersonaMessage(
        nextSpeaker,
        gameState.currentFloor,
        messages
      );
      addMessage(response);
    }, delay);

    return () => clearTimeout(timer);
  }, [messages, gameState.conversationMode, gameState.currentFloor, addMessage]);
};

export const useMessageScroll = (messages: Message[]) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  return ref;
};

export const useInput = (isLoading: boolean) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isLoading && ref.current) {
      ref.current.focus();
    }
  }, [isLoading]);
  return { inputRef: ref };
};

export const useUiState = (initial: UiState) => useState<UiState>(initial);

// Add this new hook
export const useMessageHandlers = (
  gameState: GameState,
  messages: Message[],
  uiState: UiState,
  setUiState: (state: UiState) => void,
  addMessage: (message: Message) => void
) => {
  const handleGuideAdvice = useCallback(async () => {
    if (uiState.isLoading) return;
    
    setUiState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetchPersonaMessage('guide', gameState.currentFloor, messages);
      addMessage(response);
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  }, [gameState.currentFloor, messages, uiState.isLoading, setUiState, addMessage]);

  const handlePersonaSwitch = useCallback(() => {
    addMessage({
      persona: 'guide',
      message: GAME_CONFIG.MARVIN_TRANSITION_MSG,
      action: 'none'
    });
  }, [addMessage]);

  return {
    handleGuideAdvice,
    handlePersonaSwitch
  };
};
