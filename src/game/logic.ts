import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  GameState, 
  Message, 
  Persona, 
  GAME_CONFIG,
  PollingsMessage,
  Action,
} from '@/types';
import { fetchFromPollinations } from '@/utils/api';
import { getPersonaPrompt } from '@/prompts';
import { getFloorMessage } from '@/prompts';

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
    marvinJoined: false,
    showInstruction: true,
    isLoading: messages.length === 0 || messages[messages.length - 1]?.persona === 'user'
  };

  return messages.reduce<GameState>((state, msg) => {
    const nextState = { ...state };

    nextState.showInstruction = msg.action === 'show_instructions';




    nextState.isLoading = msg.persona === 'user';

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
        role: msg.persona === 'user' ? 'user' as const : 'assistant' as const,
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
        addMessage({
            persona: 'guide',
            message: getFloorMessage(gameState),
            action: 'show_instructions'
        });
    }, [gameState.currentFloor, addMessage]);
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

// Helper function to gradually remove messages
const rewindMessages = (
  messages: Message[], 
  targetIndex: number,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  let currentIndex = messages.length;
  
  const removeMessage = () => {
    if (currentIndex > targetIndex) {
      currentIndex--;
      setMessages(messages.slice(0, currentIndex));
      setTimeout(removeMessage, 300);
    }
  };

  removeMessage();
};

export const useMessageHandlers = (
  gameState: GameState,
  messages: Message[],
  addMessage: (message: Message) => void,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const handleGuideAdvice = useCallback(async () => {
    if (gameState.isLoading) return;
    
    try {
      const response = await fetchPersonaMessage('guide', gameState, messages);
      addMessage(response);
    } catch (error) {
      console.error('Error fetching guide advice:', error);
    }
  }, [gameState, messages, addMessage]);

  const handlePersonaSwitch = useCallback(() => {
    if (gameState.conversationMode === 'autonomous') {
      // Rewind functionality with animation
      const rewindIndex = findMarvinJoinStartIndex(messages);
      if (rewindIndex !== -1) {
        rewindMessages(messages, rewindIndex, setMessages);
      }
    } else {
      // Original transition to Marvin functionality
      addMessage({
        persona: 'guide',
        message: GAME_CONFIG.MARVIN_TRANSITION_MSG,
        action: 'none'
      });
    }
  }, [messages, gameState.conversationMode, setMessages, addMessage]);

  return {
    handleGuideAdvice,
    handlePersonaSwitch
  };
};
