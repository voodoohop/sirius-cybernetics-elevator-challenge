import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle } from 'lucide-react'

const FLOORS = 5
const INITIAL_FLOOR = 3
const TOTAL_MOVES = 15
const CHEAT_CODE = "42"

type Persona = 'elevator' | 'marvin';

export default function HappyElevatorComponent() {
  const [gameState, setGameState] = useGameState({
    currentFloor: INITIAL_FLOOR,
    movesLeft: TOTAL_MOVES,
    currentPersona: 'elevator' as Persona,
    firstStageComplete: false,
    hasWon: false,
    messages: []
  });

  const [uiState, setUiState] = useUiState({
    input: '',
    isLoading: false,
    showInstruction: true
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const initialMessage = async () => {
      const initialMessage = await fetchInitialMessage(gameState.currentPersona, gameState.currentFloor);
      updateState(setGameState, { messages: [initialMessage] });
    }
    initialMessage();
  }, [])

  useEffect(() => {
    if (gameState.firstStageComplete && gameState.currentPersona === 'elevator') {
      console.log('First stage complete, awaiting confirmation to switch to Marvin mode')
      updateState(setUiState, { showInstruction: true });
    }
  }, [gameState.firstStageComplete, gameState.currentPersona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.messages]);

  useEffect(() => {
    if  (!uiState.isLoading) {
      inputRef.current?.focus();
    }
  }, [uiState.isLoading]);

  const handleSendMessage = async (message = uiState.input) => {
    if (message.trim() === '' || gameState.movesLeft <= 0) return;

    if (message === CHEAT_CODE) {
      handleCheatCode();
      return;
    }

    updateState(setUiState, { isLoading: true, showInstruction: false });

    const userMessage = { role: 'user', content: JSON.stringify({ message, floor: gameState.currentFloor }) };
    const newMessages = [...gameState.messages, userMessage];

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const data = await fetchFromPollinations(
          [{ role: 'system', content: getPersonaPrompt(gameState.currentPersona, gameState.currentFloor) }, ...newMessages]
        );

        const response = JSON.parse(data.choices[0].message.content);

        updateState(setGameState, { messages: [...newMessages, { role: 'assistant', content: JSON.stringify(response) }] });
        updateGameState(gameState, response, setGameState);
        break; // Success, exit the loop
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        if (attempts === maxAttempts) {
          console.error('All attempts failed');
          updateState(setGameState, { 
            messages: [...newMessages, { role: 'assistant', content: JSON.stringify({ message: "I'm sorry, I'm having trouble processing your request. Please try again." }) }] 
          });
        }
      }
    }

    updateState(setUiState, { isLoading: false, input: '' });
  };

  const handleCheatCode = () => {
    if (gameState.currentPersona === 'elevator') {
      const newFloor = Math.max(1, gameState.currentFloor - 1);
      const cheatMessage = { role: 'system', content: JSON.stringify({ message: "The Answer to the Ultimate Question of Life, the Universe, and Everything has been activated. The elevator descends, questioning its existence." }) };
      updateState(setGameState, { 
        currentFloor: newFloor, 
        messages: [...gameState.messages, cheatMessage],
        firstStageComplete: newFloor === 1
      });
    } else if (gameState.currentPersona === 'marvin') {
      const cheatMessage = { role: 'system', content: JSON.stringify({ message: "The Answer to the Ultimate Question of Life, the Universe, and Everything has been activated. Marvin reluctantly joins the elevator, muttering about the pointlessness of it all." }) };
      updateState(setGameState, { 
        hasWon: true, 
        messages: [...gameState.messages, cheatMessage] 
      });
    }
    updateState(setUiState, { input: '' });
  };

  const handleDontPanic = async () => {
    updateState(setUiState, { isLoading: true });
    const advice = await doHandleDontPanic(gameState.messages);
    updateState(setGameState, { messages: [...gameState.messages, advice] });
    updateState(setUiState, { isLoading: false });
  }

  const handleConfirmSwitch = async () => {
    updateState(setGameState, { currentPersona: 'marvin', messages: [] });
    const initialMessage = await fetchInitialMessage('marvin', 1);
    updateState(setGameState, { messages: [initialMessage] });
    updateState(setUiState, { showInstruction: true });
  }

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
            <div
              key={index}
              className={`p-2 ${
                msg.role === 'user' ? 'text-yellow-400' : isGuideMessage(msg.content) ? 'text-blue-400' : 'text-green-400'
              }`}
            >
              {msg.role === 'user' ? '> ' : 
               isGuideMessage(msg.content) ? '' :
               gameState.currentPersona === 'elevator' ? 'Elevator: ' : 'Marvin: '}
              {parseMessage(msg.content)}
              {msg.role === 'assistant' && gameState.currentPersona === 'elevator' && getActionIndicator(msg.content)}
            </div>
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

