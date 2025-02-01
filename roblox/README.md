# Sirius Cybernetics Elevator - Roblox MVP

This folder contains the minimal implementation of the Happy Vertical People Transporter for Roblox.

## Setup Instructions

1. Create a new place in Roblox Studio
2. Set up the RemoteEvent (two options):
   - **Option 1 (Manual)**: In Explorer, right-click ReplicatedStorage > Insert Object > RemoteEvent and name it "ElevatorRemoteEvent"
   - **Option 2 (Automatic)**: Copy `SetupScript.lua` into a new Script in ServerScriptService
3. Insert an elevator model from the Toolbox or create a simple one using parts
4. Copy the scripts from this folder into their respective locations in Roblox Studio:
   - `ElevatorScript.lua` → Place it in the elevator model
   - `ButtonScript.lua` → Place it in each floor's button

## Implementation Details

The MVP includes:
- Basic elevator movement between 5 floors
- Simple button interaction system
- Smooth elevator movement
- Basic configuration options

## Usage

1. Place the elevator model in your world
2. Add buttons at each floor
3. Configure the floor heights in the `ElevatorScript.lua`
4. Test by clicking the buttons to call the elevator

Note: This is a basic implementation focusing on core movement mechanics. The personality and advanced features from the original game are not included in this MVP.
