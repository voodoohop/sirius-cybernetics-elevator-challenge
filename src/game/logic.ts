import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GameState, 
  Message, 
  GameAction, 
  Persona, 
  GAME_CONFIG,
  PollingsMessage,
  UiState,
} from '@/types';
import { fetchFromPollinations } from '@/utils/api';
import { getPersonaPrompt } from '@/prompts';

export const messagesToGameState = (messages: Message[]): GameState => {
  const state: GameState = {
    currentFloor: GAME_CONFIG.INITIAL_FLOOR,
    movesLeft: GAME_CONFIG.TOTAL_MOVES - messages.filter(m => m.persona === 'user').length,
    currentPersona: 'elevator',
    // currentPersona: 'marvin',
    firstStageComplete: false,
    // firstStageComplete: true,
    hasWon: false,
    messages,
    conversationMode: 'user-interactive',
    // conversationMode: 'autonomous',
    lastSpeaker: null
  };

  messages.forEach(msg => {
    if (msg.persona === 'guide' && msg.message === 'Switching to Marvin mode...') {
      state.currentPersona = 'marvin';
    }

    switch (msg.action) {
      case 'join':
        state.conversationMode = 'autonomous';
        state.lastSpeaker = 'marvin';
        break;
      case 'up':
        state.currentFloor = Math.min(GAME_CONFIG.FLOORS, state.currentFloor + 1);
        break;
      case 'down':
        state.currentFloor = Math.max(1, state.currentFloor - 1);
        if (state.currentFloor === 1) state.firstStageComplete = true;
        break;
    }
  });

  return state;
};

const safeJsonParse = (data: string): any => {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('JSON parse error:', error);
    return data;
  }
};

const fetchPersonaMessage = async (
  persona: Persona, 
  floor: number,
  existingMessages: Message[] = [],
): Promise<Message> => {
  try {
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
    
    return { persona, message: response.message || response, action: response.action || 'none' };
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
        setMessages(prev => [...prev, action.message]);
        break;
      case 'SWITCH_PERSONA':
        setMessages(prev => [
          ...prev,
          { persona: 'guide', message: 'Switching to Marvin mode...', action: 'none' }
        ]);
        break;
      case 'START_AUTONOMOUS':
        // This will trigger the autonomous conversation
        setMessages(prev => [
          ...prev,
          { 
            persona: 'guide', 
            message: 'Marvin has joined the elevator. Let\'s see how this goes...', 
            action: 'none' 
          }
        ]);
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
      mounted.current = true; // Ensure this only runs once
    }
  }, [gameState.currentPersona]);
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

      // Calculate delay based on the number of messages
      const baseDelay = 2000; // Start with a 2-second delay
      const delayIncrement = 500; // Increase delay by 1 second for each message
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
  }, [gameState.messages, gameState.conversationMode]);
};
