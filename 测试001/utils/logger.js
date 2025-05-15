// 日志管理工具
export class Logger {
    static levels = {
        DEBUG: 'debug',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error'
    };

    static config = {
        level: 'info',
        enableConsole: true,
        enableTimestamp: true,
        enableStackTrace: true
    };

    static setConfig(config) {
        Object.assign(this.config, config);
    }

    static formatMessage(level, message, meta = {}) {
        const timestamp = this.config.enableTimestamp ? new Date().toISOString() : '';
        const prefix = `[${level.toUpperCase()}]${timestamp ? ` ${timestamp}` : ''}`;
        
        let formattedMessage = `${prefix}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            formattedMessage += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
        }

        if (this.config.enableStackTrace && level === this.levels.ERROR) {
            const stack = new Error().stack;
            formattedMessage += `\nStack Trace:\n${stack}`;
        }

        return formattedMessage;
    }

    static shouldLog(level) {
        const levels = Object.values(this.levels);
        const configLevelIndex = levels.indexOf(this.config.level);
        const currentLevelIndex = levels.indexOf(level);
        return currentLevelIndex >= configLevelIndex;
    }

    static log(level, message, meta = {}) {
        if (!this.shouldLog(level) || !this.config.enableConsole) return;

        const formattedMessage = this.formatMessage(level, message, meta);
        
        switch (level) {
            case this.levels.DEBUG:
                console.debug(formattedMessage);
                break;
            case this.levels.INFO:
                console.info(formattedMessage);
                break;
            case this.levels.WARN:
                console.warn(formattedMessage);
                break;
            case this.levels.ERROR:
                console.error(formattedMessage);
                break;
        }
    }

    static debug(message, meta = {}) {
        this.log(this.levels.DEBUG, message, meta);
    }

    static info(message, meta = {}) {
        this.log(this.levels.INFO, message, meta);
    }

    static warn(message, meta = {}) {
        this.log(this.levels.WARN, message, meta);
    }

    static error(message, meta = {}) {
        this.log(this.levels.ERROR, message, meta);
    }

    // 组件生命周期日志
    static logLifecycle(componentName, hook, meta = {}) {
        this.debug(`Component ${componentName} - ${hook}`, meta);
    }

    // 组件错误日志
    static logComponentError(componentName, error, meta = {}) {
        this.error(`Component ${componentName} Error: ${error.message}`, {
            ...meta,
            componentName,
            errorName: error.name,
            errorStack: error.stack
        });
    }
}