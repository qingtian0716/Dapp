// 路由配置
const routeConfig = {
  '/': { auth: false },
  '/login': { auth: false },
  '/admin': { auth: true, role: 'admin' },
  '/teacher': { auth: true, role: 'teacher' },
  '/student': { auth: true, role: 'student' },
  '/error': { auth: false }
};

export class Router {
  constructor() {
      this.routes = routeConfig;
      this.currentRoute = null;
      this.redirectCount = 0;
      this.maxRedirects = 10;
      this.currentPath = sessionStorage.getItem('currentPath') || window.location.pathname;
      this.errorHandler = this.handleError.bind(this);
  }

  // 初始化路由
  init() {
      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.initRouteHandling());
      } else {
          this.initRouteHandling();
      }
      // 添加全局链接点击事件处理
      document.addEventListener('click', (e) => {
          const link = e.target.closest('a');
          if (link && link.href.startsWith(window.location.origin)) {
              e.preventDefault();
              const path = link.pathname;
              this.navigate(path);
          }
      });
  }

  // 初始化路由处理
  initRouteHandling() {
      window.addEventListener('popstate', (event) => {
          this.handleRoute(event.state?.path || window.location.pathname);
      });
      this.handleRoute(this.currentPath);
  }

  // 注册路由
  register(path, config) {
      this.routes[path] = config;
  }

  // 移除页面上可能存在的重复脚本
  removePageScripts() {
      const scripts = document.querySelectorAll('script[data-page-script]');
      scripts.forEach(script => script.parentNode.removeChild(script));
  }

  // 加载页面对应的脚本
  loadPageScript(path) {
      const pageName = path.replace(/^\/+/, '').split('/')[0];
      if (!pageName) return;
      const existingScript = document.querySelector(`script[src="../scripts/${pageName}.js"]`);
      if (existingScript) return;
      try {
          const script = document.createElement('script');
          script.src = `../scripts/${pageName}.js`;
          script.type = 'module';
          script.setAttribute('data-page-script', pageName);
          document.body.appendChild(script);
          console.log(`已加载页面脚本: ${pageName}.js`);
      } catch (error) {
          console.warn(`加载页面脚本失败: ${pageName}.js`, error);
      }
  }

  // 触发路由变更事件
  triggerRouteChanged(path, component) {
      window.dispatchEvent(new CustomEvent('routeChanged', {
          detail: {
              path,
              component
          }
      }));
  }

  // 路由守卫 - 改进版
  checkAuth(path) {
      const route = this.routes[path];
      if (!route) return { allowed: true };
      
      // 不需要认证的路由直接放行
      if (!route.auth) return { allowed: true };
      
      // 从localStorage获取认证信息
      const token = localStorage.getItem('jwtToken');
      const userRole = localStorage.getItem('userRole');
      const walletAddress = localStorage.getItem('walletAddress');
      const currentPath = window.location.pathname;
      
      // 检查JWT令牌、用户角色和钱包地址
      if (!token || !walletAddress) {
          // 排除登录页面本身
          if (currentPath === '/login') return { allowed: true };
          
          return {
              allowed: false,
              redirectTo: `/login?redirect=${encodeURIComponent(currentPath)}`,
              message: '请先连接钱包并登录系统'
          };
      }
      
      // 严格验证角色权限
      if (route.role) {
          if (!userRole) {
              return {
                  allowed: false,
                  redirectTo: '/error',
                  message: '用户角色信息缺失'
              };
          }
          
          if (userRole !== route.role) {
              return {
                  allowed: false,
                  redirectTo: '/error',
                  message: `权限不足: 需要${route.role}角色`,
                  status: 403
              };
          }
      }
      
      return { allowed: true };
  }

  // 处理路由变化
  async handleRoute(path) {
      try {
          if (this.redirectCount >= this.maxRedirects) {
              return this.handleError('检测到过多重定向，已停止路由处理');
          }
          // 移除forceRefresh参数检查，避免不必要的刷新
          if (path === this.currentPath) {
              console.log('路径未变化，不重新加载');
              return;
          }
          let normalizedPath = this.normalizePath(path);
          this.currentPath = normalizedPath;
          sessionStorage.setItem('currentPath', normalizedPath);
          const appElement = document.getElementById('app');
          if (!appElement) {
              return this.handleError('找不到app元素，请确保HTML文件中包含id为app的div元素');
          }
          appElement.innerHTML = '';
          this.removePageScripts();
          const authResult = this.checkAuth(normalizedPath);
          if (!authResult.allowed) {
              return this.navigate(authResult.redirectTo);
          }
          if (normalizedPath === '/') {
              const token = localStorage.getItem('jwtToken');
              const userRole = localStorage.getItem('userRole');
              if (token && userRole === 'admin' && window.location.pathname !== '/admin') {
                  return this.navigate('/admin');
              } else {
                  const response = await fetch('/html/index.html');
                  if (response.ok) {
                      const html = await response.text();
                      appElement.innerHTML = html;
                      this.triggerRouteChanged('/', 'index');
                      return;
                  } else {
                      throw new Error('加载首页失败');
                  }
              }
          }
          const route = this.routes[normalizedPath];
          if (route) {
              try {
                  let htmlPath = `${normalizedPath}.html`;
                  if (normalizedPath === '/') {
                      htmlPath = '/index.html';
                  }
                  const response = await fetch(htmlPath);
                  if (response.ok) {
                      const html = await response.text();
                      appElement.innerHTML = html;
                      this.triggerRouteChanged(normalizedPath, normalizedPath.substring(1));
                      this.loadPageScript(normalizedPath);
                  } else {
                      throw new Error(`页面不存在: ${htmlPath}`);
                  }
              } catch (error) {
                  this.handleError(error.message || '页面加载错误');
              }
          } else {
              let htmlPath = `${normalizedPath}.html`;
              let response;
              try {
                  // 使用相对路径加载HTML文件
                  response = await fetch(htmlPath);
                  
                  // 如果标准路径失败，尝试在html目录下查找
                  if (!response.ok) {
                      const fileName = normalizedPath.split('/').pop() || 'index';
                      const directPath = `/${fileName}.html`;
                      const directResponse = await fetch(directPath);
                      if (directResponse.ok) {
                          response = directResponse;
                          htmlPath = directPath;
                      }
                  }
                  
                  if (response.ok) {
                      const html = await response.text();
                      appElement.innerHTML = html;
                      this.triggerRouteChanged(normalizedPath, normalizedPath.substring(1));
                      const currentPath = window.location.pathname;
                      const normalizedCurrentPath = currentPath.replace(/\.html$/, '');
                      if (normalizedCurrentPath !== normalizedPath) {
                          window.history.replaceState({ path: normalizedPath }, '', normalizedPath);
                      }
                      this.loadPageScript(normalizedPath);
                  } else {
                      throw new Error(`页面不存在: ${htmlPath}`);
                  }
              } catch (error) {
                  this.handleError(error.message || '路由加载失败');
              }
          }
      } catch (error) {
          this.handleError(error.message || '路由处理错误');
      }
  }

  // 导航到指定路径
  async navigate(path) {
      if (!path) {
          console.error('导航路径不能为空');
          return false;
      }
      try {
          if (path === this.currentPath && !path.includes('?forceRefresh=true')) {
              console.log('路径未变化，不重新加载');
              return true;
          }
          window.history.pushState({ path }, '', path);
          await this.handleRoute(path);
          return true;
      } catch (error) {
          console.error('导航错误:', error);
          this.handleError(error.message || '导航错误');
          return false;
      }
  }

  // 获取当前路径
  getCurrentPath() {
      return this.currentPath;
  }

  // 重定向
  redirect(path, message) {
      const url = message ? `${path}?message=${encodeURIComponent(message)}` : path;
      window.location.href = url;
  }

  // 规范化路径
  normalizePath(path) {
      let normalizedPath = path
        .replace(/^\/?html\/?/, '/')
        .replace(/\.html$/, '')
        .replace(/^\/?admin$/, '/admin')
        .replace(/^\/?login$/, '/login')
        .replace(/^\/?teacher$/, '/teacher')
        .replace(/^\/?student$/, '/student');
      return normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath;
  }

  // 统一错误处理方法
  async handleError(message, error = null) {
      console.error('路由错误:', message, error);
      this.redirectCount = 0;
      this.currentRoute = null;
      sessionStorage.setItem('routeError', JSON.stringify({
          message,
          timestamp: new Date().toISOString()
      }));
      try {
          const response = await fetch('/html/error.html');
          if (response.ok) {
              const html = await response.text();
              const appElement = document.getElementById('app');
              if (appElement) {
                  appElement.innerHTML = html;
                  const errorMessage = document.querySelector('.error-message');
                  if (errorMessage) {
                      errorMessage.textContent = message;
                  }
              }
              this.triggerRouteChanged('/error', 'error');
          }
      } catch (err) {
          console.error('加载错误页面失败:', err);
          const appElement = document.getElementById('app');
          if (appElement) {
              appElement.innerHTML = `
                <div class="error-page">
                  <div class="error-container">
                    <h2 class="error-title">系统错误</h2>
                    <p class="error-message">${message}</p>
                    <button onclick="window.location.href='/'">返回首页</button>
                  </div>
                </div>
              `;
          }
      }
  }
}
