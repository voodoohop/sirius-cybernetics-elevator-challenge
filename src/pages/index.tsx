'use client'

import React, { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle } from 'lucide-react'
import { MessageDisplay } from '@/components/MessageDisplay'
import { ElevatorAscii } from '@/components/ElevatorAscii'
import { 
  useGameState, 
  useMessageHandlers, 
  useInitialMessage, 
  useMessageScroll, 
  useInput, 
  useUiState,
  useAutonomousConversation,
} from '@/game/logic'

export default function Index() {
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
    handleMessage, 
    handleGuideAdvice, 
    handlePersonaSwitch 
  } = useMessageHandlers(gameState, dispatch, uiState, setUiState);

  useAutonomousConversation(gameState, dispatch);

  useEffect(() => {
    if (gameState.firstStageComplete && gameState.currentPersona === 'elevator') {
      setUiState(prev => ({ ...prev, showInstruction: true }));
    }
  }, [gameState.firstStageComplete, gameState.currentPersona, setUiState]);

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
            onClick={handleGuideAdvice}
            disabled={uiState.isLoading}
            className="bg-gray-700 text-green-400 hover:bg-gray-600 text-xs py-1 px-2"
          >
            Don't Panic!
          </Button>
        </div>
        
        {uiState.showInstruction && gameState.currentPersona === 'elevator' && !gameState.firstStageComplete && (
          <div className="space-y-2">
            <div className="bg-blue-900 text-blue-200 p-4 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <p>Psst! Your mission: Convince this neurotic elevator to reach the ground floor. Remember your towel!</p>
            </div>
            <div className="bg-yellow-900/50 text-yellow-200 p-3 rounded-lg text-sm">
              <p><strong>Sub-etha News Flash:</strong> New Genuine People Personalities™ scenarios detected in building mainframe. Prepare for Marvin!</p>
            </div>
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
              onClick={handlePersonaSwitch}
              disabled={uiState.isLoading}
              className="bg-green-400 text-black hover:bg-green-500 text-xs py-1 px-2"
            >
              Confirm
            </Button>
            </p>
          </div>
        )}

        {uiState.showInstruction && gameState.currentPersona === 'marvin' && (
          <div className="bg-pink-900/50 text-pink-200 p-4 rounded-lg flex items-center space-x-2">
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
              hasMarvinJoined: gameState.marvinJoined  // Use marvinJoined instead of hasWon
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
            onChange={(e) => setUiState(prev => ({ ...prev, input: e.target.value }))}
            placeholder={gameState.currentPersona === 'elevator' ? "Communicate with the elevator..." : "Try to convince Marvin..."}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => 
              e.key === 'Enter' && handleMessage(e.currentTarget.value)}
            className="flex-grow bg-gray-800 text-green-400 border-green-400 placeholder-green-600"
            disabled={uiState.isLoading || gameState.conversationMode === 'autonomous'}
            ref={inputRef}
          />
          <Button 
            onClick={() => handleMessage(uiState.input)} 
            disabled={uiState.isLoading || gameState.conversationMode === 'autonomous'}
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
