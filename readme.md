# NeoAPI SDK

Integrate [neoapi.ai](https://www.neoapi.ai) LLM Analytics with your LLM pipelines.

## Features

- **Asynchronous and Synchronous Clients:** Choose between async (`NeoApiClientAsync`) and sync (`NeoApiClientSync`) clients
- **Batching:** Automatically batches LLM outputs to optimize API calls
- **Retry Logic:** Robust retry mechanisms for failed API requests
- **Dynamic Adjustment:** Automatically adjusts batch sizes and flush intervals based on load
- **Decorators:** Easily track LLM outputs by decorating your functions

## Quick Start

```bash
# Install the package
npm install neoapi-sdk

# Set your API key
export NEOAPI_API_KEY='your_api_key'
```

```typescript
import { NeoApiClientAsync } from 'neoapi-sdk';

// Initialize and start the client
const client = new NeoApiClientAsync({});
client.start();

// Track LLM outputs
await client.track({
  text: 'LLM response',
  timestamp: Date.now(),
  project: 'my_project'
});

// Stop when done
client.stop();
```

## Usage

### Configuration Options

- **Environment Variables:**
  - `NEOAPI_API_KEY`: Your NeoAPI API key
  - `NEOAPI_API_URL`: (Optional) API endpoint URL. Defaults to `https://api.neoapi.ai`

- **Client Options:**
  ```typescript
  {
    apiKey?: string;              // API key (overrides env var)
    apiUrl?: string;              // API URL (overrides env var)
    batchSize?: number;           // Number of items per batch
    flushInterval?: number;       // Interval between flushes
    maxRetries?: number;          // Max retry attempts
    checkFrequency?: number;      // Frequency of health checks
  }
  ```

### Integration Examples

#### With OpenAI
```typescript
import { Configuration, OpenAIApi } from 'openai';
import { NeoApiClientAsync, trackLLMOutput } from 'neoapi-sdk';

const client = new NeoApiClientAsync({});
client.start();

class ChatService {
  private openai: OpenAIApi;

  constructor() {
    this.openai = new OpenAIApi(
      new Configuration({ apiKey: process.env.OPENAI_API_KEY })
    );
  }

  @trackLLMOutput({
    client,
    project: 'chatbot',
    group: 'customer_service'
  })
  async chat(prompt: string) {
    const response = await this.openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    });
    return response.data.choices[0].message?.content;
  }
}
```

### Batch Processing

```typescript
const prompts = [
  'What is the capital of France?',
  'Explain quantum computing.',
];

const results = client.batchProcess(prompts, {
  needAnalysisResponse: true,
  project: 'science_project',
  group: 'research_group',
});
```

## Best Practices

### Error Handling
```typescript
try {
  await client.track(llmOutput);
} catch (error) {
  if (error instanceof NeoApiError) {
    logger.error('API Error:', error.message);
  } else {
    logger.error('Unexpected error:', error);
  }
}
```

### Client Lifecycle
```typescript
// Initialize at startup
const client = new NeoApiClientAsync({});
client.start();

// Handle shutdown
process.on('SIGTERM', async () => {
  await client.flush();
  client.stop();
  process.exit(0);
});
```

## Troubleshooting

### Common Issues

1. **Decorator Type Errors**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

2. **Memory Usage**
```typescript
const client = new NeoApiClientAsync({
  initialBatchSize: 50,    // Increase for throughput
  maxBatchSize: 100,       // Set upper limit
  flushInterval: 5.0       // Adjust frequency (seconds)
});
```

## API Reference

### `NeoApiClientAsync` & `NeoApiClientSync`

Both clients share similar methods:
- `start()`: Starts the client
- `stop()`: Stops the client
- `track(llmOutput: LLMOutput)`: Tracks an LLM output
- `flush()`: Flushes the current queue
- `batchProcess(prompts: string[], options?: BatchOptions)`: Processes multiple prompts

The main difference is that Async client methods return Promises.

### Decorator Options
```typescript
trackLLMOutput({
  client: NeoApiClientAsync | NeoApiClientSync;
  project?: string;
  group?: string;
  analysisSlug?: string;
  needAnalysisResponse?: boolean;
  formatJsonOutput?: boolean;
  metadata?: Record<string, any>;
  saveText?: boolean;
})
```
