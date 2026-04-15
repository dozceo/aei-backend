"use strict";
/**
 * Logger Utility
 * src/server/utils/logger.ts
 *
 * Centralized logging with consistent formatting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_DIR = process.env.LOG_DIR || path_1.default.join(process.cwd(), 'logs');
// Ensure log directory exists
if (!fs_1.default.existsSync(LOG_DIR)) {
    fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
}
/**
 * Simple logger with console and file output
 */
exports.logger = {
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
};
function log(level, message, data) {
    const entry = {
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
function formatLog(entry) {
    const { timestamp, level, message, data } = entry;
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
}
function appendToFile(message) {
    try {
        const logFile = path_1.default.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);
        fs_1.default.appendFileSync(logFile, message + '\n', 'utf8');
    }
    catch (error) {
        console.error('Failed to write to log file:', error);
    }
}
//# sourceMappingURL=logger.js.map