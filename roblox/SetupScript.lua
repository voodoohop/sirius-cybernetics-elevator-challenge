-- This script should be placed in ServerScriptService
-- It will create the necessary RemoteEvent if it doesn't exist

local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Create RemoteEvent if it doesn't exist
if not ReplicatedStorage:FindFirstChild("ElevatorRemoteEvent") then
    local remoteEvent = Instance.new("RemoteEvent")
    remoteEvent.Name = "ElevatorRemoteEvent"
    remoteEvent.Parent = ReplicatedStorage
end

local function createElevatorShaft()
    -- Create the main shaft walls
    local function createShaftWall(size, position, name)
        local wall = Instance.new("Part")
        wall.Name = name
        wall.Anchored = true
        wall.Size = size
        wall.Position = position
        wall.BrickColor = BrickColor.new("Dark gray")  -- Darker color for visibility
        wall.Material = Enum.Material.SmoothPlastic
        wall.Parent = workspace
        return wall
    end

    local SHAFT_HEIGHT = 100  -- Total height for 5 floors
    -- Create continuous shaft walls (wider for larger elevator)
    createShaftWall(Vector3.new(1, SHAFT_HEIGHT, 14), Vector3.new(-7, SHAFT_HEIGHT/2, 0), "ShaftWallLeft")
    createShaftWall(Vector3.new(1, SHAFT_HEIGHT, 14), Vector3.new(7, SHAFT_HEIGHT/2, 0), "ShaftWallRight")
    createShaftWall(Vector3.new(14, SHAFT_HEIGHT, 1), Vector3.new(0, SHAFT_HEIGHT/2, 7), "ShaftWallBack")
end

local function createFloor(floorNumber, height)
    -- Create floor sections to make a hole for elevator
    local function createFloorSection(size, position)
        local section = Instance.new("Part")
        section.Name = "FloorSection"
        section.Anchored = true
        section.Size = size
        section.Position = position
        section.BrickColor = BrickColor.new("Light gray")
        section.Parent = workspace
        return section
    end

    -- Create the floor in sections with a hole in the middle
    local mainFloor = createFloorSection(Vector3.new(40, 1, 15), Vector3.new(0, height, -12.5))  -- Back section
    mainFloor.Name = "Floor" .. floorNumber .. "_Back"
    
    local frontFloor = createFloorSection(Vector3.new(40, 1, 15), Vector3.new(0, height, 12.5))  -- Front section
    frontFloor.Name = "Floor" .. floorNumber .. "_Front"
    
    local leftFloor = createFloorSection(Vector3.new(13, 1, 10), Vector3.new(-13.5, height, 0))  -- Left section
    leftFloor.Name = "Floor" .. floorNumber .. "_Left"
    
    local rightFloor = createFloorSection(Vector3.new(13, 1, 10), Vector3.new(13.5, height, 0))  -- Right section
    rightFloor.Name = "Floor" .. floorNumber .. "_Right"

    -- Create floor label
    local label = Instance.new("TextLabel")
    label.Name = "FloorLabel"
    label.Text = "Floor " .. floorNumber
    label.Size = UDim2.new(0, 100, 0, 50)
    label.Position = UDim2.new(0.5, -50, 0, -30)
    label.BackgroundTransparency = 1
    label.TextSize = 24
    label.TextColor3 = Color3.new(1, 1, 1)
    label.Parent = mainFloor
    
    -- Create floor number display
    local display = Instance.new("Part")
    display.Name = "FloorDisplay"
    display.Anchored = true
    display.Size = Vector3.new(4, 2, 0.1)
    display.Position = Vector3.new(0, height + 3, 7.1)  -- Moved forward to be on the shaft wall
    display.BrickColor = BrickColor.new("Really black")
    display.Parent = workspace

    local displayText = Instance.new("TextLabel")
    displayText.Name = "DisplayText"
    displayText.Text = floorNumber
    displayText.Size = UDim2.new(1, 0, 1, 0)
    displayText.BackgroundTransparency = 1
    displayText.TextSize = 24
    displayText.TextColor3 = Color3.new(0, 1, 0)  -- Green text
    displayText.Parent = display
