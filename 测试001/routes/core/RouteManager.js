import { Router } from '../router.js';
import { routes, routeGuard } from '../index.js';

export class RouteManager {
    static activeRoutes = new Map();
    static routeHistory = [];
    static maxHistoryLength = 50;

    static async initializeRouter() {
        try {
            const router = new Router();
            await router.init();
            return router;
        } catch (error) {
            console.error('Router initialization failed:', error);
            throw error;
        }
    }

    static async navigateToRoute(path, params = {}) {
        try {
            // 验证路由路径
            if (!path || typeof path !== 'string') {
                throw new Error('Invalid route path');
            }

            // 查找路由配置
            const route = Object.values(routes).find(r => r.path === path);
            if (!route) {
                throw new Error(`Route ${path} not found`);
            }

            // 检查路由权限
            const userRole = localStorage.getItem('userRole');
            const routeCheck = routeGuard(route, userRole);
            if (!routeCheck.allowed) {
                throw new Error(routeCheck.message || 'Access denied');
            }

            // 获取或初始化路由实例
            let router = this.activeRoutes.get('main');
            if (!router) {
                router = await this.initializeRouter();
                this.activeRoutes.set('main', router);
            }

            // 记录路由历史
            this.addToHistory({
                path,
                params,
                timestamp: new Date(),
                userRole
            });

            // 执行导航
            const success = await router.navigate(path, params);
            if (!success) {
                throw new Error(`Navigation to ${path} failed`);
            }

            return true;
        } catch (error) {
            console.error('Navigation error:', error);
            throw error;
        }
    }

    static addToHistory(routeInfo) {
        this.routeHistory.unshift(routeInfo);
        if (this.routeHistory.length > this.maxHistoryLength) {
            this.routeHistory.pop();
        }
    }

    static getRouteHistory() {
        return this.routeHistory;
    }

    static async goBack() {
        try {
            if (this.routeHistory.length < 2) {
                throw new Error('No previous route available');
            }

            // 获取上一个路由信息
            const currentRoute = this.routeHistory[0];
            const previousRoute = this.routeHistory[1];

            // 导航到上一个路由
            await this.navigateToRoute(previousRoute.path, previousRoute.params);

            return true;
        } catch (error) {
            console.error('Go back error:', error);
            throw error;
        }
    }

    static clearHistory() {
        this.routeHistory = [];
    }

    static getActiveRouter() {
        return this.activeRoutes.get('main');
    }

    static async refreshCurrentRoute() {
        try {
            const currentRoute = this.routeHistory[0];
            if (!currentRoute) {
                throw new Error('No current route found');
            }

            await this.navigateToRoute(currentRoute.path, currentRoute.params);
            return true;
        } catch (error) {
            console.error('Route refresh error:', error);
            throw error;
        }
    }

    static getCurrentRoute() {
        return this.routeHistory[0] || null;
    }

    static isActiveRoute(path) {
        const currentRoute = this.getCurrentRoute();
        return currentRoute && currentRoute.path === path;
    }
}