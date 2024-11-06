import axios, { AxiosInstance } from 'axios';
import { LLMOutput } from '../models/LLMOutput';
import { EventEmitter } from 'events';

export class NeoApiClientAsync extends EventEmitter {
  private apiKey: string;
  private apiUrl: string;
  private batchSize: number;
  private flushInterval: number;
  private maxBatchSize: number;
  private minBatchSize: number;
  private maxFlushInterval: number;
  private minFlushInterval: number;
  private maxRetries: number;
  private checkFrequency: number;
  private adjustmentInterval: number;
  private queue: LLMOutput[];
  private axiosInstance: AxiosInstance;
  private flushTimer: NodeJS.Timeout | null;
  private adjustmentTimer: NodeJS.Timeout | null;
  private running: boolean;

  constructor(options: {
    apiKey?: string;
    apiUrl?: string;
    initialBatchSize?: number;
    initialFlushInterval?: number;
    maxBatchSize?: number;
    minBatchSize?: number;
    maxFlushInterval?: number;
    minFlushInterval?: number;
    maxRetries?: number;
    checkFrequency?: number;
    adjustmentInterval?: number;
  }) {
    super();

    this.apiKey = options.apiKey || process.env.NEOAPI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('API key must be provided either directly or through NEOAPI_API_KEY environment variable.');
    }

    this.apiUrl = options.apiUrl || process.env.NEOAPI_API_URL || 'https://api.neoapi.ai';
    this.batchSize = options.initialBatchSize || 10;
    this.flushInterval = options.initialFlushInterval || 5.0;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.minBatchSize = options.minBatchSize || 5;
    this.maxFlushInterval = options.maxFlushInterval || 10.0;
    this.minFlushInterval = options.minFlushInterval || 1.0;
    this.maxRetries = options.maxRetries || 3;
    this.checkFrequency = options.checkFrequency || 1;
    this.adjustmentInterval = options.adjustmentInterval || 2.0;
    this.queue = [];
    this.flushTimer = null;
    this.adjustmentTimer = null;
    this.running = false;

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  public start() {
    if (this.running) return;

    this.running = true;
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval * 1000);
    this.adjustmentTimer = setInterval(() => this.dynamicAdjustment(), this.adjustmentInterval * 1000);
  }

  public stop() {
    if (!this.running) return;

    this.running = false;
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.adjustmentTimer) clearInterval(this.adjustmentTimer);

    this.flush();
  }

  public async track(llmOutput: LLMOutput) {
    this.queue.push(llmOutput);
    if (this.queue.length >= this.batchSize) {
      const batch = [...this.queue];
      this.queue = [];
      await this.sendBatch(batch);
    }
  }

  public async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];
    await this.sendBatch(batch);
  }

  private async sendBatch(batch: LLMOutput[]) {
    const tasks = batch.map((item, index) => {
      if (index % this.checkFrequency === 0) {
        const endpoint = item.needAnalysisResponse ? '/analyze' : '/save';
        return this.postItem(endpoint, item);
      }
    });

    // Filter out undefined tasks
    const filteredTasks = tasks.filter(task => task !== undefined);

    await Promise.all(filteredTasks);
  }

  private async postItem(endpoint: string, item: LLMOutput) {
    const url = `${this.apiUrl}${endpoint}`;
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
      } catch (error) {
        if (attempt === this.maxRetries) {
          console.error(`Failed to send item after ${this.maxRetries} attempts:`, error);
        } else {
          console.warn(`Retrying send (${attempt}/${this.maxRetries})...`);
          await this.delay(this.getBackoffDelay(attempt));
        }
      }
    }
  }

  private dynamicAdjustment() {
    const queueLength = this.queue.length;

    if (queueLength > this.batchSize * 1.5 && this.batchSize < this.maxBatchSize) {
      this.batchSize += 5;
    } else if (queueLength < this.batchSize * 0.5 && this.batchSize > this.minBatchSize) {
      this.batchSize -= 5;
    }

    if (queueLength > this.batchSize * 2 && this.flushInterval > this.minFlushInterval) {
      this.flushInterval = Math.max(this.flushInterval - 0.5, this.minFlushInterval);
    } else if (queueLength < this.batchSize && this.flushInterval < this.maxFlushInterval) {
      this.flushInterval = Math.min(this.flushInterval + 0.5, this.maxFlushInterval);
    }

    // Adjust timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = setInterval(() => this.flush(), this.flushInterval * 1000);
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getBackoffDelay(attempt: number) {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
}