end

local function createElevator()
    local elevator = Instance.new("Part")
    elevator.Name = "Elevator"
    elevator.Anchored = true
    elevator.Size = Vector3.new(12, 10, 12)  -- Larger elevator (12x10x12)
    elevator.Position = Vector3.new(0, 2, 0)  -- Lower starting position
    elevator.BrickColor = BrickColor.new("Bright blue")
    elevator.Parent = workspace

    -- Create elevator interior
    local interior = Instance.new("Part")
    interior.Name = "Interior"
    interior.Anchored = true
    interior.Size = Vector3.new(11.5, 9.5, 11.5)  -- Slightly smaller than exterior
    interior.Position = elevator.Position
    interior.BrickColor = BrickColor.new("Institutional white")
    interior.Transparency = 0.5
    interior.Parent = elevator

    -- Create elevator character model
    local character = Instance.new("Model")
    character.Name = "Character"
    character.Parent = elevator

    -- Create head (a happy display screen)
    local head = Instance.new("Part")
    head.Name = "Head"
    head.Size = Vector3.new(2, 2, 0.5)
    head.Position = Vector3.new(0, elevator.Position.Y + 6, -5.5)  -- Front of elevator
    head.BrickColor = BrickColor.new("Really black")
    head.Material = Enum.Material.Neon
    head.Anchored = true
    head.Parent = character

    -- Create happy face display
    local face = Instance.new("Decal")
    face.Name = "Face"
    face.Texture = "rbxasset://textures/face.png"  -- Default happy face
    face.Parent = head

    -- Create torso (control panel)
    local torso = Instance.new("Part")
    torso.Name = "Torso"
    torso.Size = Vector3.new(1.5, 2, 0.3)
    torso.Position = Vector3.new(0, elevator.Position.Y + 4, -5.7)  -- Below head
    torso.BrickColor = BrickColor.new("Dark grey")
    torso.Material = Enum.Material.Metal
    torso.Anchored = true
    torso.Parent = character

    -- Create floor display on torso
    local floorDisplay = Instance.new("SurfaceGui")
    floorDisplay.Name = "FloorDisplay"
    floorDisplay.Parent = torso
    floorDisplay.Face = Enum.NormalId.Front

    local floorText = Instance.new("TextLabel")
    floorText.Name = "FloorIndicator"
    floorText.Size = UDim2.new(1, 0, 1, 0)
    floorText.BackgroundTransparency = 1
    floorText.TextColor3 = Color3.new(0, 1, 0)
    floorText.TextSize = 48
    floorText.Font = Enum.Font.Code
    floorText.Text = "1"
    floorText.Parent = floorDisplay

    -- Create humanoid
    local humanoid = Instance.new("Humanoid")
    humanoid.Parent = character

    -- Add lighting
    local light = Instance.new("PointLight")
    light.Name = "ElevatorLight"
    light.Color = Color3.new(1, 1, 0.9)  -- Warm white
    light.Range = 14  -- Increased range for larger elevator
    light.Parent = elevator

    return elevator
end

-- Create multiple floors
local FLOOR_HEIGHT = 20  -- Height between floors
local NUM_FLOORS = 5

-- Create continuous elevator shaft first
createElevatorShaft()

-- Then create floors with gaps for the elevator
for i = 1, NUM_FLOORS do
    createFloor(i, (i - 1) * FLOOR_HEIGHT)
end

-- Create the elevator
local elevator = createElevator()

-- Create spawn location on ground floor
local spawnLocation = Instance.new("SpawnLocation")
spawnLocation.Anchored = true
spawnLocation.Size = Vector3.new(5, 1, 5)
spawnLocation.Position = Vector3.new(15, 1, 15)  -- Away from elevator
spawnLocation.Parent = workspace
