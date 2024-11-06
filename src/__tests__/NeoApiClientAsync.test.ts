import { NeoApiClientAsync } from '../clients/NeoApiClientAsync';
import { LLMOutput } from '../models/LLMOutput';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('NeoApiClientAsync', () => {
  let client: NeoApiClientAsync;
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    
    client = new NeoApiClientAsync({
      apiKey: 'test_api_key',
      initialBatchSize: 2,
      initialFlushInterval: 0.1,
      apiUrl: 'https://api.neoapi.ai',
      maxRetries: 2
    });

    mock.onAny().reply(200, { success: true });
    
    client.start();
  });

  afterEach(async () => {
    client.stop();
    mock.reset();
    mock.restore();
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  it('should send batch when batch size is reached', async () => {
    const llmOutput1: LLMOutput = { text: 'Output 1', timestamp: Date.now() };
    const llmOutput2: LLMOutput = { text: 'Output 2', timestamp: Date.now() };

    mock.onPost('https://api.neoapi.ai/save').reply(200);

    await client.track(llmOutput1);
    await client.track(llmOutput2);

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mock.history.post.length).toBe(2);
    const firstRequest = JSON.parse(mock.history.post[0].data);
    const secondRequest = JSON.parse(mock.history.post[1].data);
    expect(firstRequest.text).toBe(llmOutput1.text);
    expect(secondRequest.text).toBe(llmOutput2.text);
  });

  it('should flush remaining items on stop', async () => {
    const llmOutput: LLMOutput = { text: 'Output', timestamp: Date.now() };
    mock.onPost('https://api.neoapi.ai/save').reply(200);

    await client.track(llmOutput);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    client.stop();
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mock.history.post.length).toBe(1);
    const request = JSON.parse(mock.history.post[0].data);
    expect(request.text).toBe(llmOutput.text);
  });

  it('should retry on failure', async () => {
    const llmOutput: LLMOutput = { text: 'Retry Output', timestamp: Date.now() };

    // Set up mock to fail first request and succeed second
    let requestCount = 0;
    mock.reset();
    mock.onPost('https://api.neoapi.ai/save')
      .reply(function(config) {
        requestCount++;
        if (requestCount === 1) {
          return [500, { error: 'Test error' }];
        }
        return [200, { success: true }];
      });

    // Track and wait for initial attempt
    await client.track(llmOutput);
    
    // Wait for initial request and retry
    for (let i = 0; i < 10 && requestCount < 2; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(requestCount).toBe(2);
    expect(mock.history.post.length).toBe(2);
    
    // Verify both requests had the same payload
    const firstAttempt = JSON.parse(mock.history.post[0].data);
    const secondAttempt = JSON.parse(mock.history.post[1].data);
    expect(firstAttempt.text).toBe(llmOutput.text);
    expect(secondAttempt.text).toBe(llmOutput.text);
  });

  it('should handle analysis response', async () => {
    const analysisResponse = { analysis: 'test analysis' };
    mock.onPost('https://api.neoapi.ai/analyze').reply(200, analysisResponse);

    const llmOutput: LLMOutput = {
      text: 'Analyze this',
      timestamp: Date.now(),
      needAnalysisResponse: true
    };

    await client.track(llmOutput);
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mock.history.post.length).toBe(1);
    expect(mock.history.post[0].url).toContain('/analyze');
  });
}); 