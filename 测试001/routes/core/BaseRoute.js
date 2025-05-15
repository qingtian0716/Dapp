// 基础路由类
export class BaseRoute {
    constructor(config = {}) {
        this.path = config.path;
        this.role = config.role;
        this.component = config.component;
        this.guards = config.guards || [];
        this.params = config.params || {};
        this.middlewares = config.middlewares || [];
    }

    // 路由守卫检查
    async checkGuards(context) {
        for (const guard of this.guards) {
            const result = await guard(context);
            if (!result.allowed) {
                throw new Error(result.message || '路由访问被拒绝');
            }
        }
        return true;
    }

    // 中间件处理
    async applyMiddlewares(req, res, next) {
        try {
            for (const middleware of this.middlewares) {
                await new Promise((resolve, reject) => {
                    middleware(req, res, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            }
            next();
        } catch (error) {
            next(error);
        }
    }

    // 参数验证
    validateParams(params) {
        const errors = [];
        Object.entries(this.params).forEach(([key, rules]) => {
            if (rules.required && !params[key]) {
                errors.push(`缺少必需参数: ${key}`);
            }
            if (rules.type && params[key] && typeof params[key] !== rules.type) {
                errors.push(`参数 ${key} 类型错误，期望 ${rules.type}`);
            }
            if (rules.validate && !rules.validate(params[key])) {
                errors.push(`参数 ${key} 验证失败`);
            }
        });
        return errors;
    }

    // 角色验证
    checkRole(userRole) {
        if (!this.role) return true;
        if (Array.isArray(this.role)) {
            return this.role.includes(userRole);
        }
        return this.role === userRole;
    }

    // 路由处理
    async handle(req, res, next) {
        try {
            // 应用中间件
            await this.applyMiddlewares(req, res, next);

            // 验证参数
            const paramErrors = this.validateParams(req.params);
            if (paramErrors.length > 0) {
                throw new Error(paramErrors.join(', '));
            }

            // 检查角色权限
            if (!this.checkRole(req.user?.role)) {
                throw new Error('无访问权限');
            }

            // 检查路由守卫
            await this.checkGuards({
                req,
                res,
                user: req.user,
                params: req.params
            });

            // 渲染组件
            if (this.component) {
                await this.component.render(req, res);
            }
        } catch (error) {
            next(error);
        }
    }
}