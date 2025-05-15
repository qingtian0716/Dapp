// 初始化AOS动画库
AOS.init({
    duration: 800,
    once: true
});

// 导航菜单切换功能
window.toggleMenu = function() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('show');
};