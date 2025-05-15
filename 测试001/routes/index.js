const routes = {
    root: {
        path: '/',
        component: 'index',
        script: '../script.js',
        requireAuth: false
    },
    // index: {
    //     path: '/index',
    //     component: 'index',
    //     script: '../script.js'
    // },
    login: {
        path: '/login',
        component: 'login',
        script: '../scripts/login.js'
    },
    student: {
        path: '/student',
        component: 'student',
        script: '../scripts/student.js',
        requireAuth: true
    },
    teacher: {
        path: '/teacher',
        component: 'teacher',
        script: '../scripts/teacher.js',
        requireAuth: true,
    },
    admin: {
        path: '/admin',
        component: 'admin',
        script: '../scripts/admin.js',
        requireAuth: true,
      
    },
    error: {
        path: '/error',
        script: null,
        component: 'error',
        auth: false
    }
};

// 路由守卫
const routeGuard = (route, userRole) => {
    // 检查路由是否存在且需要认证
    if (route && route.requiresAuth) {
        const token = localStorage.getItem('jwtToken');
        const currentPath = window.location.pathname; // 获取当前路径用于重定向

        // 检查 token 是否存在
        if (!token) {
            console.log(`路由守卫: ${route.path || '未知路由'} 需要认证，但未找到 token。重定向到登录页。`);
            return {
                allowed: false,
                // 传递当前路径，以便登录后可以重定向回来
                redirectTo: `/login?redirect=${encodeURIComponent(currentPath)}`,
                message: '请先登录'
            };
        }

        // 检查角色权限 (如果路由定义了角色要求)
        if (route.role) {
            // 检查 localStorage 中是否有 userRole
            if (!userRole) {
                 console.log(`路由守卫: ${route.path} 需要角色 ${route.role}，但 localStorage 中未找到 userRole。`);
                 return {
                     allowed: false,
                     redirectTo: '/error', // 或者重定向到登录页？
                     message: '用户角色信息缺失，请重新登录'
                 };
            }
            // 检查角色是否匹配
            if (route.role !== userRole) {
                console.log(`路由守卫: ${route.path} 需要角色 ${route.role}，但用户角色为 ${userRole}。拒绝访问。`);
                return {
                    allowed: false,
                    redirectTo: '/error', // 重定向到错误页或权限不足提示页
                    message: `无权访问该页面，需要 ${route.role} 角色`
                };
            }
        }
        // 如果需要认证，且 token 存在，且角色检查通过（或不需要角色检查）
        console.log(`路由守卫: ${route.path || '未知路由'} 认证和角色检查通过。`);
        return { allowed: true };
    }

    // 如果路由不需要认证，则直接允许
    console.log(`路由守卫: ${route?.path || '未知路由'} 不需要认证。允许访问。`);
    return { allowed: true };
};

export {
    routes,
    routeGuard
};