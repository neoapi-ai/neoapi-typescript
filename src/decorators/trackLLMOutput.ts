import { NeoApiClientAsync } from '../clients/NeoApiClientAsync';
import { LLMOutput } from '../models/LLMOutput';

export function trackLLMOutput(options: {
  client: NeoApiClientAsync;
  project?: string;
  group?: string;
  analysisSlug?: string | null;
  needAnalysisResponse?: boolean;
  formatJsonOutput?: boolean;
  metadata?: Record<string, any> | null;
  saveText?: boolean;
}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const isAsync = originalMethod.constructor.name === 'AsyncFunction';

    if (isAsync) {
      descriptor.value = async function(...args: any[]) {
        let result: any;
        try {
          result = await originalMethod.apply(this, args);
        } catch (error) {
          console.error(`Error in function '${propertyKey}':`, error);
          throw error;
        }

        const llmOutput: LLMOutput = {
          model: 'unknown',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0.0,
          response: result,
          text: typeof result === 'string' ? result : JSON.stringify(result),
          timestamp: Date.now(),
          project: options.project || 'default_project',
          group: options.group || 'default_group',
          analysisSlug: options.analysisSlug || null,
          needAnalysisResponse: options.needAnalysisResponse || false,
          formatJsonOutput: options.formatJsonOutput || false,
          metadata: options.metadata || null,
          saveText: options.saveText !== undefined ? options.saveText : true,
        };

        await options.client.track(llmOutput);

        return result;
      };
    } else {
      descriptor.value = function(...args: any[]) {
        let result: any;
        try {
          result = originalMethod.apply(this, args);
        } catch (error) {
          console.error(`Error in function '${propertyKey}':`, error);
          throw error;
        }

        const llmOutput: LLMOutput = {
          model: 'unknown',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0.0,
          response: result,
          text: typeof result === 'string' ? result : JSON.stringify(result),
          timestamp: Date.now(),
          project: options.project || 'default_project',
          group: options.group || 'default_group',
          analysisSlug: options.analysisSlug || null,
          needAnalysisResponse: options.needAnalysisResponse || false,
          formatJsonOutput: options.formatJsonOutput || false,
          metadata: options.metadata || null,
          saveText: options.saveText !== undefined ? options.saveText : true,
        };

        options.client.track(llmOutput);

        return result;
      };
    }
  };
}
