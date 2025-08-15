import { 
  PollingsMessage, 
  PollingsResponse, 
  API_CONFIG 
} from '@/types';

const createFetchRequest = (messages: PollingsMessage[], jsonMode = true) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages,
    model: 'openai-large',
    jsonMode,
    referrer: 'pollinations.github.io',
    // temperature: 1.2,
    seed: Math.floor(Math.random() * 1000000)
  })
});

const FALLBACK_RESPONSE: PollingsResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        message: "I apologize, but I'm having trouble processing your request right now.",
        action: "none"
      })
    }
  }]
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const retryFetch = async (
  operation: () => Promise<Response>,
  maxAttempts = API_CONFIG.MAX_RETRIES
): Promise<PollingsResponse> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await operation();
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const text = await response.text();
      console.log('Raw API response:', text.substring(0, 200) + '...');
      
      if (!text.trim()) {
        throw new Error('Empty response from API');
      }
      
      const data = JSON.parse(text);
      return data as PollingsResponse;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1}/${maxAttempts} failed:`, error);
      
      if (attempt < maxAttempts - 1) {
        await delay(API_CONFIG.RETRY_DELAY * Math.pow(2, attempt));
      }
    }
  }

  console.error(`All ${maxAttempts} attempts failed. Last error:`, lastError);
  return FALLBACK_RESPONSE;
};

export const fetchFromPollinations = async (
  messages: PollingsMessage[], 
  jsonMode = true
): Promise<PollingsResponse> => {
  try {
    // Add small delay for first request to avoid timing issues
    if (messages.length === 1) {
      await delay(100);
    }
    
    return await retryFetch(
      () => fetch(API_CONFIG.ENDPOINT, createFetchRequest(messages, jsonMode)),
    );
  } catch (error) {
    console.error('Error in fetchFromPollinations:', error);
    return FALLBACK_RESPONSE;
  }
};
