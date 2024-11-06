import axios, { AxiosInstance } from 'axios';
import { LLMOutput } from '../models/LLMOutput';
import { NeoApiError } from '../exceptions/NeoApiError';

export class NeoApiClientSync {
  private apiKey: string;
  private apiUrl: string;
  private batchSize: number;
  private flushInterval: number;
  private maxRetries: number;
  private checkFrequency: number;
  private queue: LLMOutput[];
  private axiosInstance: AxiosInstance;
  private flushTimer: NodeJS.Timeout | null;
  private running: boolean;

  constructor(options: {
    apiKey?: string;
    apiUrl?: string;
    batchSize?: number;
    flushInterval?: number;
    maxRetries?: number;
    checkFrequency?: number;
  }) {
    this.apiKey = options.apiKey || process.env.NEOAPI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('API key must be provided either directly or through NEOAPI_API_KEY environment variable.');
    }

    this.apiUrl = options.apiUrl || process.env.NEOAPI_API_URL || 'https://api.neoapi.ai';
    this.batchSize = options.batchSize || 10;
    this.flushInterval = options.flushInterval || 5000; // in milliseconds
    this.maxRetries = options.maxRetries || 3;
    this.checkFrequency = options.checkFrequency || 1;
    this.queue = [];
    this.flushTimer = null;
    this.running = false;

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.start();
  }

  public start() {
    if (this.running) return;

    this.running = true;
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  public stop() {
    if (!this.running) return;

    this.running = false;
    if (this.flushTimer) clearInterval(this.flushTimer);

    this.flush();
  }

  public track(llmOutput: LLMOutput) {
    this.queue.push(llmOutput);
    if (this.queue.length >= this.batchSize) {
      const batch = [...this.queue];
      this.queue = [];
      this.sendBatch(batch);
    }
  }

  public flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];
    this.sendBatch(batch);
  }

  private async sendBatch(batch: LLMOutput[]) {
    const tasks = batch.map((item, index) => {
      if (index % this.checkFrequency === 0) {
        const endpoint = item.needAnalysisResponse ? '/analyze' : '/save';
        return this.postItem(endpoint, item);
      }
    }).filter(task => task !== undefined);

    try {
      await Promise.all(tasks);
    } catch (error) {
      console.error('Error sending batch:', error);
      // Re-queue items that failed to send
      this.queue.push(...batch);
    }
  }

  private async postItem(endpoint: string, item: LLMOutput) {
    const url = `${endpoint}`;
    const payload = item;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.post(url, payload);
        if (item.needAnalysisResponse) {
          // Handle analysis response
          const analysisResponse = response.data;
          if (item.formatJsonOutput) {
            console.log('Analysis Response:', JSON.stringify(analysisResponse, null, 2));
          } else {
            console.log('Analysis Response:', analysisResponse);
          }
        }
        break; // Exit retry loop on success
      } catch (error: any) {
        if (attempt === this.maxRetries) {
          throw new NeoApiError(`Failed to send item after ${this.maxRetries} attempts: ${error.message}`);
        } else {
          console.warn(`Retrying send (${attempt}/${this.maxRetries})...`);
          await this.delay(this.getBackoffDelay(attempt));
        }
      }
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getBackoffDelay(attempt: number) {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  public batchProcess(
    prompts: string[],
    options: {
      needAnalysisResponse?: boolean;
      formatJsonOutput?: boolean;
      project?: string;
      group?: string;
      analysisSlug?: string | null;
      metadata?: Record<string, any> | null;
      saveText?: boolean;
    } = {}
  ): string[] {
    const results: string[] = [];

    prompts.forEach(prompt => {
      // Simulate processing prompt
      const result = this.processPrompt(prompt);

      const llmOutput: LLMOutput = {
        model: 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0.0,
        response: result,
        text: result,
        timestamp: Date.now(),
        project: options.project || 'default_project',
        group: options.group || 'default_group',
        analysisSlug: options.analysisSlug || null,
        needAnalysisResponse: options.needAnalysisResponse || false,
        formatJsonOutput: options.formatJsonOutput || false,
        metadata: options.metadata || null,
        saveText: options.saveText !== undefined ? options.saveText : true,
      };

      this.track(llmOutput);
      results.push(result);
    });

    return results;
  }

  private processPrompt(prompt: string): string {
    // Placeholder for actual LLM processing logic
    return `Processed: ${prompt}`;
  }

  public static fromEnv(options: Partial<{
    apiKey?: string;
    apiUrl?: string;
    batchSize?: number;
    flushInterval?: number;
    maxRetries?: number;
    checkFrequency?: number;
  }> = {}): NeoApiClientSync {
    return new NeoApiClientSync(options);
  }
}
