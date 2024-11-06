export class Logger {
    public static info(message: string) {
      console.info(`[INFO]: ${message}`);
    }
  
    public static warn(message: string) {
      console.warn(`[WARN]: ${message}`);
    }
  
    public static error(message: string) {
      console.error(`[ERROR]: ${message}`);
    }
  
    public static debug(message: string) {
      console.debug(`[DEBUG]: ${message}`);
    }
  }
  