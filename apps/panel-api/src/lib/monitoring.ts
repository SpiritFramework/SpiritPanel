/**
 * Monitoring and logging utilities
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  requestId?: string;
  duration?: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  log(level: LogLevel, message: string, context?: Record<string, any>, requestId?: string): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      requestId,
    };

    this.logs.push(entry);

    // Keep memory bounded
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV !== 'production') {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      if (context) {
        console.log(prefix, message, context);
      } else {
        console.log(prefix, message);
      }
    }
  }

  debug(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.DEBUG, message, context, requestId);
  }

  info(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.INFO, message, context, requestId);
  }

  warn(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.WARN, message, context, requestId);
  }

  error(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log(LogLevel.ERROR, message, context, requestId);
  }

  getLogs(filter?: { level?: LogLevel; since?: number }): LogEntry[] {
    return this.logs.filter((log) => {
      if (filter?.level && log.level !== filter.level) return false;
      if (filter?.since && log.timestamp < filter.since) return false;
      return true;
    });
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStats() {
    const now = Date.now();
    const last5min = this.logs.filter((l) => now - l.timestamp < 5 * 60 * 1000);

    return {
      total: this.logs.length,
      last5min: last5min.length,
      errors: this.logs.filter((l) => l.level === LogLevel.ERROR).length,
      warnings: this.logs.filter((l) => l.level === LogLevel.WARN).length,
    };
  }
}

// Singleton instance
export const logger = new Logger();

/** Record an operation duration */
export function recordOperation(
  name: string,
  duration: number,
  requestId?: string,
  success: boolean = true,
): void {
  if (duration > 1000) {
    logger.warn(`Slow operation: ${name} took ${duration}ms`, { duration, success }, requestId);
  } else if (!success) {
    logger.error(`Operation failed: ${name}`, { duration, success }, requestId);
  } else {
    logger.debug(`Operation: ${name}`, { duration }, requestId);
  }
}

/** Monitor a function execution */
export async function monitorAsync<T>(
  name: string,
  fn: () => Promise<T>,
  requestId?: string,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    recordOperation(name, duration, requestId, true);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${name} failed: ${error instanceof Error ? error.message : String(error)}`, {
      error: error instanceof Error ? error.stack : String(error),
      duration,
    }, requestId);
    throw error;
  }
}

/** Monitor synchronous function execution */
export function monitorSync<T>(
  name: string,
  fn: () => T,
  requestId?: string,
): T {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    recordOperation(name, duration, requestId, true);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${name} failed: ${error instanceof Error ? error.message : String(error)}`, {
      error: error instanceof Error ? error.stack : String(error),
      duration,
    }, requestId);
    throw error;
  }
}

/** Alert on critical issues */
export function alertCritical(message: string, context?: Record<string, any>, requestId?: string): void {
  logger.error(`[CRITICAL] ${message}`, context, requestId);

  // In production, could send to alert service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service (e.g., Sentry, DataDog)
    // sendAlert(message, context);
  }
}

/** Health check metrics */
export interface HealthMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  logs: {
    total: number;
    errors: number;
    warnings: number;
  };
  timestamp: number;
}

export function getHealthMetrics(): HealthMetrics {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    logs: {
      total: logger.getLogs().length,
      errors: logger.getLogs({ level: LogLevel.ERROR }).length,
      warnings: logger.getLogs({ level: LogLevel.WARN }).length,
    },
    timestamp: Date.now(),
  };
}
