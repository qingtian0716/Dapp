// 错误处理相关函数

/**
 * 处理错误并显示通知
 * @param {Error} error - 错误对象
 * @param {string} customMessage - 自定义错误消息
 * @returns {boolean} - 始终返回false，方便在调用处进行条件判断
 */
export function handleError(error, customMessage = '') {
  console.error(customMessage || '操作失败:', error);
  
  // 提取错误消息
  let errorMessage = customMessage || '操作失败';
  if (error && error.message) {
    errorMessage += ': ' + error.message;
  }
  
  // 显示错误通知
  showToast(errorMessage, 'error');
  return false;
}

/**
 * 显示通知消息
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 (info, success, warning, error)
 */
export function showToast(message, type = 'info') {
  try {
    const notification = getOrCreateNotification();
    if (!notification) {
      console.error('无法创建通知元素');
      return;
    }
    updateNotificationContent(notification, message);
    styleNotification(notification, type);
    showNotification(notification);
  } catch (error) {
    console.error('显示通知失败:', error);
  }
}

/**
 * 获取或创建通知元素
 * @returns {HTMLElement} 通知元素
 */
function getOrCreateNotification() {
  let notification = document.getElementById('toast-notification');
  
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'toast-notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.zIndex = '9999';
    notification.style.transition = 'all 0.3s ease-in-out';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)';
    notification.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(notification);
  }
  
  return notification;
}

/**
 * 更新通知内容
 * @param {HTMLElement} notification - 通知元素
 * @param {string} message - 通知消息
 */
function updateNotificationContent(notification, message) {
  notification.textContent = message;
}

/**
 * 根据类型设置通知样式
 * @param {HTMLElement} notification - 通知元素
 * @param {string} type - 通知类型
 */
function styleNotification(notification, type) {
  const colors = {
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336'
  };
  
  notification.style.backgroundColor = colors[type] || colors.info;
}

/**
 * 显示通知并设置自动隐藏
 * @param {HTMLElement} notification - 通知元素
 */
function showNotification(notification) {
  notification.style.opacity = '1';
  notification.style.transform = 'translateY(0)';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 完全隐藏后移除元素
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}