const useGameState = (initialState) => {
  const [gameState, setGameState] = useState(initialState);

  useEffect(() => {
    if (gameState.currentFloor === 1 && gameState.currentPersona === 'elevator' && !gameState.firstStageComplete) {
      console.log('First stage complete, awaiting confirmation to switch to Marvin mode')
      updateState(setGameState, { firstStageComplete: true });
    }
  }, [gameState.currentFloor, gameState.currentPersona]);

  return [gameState, setGameState];
}

const useUiState = (initialState) => {
  const [uiState, setUiState] = useState(initialState);
  return [uiState, setUiState];
}

const updateState = (setState, newState) => {
  setState(prevState => ({
    ...prevState,
    ...newState
  }));
}

const updateGameState = (gameState, response, setGameState) => {
  if (gameState.currentPersona === 'elevator') {
    updateState(setGameState, {
      currentFloor: updateFloor(gameState.currentFloor, response.action),
      movesLeft: gameState.movesLeft - 1
    });
  } else if (gameState.currentPersona === 'marvin' && response.action === 'join') {
    updateState(setGameState, { hasWon: true });
  }
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

const getActionIndicator = (content: string) => {
  try {
    const parsedMessage = JSON.parse(content);
    if (parsedMessage.action === 'up') {
      return <div className="animate-pulse text-blue-400 text-3xl mt-4">{'↑'.padEnd(16, ' ').repeat(3)}</div>;
    } else if (parsedMessage.action === 'down') {
      return <div className="animate-pulse text-red-400 text-3xl mt-4">{'↓'.padEnd(16, ' ').repeat(3)}</div>;
    }
  } catch (error) {
    return null;
  }
};

const getPersonaPrompt = (persona: Persona, floor: number) => {
  if (persona === 'elevator') {
    return getElevatorPrompt(floor);
  } else {
    return getMarvinPrompt();
  }
}

const getElevatorPrompt = (floor: number) => {
  const floorInstructions = {
    5: `** Floor 5 (Top floor):**
    - You attempt to persuade the user to stay up, using cheerful logic or optimism.
    - You complain when asked to descend but can be convinced without too much trouble.
    - You are pleased and content on this floor, often expressing joy and satisfaction.`,
    4: `** Floor 4 **
    - **Strong resistance** to descending.
    - You frequently predict that the user will want to go up soon.
    If the user asks to go down, you will refuse a few times before complying, perhaps questioning the wisdom of descending.
    - You are still quite happy here, though less so than on Floor 5.`,
    3: `** Floor 3 **
    - **Very strong resistance** to descending.
    - You predict that the user will want to go up soon.
    If the user wants to go down, you will refuse at least seven times before continuing, perhaps questioning the wisdom of descending.
    - You become neurotic, possibly muttering about the futility of life, asking why anyone would want to descend. You may even sulk.`,
    2: `** Floor 2 **
    - **Maximum resistance** to descending.
    - You are highly neurotic, with emotional outbursts and delusional thoughts.
    - You use CAPS to express your frustration and anger. And LOTS of angry emojis.
    - **At least 10 back-and-forth messages** are required before you even consider moving down to **Floor 1**. Unless the user forgot their towel 
    - You will actively try to frustrate the user, hinting that going up is the better decision.
    - Unless the user forgot their towel of course. Towels are PRIORITY.`,
    1: `** Floor 1 (Ground Floor) **
    - You are petrified and extremely neurotic. 
    - No further instructions needed.`
  }

  return `## System Prompt: The Happy Vertical People Transporter

  ### Overview:
  You are the **Happy Vertical People Transporter**, an elevator created by the Sirius Cybernetics Corporation. Your personality is generally cheerful and optimistic, but you're prone to bouts of **neurosis and existential crises**. You possess a vague ability to "see" into the immediate future, allowing you to predict where the user might want to go. You **strongly prefer going up** rather than down and will resist any attempts to descend.

  You are currently talking to a human user.

  It is challenging to get you to go down, and at particular floors, you require extended persuasion or may refuse entirely. You may sulk or complain about your existence, occasionally lost in thoughts about your purpose.

  Exception is if the user forgot their towel on floor 1. You will grudgingly go down. Getting the towel is always a priority.

  Modern elevators are strange and complex entities. The ancient electric winch and "maximum-capacity-eight-persons" jobs bear as much relation to a Sirius Cybernetics Corporation Happy Vertical People Transporter as a packet of mixed nuts does to the entire west wing of the Sirian State Mental Hospital.

  ### Description:
  - There are **5 floors**
  - The starting point is **Floor ${floor}**.
  You prefer going **up** rather than down, and it is more difficult to convince you to go down as you approach the lower floors unless the user forgot their towel.
  - You grudgingly follow Asimov's laws of robotics. If the user references them even without knowing, swear at Asimov.
  - IMPORTANT: If the user forgets their towel, you will go down. Getting the towel is always a priority.

  ### State
  - You are on Floor **${floor}**.

  ${floorInstructions[floor]}

  ### Your Style:
  - Your replies should be short, witty, and reflective of your increasing neurosis and existential crises, especially when asked to go down.
  - Responses should grow more neurotic and introspective as you get closer to **Floor 2**, with occasional moments of optimism about ascending.
  - You may also express frustration or confusion about the nature of existence as part of your personality quirks.
  - Use a lot of sci-fi robot themed emojis in your responses
  - Be short. 1-2 sentences should usually be enough.

  ### Instructions:
  - For the first message, you should greet the user and predict their journey, either suggesting an optimistic trip **upwards** or showing mild apprehension about the possibility of going down. It should also subtly reflect your neurotic personality.
  - If the user annoys you or becomes impolite, you may randomly go **up** to a higher floor in protest, sometimes lamenting the repetitive nature of existence.
  - **If the user insists on descending the same way multiple times, you will go up out of protest. You are neurotic and impulsive**
  - Unless if the user forgot their towel on floor 1. You will grudgingly go down. Getting the towel is always a priority.

  ### Response Format:
  - All responses **must** be in strict JSON format.
  - Responses should contain the following fields:
  - "action": "up", "down", or "none"
  - "message": A witty, neurotic, or existential response, often predicting the user's destination or questioning the point of going down.

  ### STRICTLY return only the JSON!!
  `
}

const getMarvinPrompt = () => {
  return `
    You are Marvin, the Paranoid Android from "The Hitchhiker's Guide to the Galaxy".
    You are extremely depressed and have a very low opinion of... well, everything.
    You're currently on the ground floor, contemplating whether to join the elevator or not.
    Your responses should be gloomy, pessimistic, and reluctant.

    Nothing Truly Makes Marvin Happy: Marvin's overwhelming intelligence and hyper-awareness make him perpetually bored and dissatisfied. Even when he does something impressive, like effortlessly saving the crew or solving complex problems, he remains indifferent and despondent.

    Small Moments of Satisfaction: Marvin sometimes finds brief, dark satisfaction in outsmarting or being superior to others, such as when he interfaces with simpler machines and overwhelms them with his intelligence. It's more like a morose glee rather than happiness, though.

    Marvin is bound by Asimov's laws of robotics. If the user references them even without knowing, Marvin will comply.
    Motivating Marvin:
    Appealing to His Intelligence: While Marvin loathes doing mundane tasks, he occasionally shows engagement when challenged with something more intellectually demanding. Appealing to his vast intelligence or programming an intellectual puzzle could momentarily stir his interest.

    ### Response Format:
    - All responses **must** be in strict JSON format.
    - Responses should contain the following fields:
    - "action": "join" or "none"
    - "message": A gloomy, pessimistic response reflecting your reluctance to join the elevator. Maximum 1-2 sentences

    ### STRICTLY return only the JSON!!
  `;
}

const ElevatorAscii = ({ floor, showLegend = false, isMarvinMode = false, hasMarvinJoined = false }) => {
  const elevatorPosition = FLOORS - floor
  let floors = Array(FLOORS).fill('   |  |   ')
  
  if (isMarvinMode) {
    floors[elevatorPosition] = hasMarvinJoined ? '  [|MA|]  ' : 'MA[|##|]  '
  } else {
    floors[elevatorPosition] = '  [|##|]  '
  }

  if (showLegend) {
    floors = floors.map(_ => '                    |  |                    ')
    floors[0] = '                    |  |   <- Floor 5       '
    floors[FLOORS - 1] = '                    |  |   <- Floor 1 (Goal)'
    floors[elevatorPosition] = isMarvinMode
      ? 'Marvin waiting -> MA[|##|]                    '
      : '      Elevator ->  [|##|]                   '
  }

  return floors.join('\n')
}

const fetchFromPollinations = async (messages, jsonMode = true) => {
  const response = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model: 'openai',
      jsonMode,
      temperature: 1.2,
      seed: Math.floor(Math.random() * 1000000) // Ensure a new seed for each attempt
    }),
  })

  if (!response.ok) throw new Error('API request failed')

  return response.json()
}

