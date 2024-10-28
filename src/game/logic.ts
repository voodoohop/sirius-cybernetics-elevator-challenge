import { useState, useCallback, useMemo, useEffect } from 'react';
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
    setMessages(appendIfNotDuplicate(message));
  }, []);

  return { messages, addMessage, setMessages };
};

// append only if the last message is not the same
const appendIfNotDuplicate = (message: Message) => {
    return (messages: Message[]) => {
        const stringifiedMessage = JSON.stringify(message);
        const lastMessage = JSON.stringify(messages[messages.length - 1]);
        return lastMessage !== stringifiedMessage ? [...messages, message] : messages;
    }
};

// Pure function to compute game state from messages
export const computeGameState = (messages: Message[]): GameState => {
  const initialState: GameState = {
    currentFloor: GAME_CONFIG.INITIAL_FLOOR,
    movesLeft: GAME_CONFIG.TOTAL_MOVES - messages.filter(m => m.persona === 'elevator').length,
    currentPersona: 'elevator',
    firstStageComplete: false,
    hasWon: false,
    conversationMode: 'user-interactive',
    lastSpeaker: null,
    marvinJoined: false
  };

  return messages.reduce<GameState>((state, msg) => {
    const nextState = { ...state };

    if (msg.persona === 'guide' && msg.message === GAME_CONFIG.MARVIN_TRANSITION_MSG) {
      nextState.currentPersona = 'marvin' as const;
    }

    switch (msg.action) {
      case 'join':
        return {
          ...nextState,
          conversationMode: 'autonomous' as const,
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
  }, initialState);
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

// Update the fetchPersonaMessage function
export const fetchPersonaMessage = async (
  persona: Persona, 
  gameState: GameState,
  existingMessages: Message[] = [],
): Promise<Message> => {
  try {
    const messages: PollingsMessage[] = [
      {
        role: 'system' as const,
        content: getPersonaPrompt(persona, gameState)
      },
      ...existingMessages.map(msg => ({
        role: (msg.persona === 'user' ? 'user' : 'assistant') as const,
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
    const lastMessage = messages[messages.length - 1];

    // marvin joined 
    useEffect(() => {
        if (lastMessage?.action === 'join') {
            addMessage({
                persona: 'guide',
                message: 'Marvin has joined the elevator. Now sit back and watch the fascinating interaction between these two Genuine People Personalities™...',
                action: 'none'
            });
        }
    }, [lastMessage, addMessage]);

    // floor changed
    useEffect(() => {
        if (gameState.currentFloor === 5) {
            if (gameState.marvinJoined)
                addMessage({
                    persona: 'guide',
                    message: 'Pan Galactic Gargle Blasters are being prepared for your enjoyment. Even Marvin will enjoy one!',
                    action: 'none'
                });
            else 
            addMessage({
                persona: 'guide',
                message: `Now arriving at floor ${gameState.currentFloor}... The Pan Galactic Gargle Blasters are being prepared, but they're only served to a minimum of two people. Perhaps Marvin would enjoy one? (Though he'd probably just complain about it...)`,
                action: 'none'
            });
        } else {
            addMessage({
                persona: 'guide',
                message: `Now arriving at floor ${gameState.currentFloor}...`,
                action: 'none'
            });
        }
    }, [gameState.currentFloor, gameState.marvinJoined, addMessage]);
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
    const delay = 1000 + (messages.length * 250);

    const timer = setTimeout(async () => {
      const response = await fetchPersonaMessage(
        nextSpeaker,
        gameState,
        messages
      );
      addMessage(response);
    }, delay);

    return () => clearTimeout(timer);
  }, [messages, gameState, addMessage]);
};

// Add this helper function near the top
const findMarvinTransitionIndex = (messages: Message[]): number => {
  return messages.findIndex(msg => 
    msg.persona === 'guide' && 
    msg.message === GAME_CONFIG.MARVIN_TRANSITION_MSG
  );
};

// Update the helper function to find the start of the Marvin join interaction
const findMarvinJoinStartIndex = (messages: Message[]): number => {
  const marvinJoinIndex = messages.findIndex(msg => 
    msg.persona === 'marvin' && msg.action === 'join'
  );
  
  if (marvinJoinIndex === -1) return -1;
  
  // Find the user message that triggered this interaction
  for (let i = marvinJoinIndex - 1; i >= 0; i--) {
    if (messages[i].persona === 'user') {
      return i;
    }
  }
  
  return marvinJoinIndex;
};

export const useMessageHandlers = (
  gameState: GameState,
  messages: Message[],
  uiState: UiState,
  setUiState: React.Dispatch<React.SetStateAction<UiState>>,
  addMessage: (message: Message) => void,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>> // Add this parameter
) => {
  const handleGuideAdvice = useCallback(async () => {
    if (uiState.isLoading) return;
    
    setUiState((prev: UiState) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetchPersonaMessage('guide', gameState, messages);
      addMessage(response);
    } finally {
      setUiState((prev: UiState) => ({ ...prev, isLoading: false }));
    }
  }, [gameState.currentFloor, messages, uiState.isLoading, setUiState, addMessage]);

  const handlePersonaSwitch = useCallback(() => {
    if (gameState.conversationMode === 'autonomous') {
      // Rewind functionality
      const rewindIndex = findMarvinJoinStartIndex(messages);
      if (rewindIndex !== -1) {
        setMessages(messages.slice(0, rewindIndex));
        setUiState(prev => ({ 
          ...prev, 
          showInstruction: true,
          isLoading: false,
          input: ''
        }));
      }
    } else {
      // Original transition to Marvin functionality
      addMessage({
        persona: 'guide',
        message: GAME_CONFIG.MARVIN_TRANSITION_MSG,
        action: 'none'
      });
    }
  }, [messages, gameState.conversationMode, setMessages, setUiState, addMessage]);

  return {
    handleGuideAdvice,
    handlePersonaSwitch
  };
};
