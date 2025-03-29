/**
 * 用户界面交互功能
 */

// 添加课程行
function addSubjectRow() {
    const container = document.getElementById('subjects-container');
    const newRow = document.createElement('div');
    newRow.className = 'subject-row';

    const subjectSelect = document.createElement('select');
    subjectSelect.className = 'subject-name';
    subjectSelect.innerHTML = `
        <option value="">请选择课程</option>
        <option value="语文">语文</option>
        <option value="数学">数学</option>
        <option value="英语">英语</option>
        <option value="物理">物理</option>
        <option value="化学">化学</option>
        <option value="生物">生物</option>
        <option value="历史">历史</option>
        <option value="地理">地理</option>
        <option value="政治">政治</option>
        <option value="计算机">计算机</option>
        <option value="体育">体育</option>
        <option value="音乐">音乐</option>
        <option value="美术">美术</option>
    `;

    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.className = 'subject-score';
    scoreInput.placeholder = '成绩';
    scoreInput.min = '0';
    scoreInput.max = '100';

    const removeButton = document.createElement('button');
    removeButton.innerText = '删除';
    removeButton.onclick = function () {
        container.removeChild(newRow);
    };

    newRow.appendChild(subjectSelect);
    newRow.appendChild(scoreInput);
    newRow.appendChild(removeButton);
    container.appendChild(newRow);
}

// 动态加载脚本
function loadScript(src) {
    return new Promise(function (resolve, reject) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export {
    addSubjectRow,
    loadScript
};