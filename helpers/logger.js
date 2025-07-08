/**
 * Copyright 2025 Perfana Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const winston = require('winston');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Define colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Create custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Create custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || 'info';

// Create logger configuration
const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel,
  format: fileFormat,
  defaultMeta: { service: 'perfana-grafana' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  ]
});

// Add file transport in production or when LOG_FILE is specified
if (process.env.NODE_ENV === 'production' || process.env.LOG_FILE) {
  try {
    const logFile = process.env.LOG_FILE || 'logs/perfana-grafana.log';
    
    logger.add(new winston.transports.File({
      filename: logFile,
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }));

    // Add error log file
    logger.add(new winston.transports.File({
      filename: process.env.ERROR_LOG_FILE || 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }));
  } catch (error) {
    // Fallback to console-only logging if file logging fails
    console.warn('Warning: Could not initialize file logging, falling back to console only:', error.message);
  }
}

// Create a stream for Morgan (if needed for HTTP logging)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Helper methods for common logging patterns
logger.logSync = (message, grafanaInstance = null) => {
  const instanceInfo = grafanaInstance ? ` [${grafanaInstance.label || grafanaInstance.name}]` : '';
  logger.info(`${message}${instanceInfo}`);
};

logger.logError = (error, context = '') => {
  const contextInfo = context ? ` - Context: ${context}` : '';
  if (error instanceof Error) {
    logger.error(`${error.message}${contextInfo}`, { stack: error.stack });
  } else {
    logger.error(`${error}${contextInfo}`);
  }
};

logger.logDashboard = (action, dashboard, grafanaInstance = null) => {
  const instanceInfo = grafanaInstance ? ` [${grafanaInstance.label || grafanaInstance.name}]` : '';
  const dashboardInfo = dashboard.title || dashboard.uid || 'Unknown Dashboard';
  logger.info(`${action}: ${dashboardInfo}${instanceInfo}`);
};

logger.logDatabase = (action, success = true, details = '') => {
  const level = success ? 'info' : 'error';
  const status = success ? 'SUCCESS' : 'FAILED';
  logger[level](`Database ${action} - ${status}${details ? `: ${details}` : ''}`);
};

module.exports = logger; 