print("Button script starting")

local button = script.Parent
local detector = button.ClickDetector

-- Create a BindableEvent for server-to-server communication
local bindableEvent = Instance.new("BindableEvent")
bindableEvent.Name = "ElevatorBindableEvent"
bindableEvent.Parent = game.ServerStorage

detector.MouseClick:Connect(function(player)
    print("Button clicked by", player)
    -- Use BindableEvent instead of RemoteEvent for server-side communication
    bindableEvent:Fire(5)
end)

print("Button script ready")
