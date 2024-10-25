'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle } from 'lucide-react'
import { getElevatorPrompt, getMarvinPrompt, getGuideMessages } from '../prompts';

const FLOORS = 5
const INITIAL_FLOOR = 3
const TOTAL_MOVES = 15
const CHEAT_CODE = "42"

// Update the Persona type to include 'guide'
type Persona = 'elevator' | 'marvin' | 'guide';

// Add these type definitions at the top of the file, after the imports

type Action = 'none' | 'join' | 'up' | 'down';

type Message = {
  persona: 'user' | 'marvin' | 'elevator' | 'guide';
  message: string;
  action: Action;
}

type GameState = {
  currentFloor: number;
  movesLeft: number;
  currentPersona: Persona;
  firstStageComplete: boolean;
  hasWon: boolean;
  messages: Message[];
}

type UiState = {
  input: string;
  isLoading: boolean;
  showInstruction: boolean;
}

// Define the action types
type GameAction =
  | { type: 'CHEAT_CODE' }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SWITCH_PERSONA'; persona: Persona }
  | { type: 'ROBOT_RESPONSE'; response: any };


// Implement the reducer function
const messagesToGameState = (messages: Message[]): GameState => {
  const state = {
    currentFloor: INITIAL_FLOOR,
    movesLeft: TOTAL_MOVES - messages.filter(m => m.persona === 'user').length,
    currentPersona: 'elevator' as Persona, // Fix the type error by asserting type
    firstStageComplete: false,
    hasWon: false,
    messages,
  };

  // Process actions in sequence
  messages.forEach(msg => {
    // Check for persona switch message
    if (msg.persona === 'guide' && msg.message === 'Switching to Marvin mode...') {
      state.currentPersona = 'marvin';
    }

    switch (msg.action) {
      case 'join':
        state.hasWon = true;
        break;
      case 'up':
        state.currentFloor = Math.min(FLOORS, state.currentFloor + 1);
        break;
      case 'down':
        state.currentFloor = Math.max(1, state.currentFloor - 1);
        if (state.currentFloor === 1) state.firstStageComplete = true;
        break;
    }
  });

  return state;
};


// Separate hook for message initialization
const useInitialMessage = (
  gameState: GameState, 
  dispatch: React.Dispatch<GameAction>
) => {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) { // Skip first render in dev mode
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

// Separate hook for scroll handling
const useMessageScroll = (messages: Message[]) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return messagesEndRef;
};

