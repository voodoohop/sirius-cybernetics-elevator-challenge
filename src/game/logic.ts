import { useState, useRef, useEffect } from 'react';
import { 
  GameState, 
  Message, 
  GameAction, 
  Persona, 
  GAME_CONFIG,
  LMMessage,
  SetState,
  UiState
} from '@/types';
import { fetchFromPollinations } from '@/utils/api';
import { getPersonaPrompt, getGuideMessages } from '@/prompts';

export const messagesToGameState = (messages: Message[]): GameState => {
  const state = {
    currentFloor: GAME_CONFIG.INITIAL_FLOOR,
    movesLeft: GAME_CONFIG.TOTAL_MOVES - messages.filter(m => m.persona === 'user').length,
    currentPersona: 'elevator' as Persona,
    firstStageComplete: false,
    hasWon: false,
    messages,
  };

  messages.forEach(msg => {
    if (msg.persona === 'guide' && msg.message === 'Switching to Marvin mode...') {
      state.currentPersona = 'marvin';
    }

    switch (msg.action) {
      case 'join':
        state.hasWon = true;
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

export const useGameState = (): [GameState, React.Dispatch<GameAction>] => {
  const [messages, setMessages] = useState<Message[]>([]);

  const baseDispatch = (action: GameAction) => {
    switch (action.type) {
      case 'ADD_MESSAGE':
        setMessages(prev => [...prev, action.message]);
        break;
      case 'SWITCH_PERSONA':
        setMessages(prev => [
          ...prev, 
          {
            persona: 'guide',
            message: 'Switching to Marvin mode...',
            action: 'none'
          }
        ]);
        break;
      case 'CHEAT_CODE':
        break;
    }
  };
  
  const dispatchWithLogging = createLoggingDispatch(baseDispatch);
  return [messagesToGameState(messages), dispatchWithLogging];
};

export const useMessageHandlers = (
  gameState: GameState, 
  dispatch: React.Dispatch<GameAction>,
  uiState: UiState,
  setUiState: SetState<UiState>
) => {
  const handleMessage = async (message: string) => {
    if (!message.trim() || gameState.movesLeft <= 0) return;
    
    if (message === GAME_CONFIG.CHEAT_CODE) {
      dispatch({ type: 'CHEAT_CODE' });
      updateState(setUiState, { input: '' });
      return;
    }

    updateState(setUiState, { 
      isLoading: true, 
      showInstruction: false,
      input: '' 
    });

    try {
      const { response } = await processUserMessage(message, gameState, dispatch);
      if (response) {
        dispatch({ type: 'ROBOT_RESPONSE', response });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      updateState(setUiState, { isLoading: false });
    }
  };

  const handleGuideAdvice = async () => {
    updateState(setUiState, { isLoading: true });
    try {
      const advice = await fetchGuideMessage(gameState.messages);
      dispatch({ type: 'ADD_MESSAGE', message: advice });
    } finally {
      updateState(setUiState, { isLoading: false });
    }
  };

  const handlePersonaSwitch = async () => {
    try {
      dispatch({ type: 'SWITCH_PERSONA', persona: 'marvin' });    
      const initialMessage = await fetchInitialMessage('marvin', 1);
      dispatch({ type: 'ADD_MESSAGE', message: initialMessage });
      updateState(setUiState, { showInstruction: true });
    } catch (error) {
      console.error('Failed to switch to Marvin:', error);
    }
  };

  return {
    handleMessage,
    handleGuideAdvice,
    handlePersonaSwitch
  };
};

export const useInitialMessage = (
  gameState: GameState, 
  dispatch: React.Dispatch<GameAction>
) => {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current && gameState.currentPersona === 'elevator') { 
      const initialMessage = async () => {
        const message = await fetchInitialMessage(gameState.currentPersona, gameState.currentFloor);
        dispatch({ type: 'ADD_MESSAGE', message });
      };
      initialMessage();
    } else {
      mounted.current = true;
    }
  }, [gameState.currentPersona]);
};

export const useMessageScroll = (messages: Message[]) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return messagesEndRef;
};

export const useInput = (isLoading: boolean) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return { inputRef };
};

export const useUiState = (initialState: UiState): [UiState, SetState<UiState>] => {
  const [uiState, setUiState] = useState<UiState>(initialState);
  return [uiState, setUiState];
};

// Helper functions
const createLoggingDispatch = (dispatch: React.Dispatch<GameAction>) => {
  return (action: GameAction) => {
    console.log('Dispatching action:', action);
    dispatch(action);
  };
};

export const updateState = <T extends object>(
  setState: SetState<T>, 
  newState: Partial<T>
) => {
  setState(prevState => ({
    ...prevState,
    ...newState
  }));
};

const transformMessagesForLM = (messages: Message[]): LMMessage[] => {
  return messages.map(msg => {
    if (msg.persona === 'user') {
      return {
        role: 'user',
        content: JSON.stringify({
          message: msg.message,
          action: msg.action
        })
      };
    }

    return {
      role: 'assistant',
      content: JSON.stringify({
        message: msg.message,
        action: msg.action
      }),
      name: msg.persona
    };
  });
};

const processUserMessage = async (
  message: string,
  gameState: GameState,
  dispatch: React.Dispatch<GameAction>
): Promise<{ response: any | null }> => {
  const userMessage: Message = { 
    persona: 'user',
    message,
    action: 'none'
  };

  dispatch({ type: 'ADD_MESSAGE', message: userMessage });

  try {
    const messages = [
      {
        role: 'system',
        content: getPersonaPrompt(gameState.currentPersona, gameState.currentFloor),
        name: gameState.currentPersona
      },
      ...transformMessagesForLM([...gameState.messages, userMessage])
    ];

    const data = await fetchFromPollinations(messages);
    const response = JSON.parse(data.choices[0].message.content);
    
    dispatch({ 
      type: 'ADD_MESSAGE', 
      message: {
        persona: gameState.currentPersona,
        message: response.message,
        action: response.action || 'none'
      }
    });

    return { response };
  } catch (error) {
    console.error('Error processing message:', error);
    return { response: null };
  }
};

const fetchInitialMessage = async (persona: Persona, floor: number): Promise<Message> => {
  try {
    const data = await fetchFromPollinations([
      { role: 'system', content: getPersonaPrompt(persona, floor) }
    ]);

    const response = JSON.parse(data.choices[0].message.content);
    return { 
      persona: persona,
      message: response.message,
      action: response.action || 'none'
    };
  } catch (error) {
    console.error('Error:', error);
    return { 
      persona: persona,
      message: "Apologies, I'm experiencing some difficulties.",
      action: 'none'
    };
  }
};

const fetchGuideMessage = async (messages: Message[]): Promise<Message> => {
  try {
    const data = await fetchFromPollinations([
      {
        role: 'system',
        content: getGuideMessages(),
        name: 'guide'
      },
      ...transformMessagesForLM(messages)
    ], false);

    const advice = data.choices[0].message.content;
    return { 
      persona: 'guide', 
      message: "The Guide says: " + advice,
      action: 'none' 
    };
  } catch (error) {
    console.error('Error:', error);
    return { 
      persona: 'guide', 
      message: "The Guide says: Have you tried turning it off and on again?",
      action: 'none' 
    };
  }
};
