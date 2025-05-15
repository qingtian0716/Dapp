// 移动端菜单切换功能
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// 确保DOM加载完成后绑定事件
document.addEventListener('DOMContentLoaded', function() {
    // 查找菜单切换按钮并绑定事件
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', toggleMenu);
    }

    // 绑定刷新日志按钮事件
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    if (refreshLogsBtn && window.refreshSystemLogs) {
        refreshLogsBtn.addEventListener('click', window.refreshSystemLogs);
    }

    // 绑定更新设置按钮事件
    const updateSettingsBtn = document.getElementById('updateSettingsBtn');
    if (updateSettingsBtn && window.updateSystemSettings) {
        updateSettingsBtn.addEventListener('click', window.updateSystemSettings);
    }
});