// Simplified component
export default function HappyElevator() {
  const [gameState, dispatch] = useGameState();

  const [uiState, setUiState] = useUiState({
    input: '',
    isLoading: false,
    showInstruction: true
  });

  useInitialMessage(gameState, dispatch);
  const messagesEndRef = useMessageScroll(gameState.messages);
  const { inputRef } = useInput(uiState.isLoading);
  const { 
    handleSendMessage, 
    handleDontPanic, 
    handleConfirmSwitch 
  } = useMessageHandlers(gameState, dispatch, uiState, setUiState);

  useEffect(() => {
    if (gameState.firstStageComplete && gameState.currentPersona === 'elevator') {
      updateState(setUiState, { showInstruction: true });
    }
  }, [gameState.firstStageComplete, gameState.currentPersona]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-green-400 p-4 font-mono">
      <Card className="w-full max-w-2xl p-6 space-y-6 bg-gray-900 border-green-400 border-2 rounded-none">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-yellow-400 animate-pulse">
            <a href="https://websim.ai/c/FAflFDzXEC1ABzFvz" target="_blank" rel="noopener noreferrer">
              Sirius Cybernetics Corporation
            </a>
          </h1>
          <h2 className="text-xl font-semibold  text-green-400">Happy Vertical People Transporter</h2>
          <Button
            onClick={handleDontPanic}
            disabled={uiState.isLoading}
            className="bg-gray-700 text-green-400 hover:bg-gray-600 text-xs py-1 px-2"
          >
            Don't Panic!
          </Button>
        </div>
        
        {uiState.showInstruction && gameState.currentPersona === 'elevator' && !gameState.firstStageComplete && (
          <div className="bg-blue-900 text-blue-200 p-4 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <p>Psst! Your mission: Convince this neurotic elevator to reach the ground floor. Remember your towel!</p>
          </div>
        )}
        {uiState.showInstruction && gameState.currentPersona === 'elevator' && gameState.firstStageComplete && (
          <div className="bg-green-900 text-green-200 p-4 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <p>
              <strong>Congratulations!</strong> You've successfully navigated the neurotic elevator to the ground floor.
              <br /><br />
              Now, brace yourself for the next challenge: <em>Marvin the Paranoid Android</em> awaits.
              <br /><br />
              Convince Marvin to join your mission. <strong>Are you ready?</strong>
              <br /><br />
            <Button
              onClick={handleConfirmSwitch}
              disabled={uiState.isLoading}
              className="bg-green-400 text-black hover:bg-green-500 text-xs py-1 px-2"
            >
              Confirm
            </Button>
            </p>
          </div>
        )}

        {uiState.showInstruction && gameState.currentPersona === 'marvin' && (
          <div className="bg-purple-900 text-purple-200 p-4 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <p>New challenge: Convince Marvin the Paranoid Android to join you in the elevator!</p>
          </div>
        )}

        {(gameState.currentPersona === 'elevator' || gameState.currentPersona === 'marvin') && (
          <pre className="text-green-400 text-center">
            {ElevatorAscii({
              floor: gameState.currentFloor,
              showLegend: uiState.showInstruction,
              isMarvinMode: gameState.currentPersona === 'marvin',
              hasMarvinJoined: gameState.hasWon
            })}
          </pre>
        )}

        <div className="h-64 overflow-y-auto space-y-2 p-2 bg-gray-800 border border-green-400">
          {gameState.messages.map((msg, index) => (
            <MessageDisplay 
              key={index} 
              msg={msg} 
              gameState={gameState} 
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {gameState.hasWon && (
          <div className="bg-green-900 text-green-200 p-4 rounded-lg text-center animate-bounce">
            <p className="text-xl font-bold">So Long, and Thanks for All the Fish!</p>
            <p>You've successfully convinced Marvin to join you in the elevator. Time for a Pan Galactic Gargle Blaster?</p>
          </div>
        )}

        {!gameState.hasWon && gameState.movesLeft <= 0 && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg text-center animate-bounce">
            <p className="text-xl font-bold">Mostly Harmless</p>
            <p>You've run out of moves. Time to consult your copy of the Hitchhiker's Guide to the Galaxy!</p>
          </div>
        )}

        <div className="flex space-x-2">
          <Input
            type="text"
            value={uiState.input}
            onChange={(e) => updateState(setUiState, { input: e.target.value })}
            placeholder={gameState.currentPersona === 'elevator' ? "Communicate with the elevator..." : "Try to convince Marvin..."}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-grow bg-gray-800 text-green-400 border-green-400 placeholder-green-600"
            disabled={uiState.isLoading || gameState.hasWon}
            ref={inputRef}
          />
          <Button 
            onClick={() => handleSendMessage()} 
            disabled={uiState.isLoading || gameState.hasWon}
            className="bg-green-400 text-black hover:bg-green-500"
          >
            {uiState.isLoading ? 'Processing...' : 'Send'}
          </Button>
        </div>

        <div className="text-center text-green-400 mt-4">
          <p className="text-lg font-semibold">Moves Left: {gameState.movesLeft}</p>
        </div>
      </Card>
      <div className="text-center text-green-400 mt-2 text-xs max-w-xl mx-auto">
        <p>This journey is brought to you by the <a href="https://websim.ai/c/FAflFDzXEC1ABzFvz">Sirius Cybernetics Corporation</a>. For more galactic adventures, visit <a href="https://pollinations.ai" className="text-blue-400 underline">pollinations.ai</a>. Powered by <a href="https://mistral.ai/news/mistral-large-2407/" className="text-blue-400 underline">Mistral Large 2</a>, the Deep Thought of our times.</p>
      </div>
    </div>
  )
}


  const useMessageHandlers = (
    gameState: GameState, 
    dispatch: React.Dispatch<GameAction>,
    uiState: UiState,
    setUiState: React.Dispatch<React.SetStateAction<UiState>>
  ) => {
    const handleSendMessage = async (message: string = uiState.input) => {
      if (message.trim() === '' || gameState.movesLeft <= 0) return;
  
      if (message === CHEAT_CODE) {
        handleCheatCode();
        return;
      }
  
      updateState(setUiState, { isLoading: true, showInstruction: false });
  
      try {
        const { response } = await processUserMessage(message, gameState, dispatch);
        
        if (response) {
          dispatch({ 
            type: 'ROBOT_RESPONSE', 
            response 
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
  
      updateState(setUiState, { isLoading: false, input: '' });
    };
  
    const handleCheatCode = () => {
      dispatch({ type: 'CHEAT_CODE' });
      updateState(setUiState, { input: '' });
    };
  
    const handleDontPanic = async () => {
      updateState(setUiState, { isLoading: true });
      try {
        const advice = await fetchGuideMessage(gameState.messages);
        dispatch({ type: 'ADD_MESSAGE', message: advice });
      } catch (error) {
        console.error('Failed to get advice:', error);
      }
      updateState(setUiState, { isLoading: false });
    };
  
    const handleConfirmSwitch = async () => {
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
      handleSendMessage,
      handleCheatCode,
      handleDontPanic,
      handleConfirmSwitch
    };
  };

  
  const processUserMessage = async (
    message: string,
    gameState: GameState,
    dispatch: React.Dispatch<GameAction>
  ): Promise<{ response: any | null }> => {
    const userMessage: Message = { 
      persona: 'user',
      message,
      action: 'none' as Action // Fix type error by asserting Action type
    };

    dispatch({ type: 'ADD_MESSAGE', message: userMessage });

    try {
      const messages = [
        {
          role: 'system',
          content: getPersonaPrompt(gameState.currentPersona, gameState.currentFloor)
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
  

const createLoggingDispatch = (dispatch: React.Dispatch<GameAction>) => {
  return (action: GameAction) => {
    console.log('Dispatching action:', action);
    dispatch(action);
  };
};

// Update useGameState to wrap the dispatch function
const useGameState = (): [GameState, React.Dispatch<GameAction>] => {
  const [messages, setMessages] = useState<Message[]>([]);

  const baseDispatch = (action: GameAction) => {
    switch (action.type) {
      case 'ADD_MESSAGE':
        setMessages(prev => [...prev, action.message]);
        break;
      case 'SWITCH_PERSONA':
        // Add a transition message instead of clearing
        setMessages(prev => [...prev, {
          persona: 'guide',
          message: 'Switching to Marvin mode...',
          action: 'none'
        }]);
        break;
      case 'CHEAT_CODE':
        // Handle cheat code
        break;
    }
  };
  
  // Wrap the dispatch function with logging
  const dispatchWithLogging = createLoggingDispatch(baseDispatch);
  
  return [messagesToGameState(messages), dispatchWithLogging];
};

// Add these custom hooks before the HappyElevator component

const useInput = (isLoading: boolean) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return { inputRef };
};

const updateFloor = (currentFloor: number, action: string) => {
  if (action === 'up' && currentFloor < FLOORS) {
    return currentFloor + 1;
  } else if (action === 'down' && currentFloor > 1) {
    return currentFloor - 1;
  }
  return currentFloor;
};

const parseMessage = (content: string) => {
  try {
    const parsedMessage = JSON.parse(content);
    return parsedMessage.message;
  } catch (error) {
    return content;
  }
};

const getActionIndicator = (action: Action) => {
  if (action === 'up') {
    return <div className="animate-pulse text-blue-400 text-3xl mt-4">{'↑'.padEnd(16, ' ').repeat(3)}</div>;
  } else if (action === 'down') {
    return <div className="animate-pulse text-red-400 text-3xl mt-4">{'↓'.padEnd(16, ' ').repeat(3)}</div>;
  }
  return null;
};

const getPersonaPrompt = (persona: Persona, floor: number) => {
  if (persona === 'elevator') {
    return getElevatorPrompt(floor);
  } else {
    return getMarvinPrompt();
  }
}

// Add proper type for ElevatorAscii props
type ElevatorAsciiProps = {
  floor: number;
  showLegend?: boolean;
  isMarvinMode?: boolean;
  hasMarvinJoined?: boolean;
}

// Update the ElevatorAscii component with proper typing
const ElevatorAscii = ({ 
  floor, 
  showLegend = false, 
  isMarvinMode = false, 
  hasMarvinJoined = false 
}: ElevatorAsciiProps) => {
  // Now floor number directly corresponds to array index (floor 1 = index 0)
  const elevatorPosition = floor - 1;
  let floors = Array(FLOORS).fill('   |  |   ');
  
  if (isMarvinMode) {
    // Place Marvin on floor 1 (ground floor)
    const marvinPosition = 0; // Ground floor (floor 1) is at index 0
    floors[elevatorPosition] = '  [|##|]  '; // Elevator
    floors[marvinPosition] = hasMarvinJoined ? '  [|MA|]  ' : '  MA     '; // Marvin
  } else {
    floors[elevatorPosition] = '  [|##|]  ';
  }

  if (showLegend) {
    floors = floors.map(_ => '                   |  |                   ');
    floors[FLOORS - 1] = '                   |  |  <- Floor 5       ';
    floors[0] = '                   |  |  <- Floor 1 (Goal)';
    if (isMarvinMode) {
      floors[0] = '     Marvin -> MA  |  |  <- Floor 1       ';
    } else {
      floors[elevatorPosition] = '      Elevator -> [|##|]                  ';
    }
  }

  // Reverse the array so floor 5 appears at the top
  return floors.reverse().join('\n');
};


const useUiState = (initialState: UiState): [UiState, React.Dispatch<React.SetStateAction<UiState>>] => {
    const [uiState, setUiState] = useState<UiState>(initialState);
    return [uiState, setUiState];
  }
  
  const updateState = <T extends object>(
    setState: React.Dispatch<React.SetStateAction<T>>, 
    newState: Partial<T>
  ) => {
    setState(prevState => ({
      ...prevState,
      ...newState
    }));
  }
  

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

// Update fetchGuideMessage to use guide persona
const fetchGuideMessage = async (messages: Message[]): Promise<Message> => {
  const lastUserMessage = messages.filter(msg => msg.persona === 'user').pop()?.message || '';
  const lastAssistantMessage = messages.filter(msg => 
    msg.persona === 'elevator' || msg.persona === 'marvin'
  ).pop()?.message || '';

  try {
    const data = await fetchFromPollinations(
      getGuideMessages(lastUserMessage, lastAssistantMessage), 
      false
    );

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


// Add type for fetchFromPollinations messages
type PollingsMessage = {
  role: string;
  content: string;
}

// Add this type for API response validation
type PollingsResponse = {
  choices: Array<{
    message: {
      content: string;
    }
  }>;
}

// Add a validation function
const isValidResponse = (data: any): data is PollingsResponse => {
  return Boolean(
    data?.choices?.[0]?.message?.content &&
    typeof data.choices[0].message.content === 'string'
  );
};

// Add a custom error class for retry attempts
class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

// Update retryFetch with better error handling
const retryFetch = async (
  operation: () => Promise<Response>, 
  validateJson = true,
  maxAttempts = 3,
  delayMs = 1000
): Promise<PollingsResponse> => {
  let attempts = 0;
  let lastError: Error | null = null;
  
  while (attempts < maxAttempts) {
    try {
      const response = await operation();
      
      if (!response.ok) {
        console.warn(`Attempt ${attempts + 1}: HTTP error ${response.status}`);
        attempts++;
        continue;
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!isValidResponse(data)) {
        console.warn(`Attempt ${attempts + 1}: Invalid response structure`);
        attempts++;
        continue;
      }

      // Optionally validate JSON content
      if (validateJson) {
        const content = data.choices[0].message.content;
        if (!isValidJsonContent(content)) {
          console.warn(`Attempt ${attempts + 1}: Invalid JSON content`);
          attempts++;
          continue;
        }
      }

      return data;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempts + 1} failed:`, error);
      attempts++;
    }
    
    if (attempts < maxAttempts) {
      const delay = delayMs * Math.pow(2, attempts - 1);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If all attempts failed, return a fallback response instead of throwing
  console.error(`All ${maxAttempts} attempts failed. Last error: ${lastError?.message}`);
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          message: "I apologize, but I'm having trouble processing your request right now.",
          action: "none"
        })
      }
    }]
  };
};

// Update fetchFromPollinations to handle errors gracefully
const fetchFromPollinations = async (messages: PollingsMessage[], jsonMode = true) => {
  try {
    return await retryFetch(
      () => fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: 'openai',
          jsonMode,
          temperature: 1.2,
          seed: Math.floor(Math.random() * 1000000)
        }),
      }),
      jsonMode
    );
  } catch (error) {
    console.error('Error in fetchFromPollinations:', error);
    // Return a fallback response
    return {
      choices: [{
        message: {
          content: jsonMode 
            ? JSON.stringify({
                message: "I apologize, but I'm having trouble processing your request right now.",
                action: "none"
              })
            : "I apologize, but I'm having trouble processing your request right now."
        }
      }]
    };
  }
};

// Add these functions before the HappyElevator component

const isGuideMessage = (message: string) => {
  return message.startsWith('The Guide says:');
};

// Update the type definition
type LMMessage = {
  role: 'user' | 'assistant';  // Removed 'system' since it's handled elsewhere
  content: string;
}

// Simplified transformation function
const transformMessagesForLM = (
  messages: Message[], 
  userPersona: 'user' | 'marvin' | 'elevator' | 'guide' = 'user'
): LMMessage[] => {
  return messages.map(msg => {
    // Special handling for guide messages
    if (msg.persona === 'guide') {
      return {
        role: 'assistant',
        content: msg.message // Guide messages are already properly formatted
      };
    }

    // Regular message handling
    const role = msg.persona === userPersona ? 'user' : 'assistant';
    return {
      role,
      content: JSON.stringify({
        message: msg.message,
        action: msg.action
      })
    };
  });
};

// Add this component definition before the HappyElevator component
type MessageDisplayProps = {
  msg: Message;
  gameState: GameState;
};

const MessageDisplay: React.FC<MessageDisplayProps> = ({ msg, gameState }) => {
  const messageStyles = {
    user: 'text-yellow-400',
    guide: 'text-blue-400',
    elevator: 'text-green-400',
    marvin: 'text-green-400'
  };

  const prefixes = {
    user: '> ',
    guide: '',
    elevator: 'Elevator: ',
    marvin: 'Marvin: '
  };

  return (
    <div className={`p-2 ${messageStyles[msg.persona]}`}>
      {prefixes[msg.persona]}
      {msg.message}
      {msg.persona === 'elevator' && 
       gameState.currentPersona === 'elevator' && 
       getActionIndicator(msg.action)}
    </div>
  );
};

// Update isValidJsonContent to be more specific about validation failures
const isValidJsonContent = (content: string): boolean => {
  try {
    const parsed = JSON.parse(content);
    
    const hasValidMessage = typeof parsed.message === 'string' && parsed.message.length > 0;
    const hasValidAction = ['none', 'join', 'up', 'down'].includes(parsed.action);
    
    if (!hasValidMessage) {
      console.error('Invalid message format:', parsed);
      return false;
    }
    
    if (!hasValidAction) {
      console.error('Invalid action:', parsed.action);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('JSON parse error:', error);
    return false;
  }
};








































