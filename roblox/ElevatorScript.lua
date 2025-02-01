-- Configuration
local FLOOR_COUNT = 5
local DOOR_OPEN_TIME = 3 -- Seconds the door stays open

-- Services
local TweenService = game:GetService("TweenService")

-- Get the elevator from workspace
local elevator = workspace:WaitForChild("Elevator")
local currentFloor = 1 -- Starting at ground floor
local isMoving = false

-- Constants
local FLOOR_HEIGHT = 20
local SPEED = 5  -- Speed in studs per second

-- Function to update floor indicators
local function updateFloorIndicators(floor)
    -- Update elevator's character display
    local character = elevator:FindFirstChild("Character")
    if character then
        local torso = character:FindFirstChild("Torso")
        if torso then
            local display = torso:FindFirstChild("FloorDisplay")
            if display then
                local indicator = display:FindFirstChild("FloorIndicator")
                if indicator then
                    indicator.Text = tostring(floor)
                end
            end
        end
    end
end

-- Function to move elevator to floor
local function moveToFloor(targetFloor)
    if isMoving then return end
    isMoving = true
    
    local currentY = elevator.Position.Y
    local targetY = (targetFloor - 1) * FLOOR_HEIGHT + 2  -- +2 for ground alignment
    
    -- Calculate distance and duration
    local distance = math.abs(targetY - currentY)
    local duration = distance / SPEED
    
    -- Create tween info
    local tweenInfo = TweenInfo.new(
        duration,
        Enum.EasingStyle.Linear,
        Enum.EasingDirection.InOut,
        0,
        false,
        0
    )
    
    -- Create target position
    local targetPosition = Vector3.new(
        elevator.Position.X,
        targetY,
        elevator.Position.Z
    )
    
    -- Move all parts together
    local function tweenPart(part)
        local tween = TweenService:Create(part, tweenInfo, {
            Position = Vector3.new(
                part.Position.X,
                targetY + (part.Position.Y - currentY),
                part.Position.Z
            )
        })
        tween:Play()
    end
    
    -- Move main elevator
    tweenPart(elevator)
    
    -- Move interior
    local interior = elevator:FindFirstChild("Interior")
    if interior then
        tweenPart(interior)
    end
    
    -- Move character parts
    local character = elevator:FindFirstChild("Character")
    if character then
        local head = character:FindFirstChild("Head")
        if head then
            tweenPart(head)
        end
        local torso = character:FindFirstChild("Torso")
        if torso then
            tweenPart(torso)
        end
    end
    
    -- Update floor indicators during movement
    local startFloor = math.floor(currentY / FLOOR_HEIGHT) + 1
    local endFloor = targetFloor
    local step = startFloor < endFloor and 1 or -1
    
    for floor = startFloor, endFloor, step do
        local floorY = (floor - 1) * FLOOR_HEIGHT + 2
        local waitTime = math.abs(floorY - currentY) / SPEED
        delay(waitTime, function()
            updateFloorIndicators(floor)
        end)
    end
    
    -- Reset moving state after tween
    delay(duration, function()
        isMoving = false
        currentFloor = targetFloor
    end)
end

-- Wait for and connect to the BindableEvent
print("ElevatorScript: Waiting for BindableEvent...")
local bindableEvent = game.ServerStorage:WaitForChild("ElevatorBindableEvent")
print("ElevatorScript: Connected to BindableEvent")

bindableEvent.Event:Connect(function(floor)
    print("ElevatorScript: Got request for floor", floor)
    moveToFloor(floor)
end)
