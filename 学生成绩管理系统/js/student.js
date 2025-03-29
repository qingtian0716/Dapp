/**
 * 学生信息管理功能
 */

// 保存学生信息
async function saveStudentInfo() {
    const studentId = document.getElementById('infoStudentId').value;
    const name = document.getElementById('studentName').value;
    const gender = document.getElementById('studentGender').value;
    const className = document.getElementById('className').value;

    if (!studentId || !name || !gender || !className) {
        document.getElementById('studentInfoError').innerText = '请填写完整的学生信息';
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/student-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: parseInt(studentId),
                name,
                gender,
                className
            })
        });

        const result = await response.json();
        if (result.success) {
            document.getElementById('studentInfoError').innerText = '学生信息保存成功';
            document.getElementById('studentInfoResult').innerHTML = '';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('studentInfoError').innerText = '保存失败: ' + error.message;
    }
}

// 按学号查询学生
async function searchStudentById() {
    const studentId = document.getElementById('searchStudentId').value;
    if (!studentId) {
        document.getElementById('searchError').innerText = '请输入学号';
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/student-info/${studentId}`);
        const result = await response.json();

        if (result.success) {
            displayStudentInfo([result.data]);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
        document.getElementById('searchResults').innerHTML = '';
    }
}

// 按姓名查询学生
async function searchStudentByName() {
    const name = document.getElementById('searchStudentName').value;
    if (!name) {
        document.getElementById('searchError').innerText = '请输入姓名';
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/student-info/name/${encodeURIComponent(name)}`);
        const result = await response.json();

        if (result.success) {
            displayStudentInfo(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
        document.getElementById('searchResults').innerHTML = '';
    }
}

// 按班级查询学生
async function searchStudentsByClass() {
    const className = document.getElementById('searchClassName').value;
    if (!className) {
        document.getElementById('searchError').innerText = '请输入班级';
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/student-info/class/${encodeURIComponent(className)}`);
        const result = await response.json();

        if (result.success) {
            displayStudentInfo(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
        document.getElementById('searchResults').innerHTML = '';
    }
}

// 显示学生信息
function displayStudentInfo(students) {
    if (!Array.isArray(students) || students.length === 0) {
        document.getElementById('searchError').innerText = '未找到学生信息';
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    let html = '<div class="students-grid">';
    students.forEach(student => {
        html += `
            <div class="student-card">
                <h3>学生信息</h3>
                <p><strong>学号：</strong>${student.student_id}</p>
                <p><strong>姓名：</strong>${student.name}</p>
                <p><strong>性别：</strong>${student.gender}</p>
                <p><strong>班级：</strong>${student.class_name}</p>
                <p><strong>创建时间：</strong>${new Date(student.created_at).toLocaleString()}</p>
                <p><strong>更新时间：</strong>${new Date(student.updated_at).toLocaleString()}</p>
            </div>
        `;
    });
    html += '</div>';

    document.getElementById('searchResults').innerHTML = html;
    document.getElementById('searchError').innerText = '';
}

export {
    saveStudentInfo,
    searchStudentById,
    searchStudentByName,
    searchStudentsByClass,
    displayStudentInfo
};