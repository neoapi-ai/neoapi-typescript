import { NeoApiClientSync } from '../clients/NeoApiClientSync';
import { LLMOutput } from '../models/LLMOutput';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('NeoApiClientSync', () => {
  let client: NeoApiClientSync;
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    
    mock.onAny().reply(200, { success: true });

    client = new NeoApiClientSync({
      apiKey: 'test_api_key',
      batchSize: 2,
      flushInterval: 100,
      apiUrl: 'https://api.neoapi.ai',
      maxRetries: 2
    });
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

    mock.onPost('https://api.neoapi.ai/save').reply(200, { success: true });

    await Promise.all([
      client.track(llmOutput1),
      client.track(llmOutput2)
    ]);

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mock.history.post.length).toBe(2);
    const firstRequest = JSON.parse(mock.history.post[0].data);
    const secondRequest = JSON.parse(mock.history.post[1].data);
    expect(firstRequest.text).toBe(llmOutput1.text);
    expect(secondRequest.text).toBe(llmOutput2.text);
  });

  it('should flush remaining items on stop', async () => {
    const llmOutput: LLMOutput = { text: 'Output', timestamp: Date.now() };
    mock.onPost('https://api.neoapi.ai/save').reply(200, { success: true });

    await client.track(llmOutput);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await client.flush();
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mock.history.post.length).toBe(1);
    const request = JSON.parse(mock.history.post[0].data);
    expect(request.text).toBe(llmOutput.text);
  });

  it('should retry on failure', async () => {
    const llmOutput: LLMOutput = { text: 'Retry Output', timestamp: Date.now() };

    // Reset mock and set up retry scenario
    mock.reset();
    let requestCount = 0;
    mock.onPost('https://api.neoapi.ai/save')
      .reply(function(config) {
        requestCount++;
        if (requestCount === 1) {
          return [500, { error: 'Test error' }];
        }
        return [200, { success: true }];
      });

    // Track and immediately flush
    await client.track(llmOutput);
    
    // Wait for initial request and potential retries
    for (let i = 0; i < 10 && requestCount < 2; i++) {
      await client.flush();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(requestCount).toBe(2);
    expect(mock.history.post.length).toBe(2);
    const firstAttempt = JSON.parse(mock.history.post[0].data);
    const secondAttempt = JSON.parse(mock.history.post[1].data);
    expect(firstAttempt.text).toBe(llmOutput.text);
    expect(secondAttempt.text).toBe(llmOutput.text);
  });

  it('should process batch of prompts', async () => {
    mock.onPost('https://api.neoapi.ai/save').reply(200, { success: true });

    const prompts = ['test1', 'test2', 'test3'];
    const results = client.batchProcess(prompts);

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(results).toHaveLength(3);
    expect(results[0]).toBe('Processed: test1');
    expect(results[1]).toBe('Processed: test2');
    expect(results[2]).toBe('Processed: test3');
  });
}); 