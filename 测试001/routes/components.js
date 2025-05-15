// 组件工具类
export class Components {
  static createLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.style.display = 'none';
    indicator.innerHTML = `
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    `;
    return indicator;
  }

  static createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    return toast;
  }

  static createTransactionStatus() {
    const status = document.createElement('div');
    status.className = 'tx-status';
    status.innerHTML = `
      <span class="tx-pending" style="display: none;">
        <i class="fas fa-spinner fa-spin"></i> 交易处理中...
      </span>
    `;
    return status;
  }

  static createErrorMessage(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    return error;
  }

  static createButton(text, onClick, className = '') {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = className;
    button.addEventListener('click', onClick);
    return button;
  }
}