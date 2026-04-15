/**
 * Logger Utility
 * src/server/utils/logger.ts
 * 
 * Centralized logging with consistent formatting
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

/**
 * Simple logger with console and file output
 */
export const logger = {
  debug: (message: string, data?: any) => log('debug', message, data),
  info: (message: string, data?: any) => log('info', message, data),
  warn: (message: string, data?: any) => log('warn', message, data),
  error: (message: string, data?: any) => log('error', message, data),
};

function log(level: LogLevel, message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(data && { data }),
  };

  const logMessage = formatLog(entry);

  // Console output
  const consoleMethod = level === 'error' ? console.error : console.log;
  consoleMethod(logMessage);

  // File output (in production)
  if (process.env.NODE_ENV === 'production') {
    appendToFile(logMessage);
  }
}

function formatLog(entry: LogEntry): string {
  const { timestamp, level, message, data } = entry;
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] ${level}: ${message}${dataStr}`;
}

function appendToFile(message: string): void {
  try {
    const logFile = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, message + '\n', 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}
