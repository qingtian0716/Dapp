// 组件配置管理
const componentConfig = {
    // 组件生命周期钩子配置
    lifecycleHooks: {
        beforeCreate: true,
        created: true,
        beforeMount: true,
        mounted: true,
        beforeUpdate: true,
        updated: true,
        beforeDestroy: true,
        destroyed: true
    },

    // 组件验证规则
    validationRules: {
        name: {
            required: true,
            type: 'string',
            minLength: 2
        },
        template: {
            required: true,
            type: 'string'
        },
        events: {
            type: 'object'
        },
        props: {
            type: 'object'
        }
    },

    // 错误处理配置
    errorHandling: {
        logErrors: true,
        throwOnMissingRequired: true,
        errorCallback: null
    },

    // 默认组件配置
    defaultConfig: {
        name: '',
        template: '',
        events: {},
        props: {}
    },

    // 渲染配置
    renderConfig: {
        asyncRender: false,
        renderDelay: 0,
        useVirtualDOM: false
    }
};

// 组件验证工具
class ComponentValidator {
    static validate(config, rules = componentConfig.validationRules) {
        const errors = [];
        
        Object.entries(rules).forEach(([key, rule]) => {
            if (rule.required && !config[key]) {
                errors.push(`Missing required field: ${key}`);
            }
            if (config[key] && rule.type && typeof config[key] !== rule.type) {
                errors.push(`Invalid type for ${key}: expected ${rule.type}`);
            }
            if (config[key] && rule.minLength && config[key].length < rule.minLength) {
                errors.push(`${key} length should be at least ${rule.minLength}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// 组件错误处理工具
class ComponentErrorHandler {
    static handleError(error, config = componentConfig.errorHandling) {
        if (config.logErrors) {
            console.error('[Component Error]:', error);
        }

        if (config.errorCallback && typeof config.errorCallback === 'function') {
            config.errorCallback(error);
        }

        if (config.throwOnMissingRequired) {
            throw error;
        }
    }
}

export {
  componentConfig,
  ComponentValidator,
  ComponentErrorHandler
};