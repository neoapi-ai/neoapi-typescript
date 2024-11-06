import { NeoApiClientAsync } from '../clients/NeoApiClientAsync';
import { trackLLMOutput } from '../decorators/trackLLMOutput';
import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';

describe('trackLLMOutput decorator', () => {
  let client: NeoApiClientAsync;

  beforeEach(() => {
    process.env.NEOAPI_API_KEY = 'test-api-key';
    client = new NeoApiClientAsync({});
    jest.spyOn(client, 'track').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('tracks sync function output', () => {
    class TestClass {
      // @ts-ignore
      @trackLLMOutput({
        client,
        project: 'test',
        group: 'test'
      })
      testMethod() {
        return 'test result';
      }
    }

    const instance = new TestClass();
    const result = instance.testMethod();

    expect(result).toBe('test result');
    expect(client.track).toHaveBeenCalled();
  });

  test('tracks async function output', async () => {
    class TestClass {
      // @ts-ignore
      @trackLLMOutput({
        client,
        project: 'test',
        group: 'test'
      })
      async testMethod() {
        return 'test result';
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod();

    expect(result).toBe('test result');
    expect(client.track).toHaveBeenCalled();
  });
}); 