import { 
  PollingsMessage, 
  PollingsResponse, 
  API_CONFIG 
} from '@/types';

const createFetchRequest = (messages: PollingsMessage[]) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages,
    model: 'openai-large',
    // temperature: 1.2,
    seed: Math.floor(Math.random() * 1000000)
  })
});

const FALLBACK_RESPONSE: PollingsResponse = {
  choices: [{
    message: {
      content: "<thinking>System error occurred</thinking>\nI apologize, but I'm having trouble processing your request right now.\n<action>none</action>"
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
      
      const data = await response.json();
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
  messages: PollingsMessage[]
): Promise<PollingsResponse> => {
  try {
    return await retryFetch(
      () => fetch(API_CONFIG.ENDPOINT, createFetchRequest(messages))
    );
  } catch (error) {
    console.error('Error fetching from Pollinations:', error);
    return FALLBACK_RESPONSE;
  }
};