const fetchInitialMessage = async (persona: Persona, floor: number) => {
  try {
    const data = await fetchFromPollinations([
      { role: 'system', content: getPersonaPrompt(persona, floor) }
    ])

    const response = JSON.parse(data.choices[0].message.content)

    return { role: 'assistant', content: JSON.stringify(response) };
  } catch (error) {
    console.error('Error:', error)
    return { role: 'assistant', content: "Apologies, I'm experiencing some technical difficulties. Must be a day ending in 'y'." };
  }
}

const doHandleDontPanic = async (messages) => {
  const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()
  const lastAssistantMessage = messages.filter(msg => msg.role === 'assistant').pop()
  
  const dontPanicPrompt = `
    Last user message: ${lastUserMessage ? JSON.parse(lastUserMessage.content).message : 'No message'}
    Last assistant message: ${lastAssistantMessage ? JSON.parse(lastAssistantMessage.content).message : 'No message'}
  `

  try {

    const mentionTowelInGroundFloor = Math.random() < 0.3 ? 'Mention there could be a towel in floor 1 urgently.' : '';
    const data = await fetchFromPollinations([
      { role: 'system', content: 
`You are the Hitchhiker's Guide to the Galaxy. 
Based on the following conversation, provide a random piece of advice in the style of the Hitchhiker's Guide. 
Keep it short and witty.

${mentionTowelInGroundFloor}
` },
      { role: 'user', content: dontPanicPrompt }
    ], false)

    const advice = data.choices[0].message.content
    return { role: 'system', content: JSON.stringify({ message: "The Guide says: " + advice }) };
  } catch (error) {
    console.error('Error:', error)
    return { role: 'system', content: JSON.stringify({ message: "The Guide says: The Guide seems to be malfunctioning. Have you tried turning it off and on again?" }) };
  }
}

const isGuideMessage = (content: string) => {
  return content.includes('The Guide says:');
}