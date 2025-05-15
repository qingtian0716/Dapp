// 事件处理相关函数

/**
 * 保存钱包事件到本地存储
 * @param {Object} eventData - 事件数据对象
 */
export function saveWalletEventToLocalStorage(eventData) {
  const walletEvents = JSON.parse(localStorage.getItem('walletEvents') || '[]');
  walletEvents.push(eventData);
  localStorage.setItem('walletEvents', JSON.stringify(walletEvents));
  console.log('钱包事件已保存到本地:', eventData.walletAddress);
}

/**
 * 获取钱包事件历史
 * @returns {Array} 钱包事件历史数组
 */
export function getWalletEvents() {
  return JSON.parse(localStorage.getItem('walletEvents') || '[]');
}

/**
 * 清除钱包事件历史
 */
export function clearWalletEvents() {
  localStorage.removeItem('walletEvents');
  console.log('钱包事件历史已清除');
}