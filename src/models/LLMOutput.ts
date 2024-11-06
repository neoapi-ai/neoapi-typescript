export interface LLMOutput {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cost?: number;
    response?: any;
    text: string;
    timestamp: number;
    project?: string;
    group?: string;
    analysisSlug?: string | null;
    metadata?: Record<string, any> | null;
    needAnalysisResponse?: boolean;
    formatJsonOutput?: boolean;
    saveText?: boolean;
  }
  