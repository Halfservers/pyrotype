type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

class Logger {
  private level: number

  constructor(level: LogLevel = 'info') {
    this.level = LEVELS[level]
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (this.level <= LEVELS.debug) this.log('DEBUG', message, meta)
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (this.level <= LEVELS.info) this.log('INFO', message, meta)
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (this.level <= LEVELS.warn) this.log('WARN', message, meta)
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (this.level <= LEVELS.error) this.log('ERROR', message, meta)
  }

  private log(level: string, message: string, meta?: Record<string, unknown>) {
    const entry = { level, message, timestamp: new Date().toISOString(), ...meta }
    if (level === 'ERROR') {
      console.error(JSON.stringify(entry))
    } else {
      console.log(JSON.stringify(entry))
    }
  }
}

export const logger = new Logger('debug')
