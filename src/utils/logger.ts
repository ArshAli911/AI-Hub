interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class LoggerService {
  private currentLevel: number = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
  private enabledCategories: Set<string> = new Set();

  setLevel(level: keyof LogLevel): void {
    this.currentLevel = LOG_LEVELS[level];
  }

  enableCategory(category: string): void {
    this.enabledCategories.add(category);
  }

  disableCategory(category: string): void {
    this.enabledCategories.delete(category);
  }

  private shouldLog(level: number, category?: string): boolean {
    if (level < this.currentLevel) {
      return false;
    }

    if (category && this.enabledCategories.size > 0) {
      return this.enabledCategories.has(category);
    }

    return true;
  }

  private formatMessage(level: string, message: string, data?: any, category?: string): string {
    const timestamp = new Date().toISOString();
    const categoryStr = category ? `[${category}]` : '';
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    
    return `[${timestamp}] ${level} ${categoryStr} ${message}${dataStr}`;
  }

  debug(message: string, data?: any, category?: string): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG, category)) {
      console.log(this.formatMessage('DEBUG', message, data, category));
    }
  }

  info(message: string, data?: any, category?: string): void {
    if (this.shouldLog(LOG_LEVELS.INFO, category)) {
      console.info(this.formatMessage('INFO', message, data, category));
    }
  }

  warn(message: string, data?: any, category?: string): void {
    if (this.shouldLog(LOG_LEVELS.WARN, category)) {
      console.warn(this.formatMessage('WARN', message, data, category));
    }
  }

  error(message: string, error?: any, data?: any, category?: string): void {
    if (this.shouldLog(LOG_LEVELS.ERROR, category)) {
      const errorData = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...data
      } : { error, ...data };
      
      console.error(this.formatMessage('ERROR', message, errorData, category));
    }
  }

  group(label: string): void {
    if (__DEV__) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (__DEV__) {
      console.groupEnd();
    }
  }

  time(label: string): void {
    if (__DEV__) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (__DEV__) {
      console.timeEnd(label);
    }
  }
}

export const Logger = new LoggerService();
export const logger = Logger; // For backward compatibility
export default Logger;