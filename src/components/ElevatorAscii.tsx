import React from 'react';
import { ElevatorAsciiProps, GAME_CONFIG } from '@/types';

export const ElevatorAscii = ({ 
  floor, 
  showLegend = false, 
  isMarvinMode = false, 
  hasMarvinJoined = false 
}: ElevatorAsciiProps) => {
  // Now floor number directly corresponds to array index (floor 1 = index 0)
  const elevatorPosition = floor - 1;
  let floors = Array(GAME_CONFIG.FLOORS).fill('   |  |   ');
  
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
    floors[GAME_CONFIG.FLOORS - 1] = '                   |  |  <- Floor 5       ';
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
