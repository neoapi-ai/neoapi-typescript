export class NeoApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NeoApiError';
    }
  }
  