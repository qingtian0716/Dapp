// 导入路由配置
import { routes } from '../routes/index.js';
// 导入工具函数
import { showToast } from '../script.js';

// 路由管理器
export class Router {
    constructor() {
        this.currentRoute = null;
        this.routes = routes;
        this.redirectCount = 0;
        this.maxRedirects = 10;

        // 监听浏览器前进后退事件
        window.addEventListener('popstate', (event) => {
            this.handleRoute(event.state?.path || window.location.pathname);
        });
    }

    // 初始化路由
    init() {
        // 获取当前路径
        const path = window.location.pathname;
        this.handleRoute(path);
    }

    // 路由守卫
    checkAuth(route, userRole) {
        if (route.requireAuth) {
            const token = localStorage.getItem('jwtToken');
            const currentPath = window.location.pathname;
            
            // 检查用户是否已登录
            if (!token || !userRole) {
                return {
                    allowed: false,
                    redirectTo: `/login?redirect=${encodeURIComponent(currentPath)}`,
                    message: '请先登录'
                };
            }
            // 检查用户角色权限
            if (route.role && route.role !== userRole) {
                return {
                    allowed: false,
                    redirectTo: '/error',
                    message: '无权访问该页面'
                };
            }
        }
        return {
            allowed: true
        };
    }

    // 处理路由跳转
    async handleRoute(path) {
        try {
            // 检查重定向次数
            if (this.redirectCount >= this.maxRedirects) {
                console.error('检测到过多重定向，停止路由处理');
                this.redirectCount = 0;
                throw new Error('检测到过多重定向');
            }

            // 修改路径处理逻辑
            const normalizedPath = path.replace(/^\/html\/?/, '/').replace(/\.html$/, '');
            
            // 特殊处理根路径
            if (normalizedPath === '/') {
                const route = this.routes.root;
                if (route) {
                    // 直接加载index.html
                    const componentPath = `/html/index.html`;
                    const response = await fetch(componentPath);
                    
                    if (!response.ok) {
                        throw new Error(`加载页面失败: ${response.status}`);
                    }
                    
                    const html = await response.text();
                    const appElement = document.getElementById('app');
                    if (!appElement) {
                        throw new Error('找不到app元素');
                    }
                    
                    appElement.innerHTML = html;
                    this.currentRoute = route;
                    return;
                }
            }

            // 查找匹配的路由
            const route = Object.values(this.routes).find(r => r.path === normalizedPath);
            
            // 处理根路径重定向
            if (normalizedPath === '/' && this.routes.root.redirect) {
                this.redirectCount++;
                await this.navigate(this.routes.root.redirect);
                return;
            }

            // 处理重定向路由
            if (route && route.redirect) {
                this.redirectCount++;
                await this.navigate(route.redirect);
                return;
            }
            
            if (!route) {
                console.error('路由不存在:', normalizedPath);
                if (path !== '/error') {
                    this.redirectCount++;
                    showToast('页面不存在', 'error');
                    await this.navigate('/error');
                }
                return;
            }

            // 获取用户角色
            const userRole = localStorage.getItem('userRole');

            // 检查权限
            const authCheck = this.checkAuth(route, userRole);
            if (!authCheck.allowed) {
                console.log('权限验证失败:', authCheck.message);
                if (path !== '/error' && path !== '/login') {
                    this.redirectCount++;
                    await this.navigate(authCheck.redirectTo);
                    return;
                }
            }

            // 加载页面组件
            const componentPath = `/html/${route.component}.html`;
            const response = await fetch(componentPath);
            
            if (!response.ok) {
                throw new Error(`加载页面失败: ${response.status}`);
            }
            
            const html = await response.text();
            
            // 更新页面内容
            const appElement = document.getElementById('app');
            if (!appElement) {
                throw new Error('找不到app元素');
            }
            
            // 更新页面状态
            appElement.innerHTML = html;
            document.title = route.component.charAt(0).toUpperCase() + route.component.slice(1);
            this.currentRoute = route;

            // 加载组件对应的脚本
            if (route.script) {
                const script = document.createElement('script');
                script.src = route.script;
                script.type = 'module';
                document.body.appendChild(script);
            }
            
            // 更新URL，避免重复的历史记录
            if (window.location.pathname !== path) {
                window.history.pushState({ path }, '', path);
            }
            
            // 触发页面加载完成事件
            window.dispatchEvent(new CustomEvent('routeChanged', { detail: { path, route } }));
            
        } catch (error) {
            console.error('路由处理失败:', error);
            showToast(error.message || '页面加载失败，请重试', 'error');
            if (path !== '/error') {
                this.redirectCount++;
                await this.navigate('/error');
            }
        } finally {
            // 如果当前路由加载成功，重置重定向计数器
            if (this.currentRoute && this.currentRoute.path === path) {
                this.redirectCount = 0;
            }
        }
    }

    // 路由导航
    async navigate(path) {
        console.log(`Navigating to: ${path}`);
        await this.handleRoute(path);
    }
}

// 创建路由实例
const router = new Router();

// 导出路由实例
export { router };

// 添加DOM加载完成事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 初始化路由
    router.init();
    window.addEventListener('popstate', () => router.handleRoute(window.location.pathname));
});
