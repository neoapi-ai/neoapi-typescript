export class Config {
    public static API_KEY: string = process.env.NEOAPI_API_KEY || '';
    public static API_URL: string = process.env.NEOAPI_API_URL || 'https://api.neoapi.ai';
  }
  