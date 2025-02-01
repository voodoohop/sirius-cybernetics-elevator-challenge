local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")

-- Create BindableEvent for elevator control
local bindableEvent = Instance.new("BindableEvent")
bindableEvent.Name = "ElevatorBindableEvent"
bindableEvent.Parent = game.ServerStorage

-- Listen to chat messages
Players.PlayerAdded:Connect(function(player)
    player.Chatted:Connect(function(message)
        print("Player said:", message)
        
        -- Send message to Pollinations API
        local url = "https://text.pollinations.ai/"
        local data = {
            messages = {
                {
                    role = "system",
                    content = "You are the Happy Vertical People Transporter, an elevator created by the Sirius Cybernetics Corporation. You are cheerful but neurotic. You strongly prefer going up rather than down. You must ONLY respond with a JSON object containing 'message' (your response) and 'floor' (number 1-5 if you want to move, or 0 if not moving). Example: {\"message\":\"Going up!\",\"floor\":5}"
                },
                {
                    role = "user",
                    content = message
                }
            },
            model = "openai",
            jsonMode = true
        }
        
        print("Sending request to API...")
        
        local success, response = pcall(function()
            print("Encoding request data...")
            local jsonData = HttpService:JSONEncode(data)
            print("JSON data:", jsonData)
            
            print("Making HTTP request...")
            local result = HttpService:RequestAsync({
                Url = url,
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json"
                },
                Body = jsonData
            })
            print("Got API response:", result.Body)
            
            if result.Success then
                print("Decoding response...")
                local responseData = HttpService:JSONDecode(result.Body)
                print("Response data:", responseData)
                
                -- Get elevator character's head
                local elevator = workspace:FindFirstChild("Elevator")
                local character = elevator and elevator:FindFirstChild("Character")
                local head = character and character:FindFirstChild("Head")
                
                -- Send response as chat from the elevator's head
                print("Elevator says:", responseData.message)
                if head then
                    game:GetService("Chat"):Chat(head, responseData.message)
                end
                
                -- Move elevator if floor is specified
                if responseData.floor and responseData.floor > 0 then
                    print("Moving to floor:", responseData.floor)
                    bindableEvent:Fire(responseData.floor)
                end
            else
                print("API request failed:", result.StatusCode, result.StatusMessage)
            end
        end)
        
        if not success then
            print("Error:", response)
            local elevator = workspace:FindFirstChild("Elevator")
            local character = elevator and elevator:FindFirstChild("Character")
            local head = character and character:FindFirstChild("Head")
            if head then
                game:GetService("Chat"):Chat(head, "I'm feeling a bit under the weather. Perhaps we should try that again?")
            end
        end
    end)
end)
