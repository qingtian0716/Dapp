
// Token相关常量
const TOKEN_KEY = 'jwtToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const USER_ROLE_KEY = 'userRole';

// 保存认证信息
function saveAuthInfo(token, refreshToken, expiresIn, role) {
  const expiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  if (role) {
    localStorage.setItem(USER_ROLE_KEY, role);
  }
}

// 获取token
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// 获取refresh token
function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// 获取用户角色
function getUserRole() {
  return localStorage.getItem(USER_ROLE_KEY);
}

// 清除所有认证信息
function clearAuthInfo() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

// 验证token并返回解码后的用户信息
async function validateToken(token) {
  if (!token) {
    throw new Error('未提供认证令牌');
  }

  try {
    // 检查token是否过期
    if (isTokenExpired()) {
      // 尝试刷新token
      await refreshAuthToken();
      // 获取新的token
      token = getToken();
      if (!token) {
        throw new Error('认证令牌已过期且无法刷新');
      }
    }

    // 通过API验证token
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || '无效的认证令牌');
    }

    return data.data.user;
  } catch (error) {
    console.error('Token验证失败:', error);
    throw new Error('无效的认证令牌: ' + error.message);
  }
}

// 检查token是否过期
function isTokenExpired() {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() > parseInt(expiry);
}

// 检查是否已认证
function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  
  try {
    // 检查token是否过期
    if (isTokenExpired()) {
      clearAuthInfo();
      return false;
    }
    return true;
  } catch (error) {
    console.error('Token验证失败:', error);
    clearAuthInfo();
    return false;
  }
}

// 获取认证请求头
function getAuthHeader() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// 刷新token
async function refreshAuthToken() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const { token, newRefreshToken, expiresIn } = await response.json();
    saveAuthInfo(token, newRefreshToken, expiresIn, getUserRole());
    return token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearAuthInfo();
    window.location.href = '/login';
    throw error;
  }
}

export  {
  saveAuthInfo,
  getToken,
  getRefreshToken,
  getUserRole,
  clearAuthInfo,
  isTokenExpired,
  isAuthenticated,
  getAuthHeader,
  refreshAuthToken,
  validateToken
};
