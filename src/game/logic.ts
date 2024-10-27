import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GameState, 
  Message, 
  GameAction, 
  Persona, 
  GAME_CONFIG,
  PollingsMessage,
  UiState,
  Action,  // Add this import
} from '@/types';
import { fetchFromPollinations } from '@/utils/api';
import { getPersonaPrompt } from '@/prompts';

export const messagesToGameState = (messages: Message[]): GameState => {
  const state: GameState = {
    currentFloor: GAME_CONFIG.INITIAL_FLOOR,
    movesLeft: GAME_CONFIG.TOTAL_MOVES - messages.filter(m => m.persona === 'user').length,
    currentPersona: 'elevator',
    firstStageComplete: false,
    hasWon: false,
    messages,
    conversationMode: 'user-interactive',
    lastSpeaker: null,
    marvinJoined: false
  };

  messages.forEach(msg => {
    if (msg.persona === 'guide' && msg.message === GAME_CONFIG.MARVIN_TRANSITION_MSG) {
      state.currentPersona = 'marvin';
    }

    switch (msg.action) {
      case 'join':
        state.conversationMode = 'autonomous';
        state.lastSpeaker = 'marvin';
        state.marvinJoined = true;
        break;
      case 'up':
        state.currentFloor = Math.min(GAME_CONFIG.FLOORS, state.currentFloor + 1);
        if (state.marvinJoined && state.currentFloor === GAME_CONFIG.FLOORS) {
          state.hasWon = true;
        }
        break;
      case 'down':
        state.currentFloor = Math.max(1, state.currentFloor - 1);
        if (state.currentFloor === 1) {
          state.firstStageComplete = true;
        }
        break;
    }
  });

  return state;
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

const fetchPersonaMessage = async (
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
        role: (msg.persona === 'user' ? 'user' : 'assistant') as ('user' | 'system' | 'assistant'),
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

export const useGameState = (): [GameState, React.Dispatch<GameAction>] => {
  const [messages, setMessages] = useState<Message[]>([]);
  // Ensure no duplicate initial messages
  // ...
  
  const dispatch = useCallback((action: GameAction) => {
    console.log('Dispatching action:', action);
    switch (action.type) {
      case 'ADD_MESSAGE':
        setMessages(prev => {
          const newMessages = [...prev, action.message];
          const lastMessage = action.message;
          
          // Only add guide messages if they haven't been added before
          if (lastMessage.action === 'join' && !prev.some(m => m.message.includes('Marvin has joined the elevator'))) {
            return [
              ...newMessages,
              {
                persona: 'guide',
                message: 'Marvin has joined the elevator. Now sit back and watch the fascinating interaction between these two Genuine People Personalities™...',
                action: 'none'
              },
              {
                persona: 'guide',
                message: 'Note: The conversation is now autonomous. Don\'t panic! This is perfectly normal behavior for Sirius Cybernetics products.',
                action: 'none'
              }
            ];
          }

          if (lastMessage.action === 'down') {
            const currentFloor = newMessages.reduce((floor, msg) => 
              msg.action === 'up' ? Math.min(5, floor + 1) : 
              msg.action === 'down' ? Math.max(1, floor - 1) : 
              floor, 3);
            
            if (currentFloor === 1 && !prev.some(m => m.message.includes('successfully convinced the elevator'))) {
              return [
                ...newMessages,
                {
                  persona: 'guide',
                  message: 'You\'ve successfully convinced the elevator to reach the ground floor! But your journey isn\'t over yet...',
                  action: 'none'
                }
              ];
            }
          }
          return newMessages;
        });
        break;
      case 'SWITCH_PERSONA':
        setMessages(prev => [
          ...prev,
          { 
            persona: 'guide', 
            message: GAME_CONFIG.MARVIN_TRANSITION_MSG, 
            action: 'none' 
          }
        ]);
        break;
      case 'REWIND_TO_PRE_MARVIN':
        setMessages(prev => {
          const rewindPoint = prev.findIndex(msg => msg.action === 'join');
          if (rewindPoint === -1) return prev;
          const rewoundMessages = prev.slice(0, rewindPoint);
          return [
            ...rewoundMessages,
            {
              persona: 'guide',
              message: 'Time circuits activated! We\'ve rewound to just before Marvin joined the elevator. Perhaps things will go differently this time...',
              action: 'none'
            }
          ];
        });
        break;
    }
  }, []);

  return [messagesToGameState(messages), dispatch];
};

export const useMessageHandlers = (
  gameState: GameState, 
  dispatch: React.Dispatch<GameAction>,
  uiState: UiState,
  setUiState: React.Dispatch<React.SetStateAction<UiState>>
) => ({
  handleMessage: async (message: string) => {
    if (!message.trim() || gameState.movesLeft <= 0) return;
    
    if (message === GAME_CONFIG.CHEAT_CODE) {
      dispatch({ type: 'CHEAT_CODE' });
      setUiState(prev => ({ ...prev, input: '' }));
      return;
    }

    setUiState(prev => ({ ...prev, isLoading: true, showInstruction: false, input: '' }));

    try {
      const userMessage: Message = { persona: 'user', message, action: 'none' };
      dispatch({ type: 'ADD_MESSAGE', message: userMessage });

      const response = await fetchPersonaMessage(
        gameState.currentPersona, 
        gameState.currentFloor,
        [...gameState.messages, userMessage]
      );
      
      dispatch({ type: 'ADD_MESSAGE', message: response });
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  },

  handleGuideAdvice: async () => {
    setUiState(prev => ({ ...prev, isLoading: true }));
    try {
      const advice = await fetchPersonaMessage('guide', 1, gameState.messages);
      dispatch({ type: 'ADD_MESSAGE', message: advice });
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  },

  handlePersonaSwitch: async () => {
    dispatch({ type: 'SWITCH_PERSONA', persona: 'marvin' });    
    const message = await fetchPersonaMessage('marvin', 1);
    dispatch({ type: 'ADD_MESSAGE', message });
    setUiState(prev => ({ ...prev, showInstruction: true }));
  }
});

export const useInitialMessage = (gameState: GameState, dispatch: React.Dispatch<GameAction>) => {
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current && gameState.currentPersona === 'elevator') { 
      fetchPersonaMessage(gameState.currentPersona, gameState.currentFloor)
        .then(message => dispatch({ type: 'ADD_MESSAGE', message }));
      mounted.current = true;
    }
  }, [gameState.currentPersona, gameState.currentFloor, dispatch]);
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

export const useAutonomousConversation = (
  gameState: GameState,
  dispatch: React.Dispatch<GameAction>
) => {
  useEffect(() => {
    if (gameState.conversationMode === 'autonomous' && gameState.messages.length > 0) {
      const lastMessage = gameState.messages[gameState.messages.length - 1];
      const nextSpeaker = lastMessage.persona === 'marvin' ? 'elevator' : 'marvin';

      // Keep base delay the same but increase increment
      const baseDelay = 1000;
      const delayIncrement = 500;  // Changed from 100 to 500
      const delay = baseDelay + (gameState.messages.length * delayIncrement);

      const timer = setTimeout(async () => {
        const response = await fetchPersonaMessage(
          nextSpeaker,
          gameState.currentFloor,
          gameState.messages
        );
        dispatch({ type: 'ADD_MESSAGE', message: response });
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [gameState.messages, gameState.conversationMode, gameState.currentFloor, dispatch]);
};
