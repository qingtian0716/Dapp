

// Get Value Function
async function getValue() {
    const studentId = document.getElementById('queryStudentId').value;
    if (!studentId) {
        alert('请输入要查询的学号');
        return;
    }

    const resultsDiv = document.getElementById('results');

    try {
        // 首先尝试从区块链获取数据
        console.log('开始查询学生信息...');
        const queryParams = {
            studentId: studentId,
            contractAddress: contract._address,
            networkId: (await web3.eth.net.getId()).toString(),
            currentAccount: (await web3.eth.getAccounts())[0]
        };
        console.log('查询参数:', BigIntSerializer.stringify(queryParams));

        // 验证合约方法
        if (!contract.methods.get) {
            throw new Error('合约方法get不存在');
        }

        // 检查合约代码
        const code = await web3.eth.getCode(contract._address);
        if (code === '0x' || code === '0x0') {
            throw new Error('合约未部署或地址错误');
        }

        console.log('准备调用合约get方法...');
        const result = await contract.methods.get(studentId).call();
        console.log('原始查询结果:', BigIntSerializer.stringify(result));
        console.log('结果类型:', typeof result, Array.isArray(result) ? '是数组' : '不是数组');

        let exists, subjectNames, scores;

        // 尝试多种方式解析返回值
        if (Array.isArray(result)) {
            console.log('使用数组方式解析');
            [exists, subjectNames, scores] = result;
        } else if (typeof result === 'object') {
            console.log('使用对象方式解析');
            if ('0' in result && '1' in result && '2' in result) {
                exists = result['0'];
                subjectNames = result['1'];
                scores = result['2'];
            } else if ('exists' in result && 'subjectNames' in result && 'scores' in result) {
                exists = result.exists;
                subjectNames = result.subjectNames;
                scores = result.scores;
            } else {
                throw new Error('返回值格式不符合预期');
            }
        } else {
            throw new Error('无法识别的返回值类型');
        }

        console.log('解析后的数据:', BigIntSerializer.stringify({
            exists: exists,
            subjectNames: subjectNames,
            scores: scores
        }));

        if (!exists) {
            // 如果区块链没有找到数据，尝试从MySQL数据库获取
            try {
                console.log('区块链未找到数据，尝试从数据库查询...');
                const apiResponse = await fetch(`http://localhost:8080/api/students/${studentId}`);
                const apiResult = await apiResponse.json();

                if (apiResult.success) {
                    console.log('从数据库获取数据成功:', apiResult);

                    // 从数据库结果提取数据
                    exists = true;
                    subjectNames = apiResult.data.subject_names;
                    scores = apiResult.data.scores;

                    resultsDiv.innerHTML = `
                        <p class="info">数据来源: MySQL数据库</p>
                        ${generateResultTable(studentId, subjectNames, scores)}
                    `;
                    return;
                } else {
                    console.log('数据库也未找到数据:', apiResult);
                    resultsDiv.innerHTML = '<p>未找到该学号的学生信息</p>';
                    return;
                }
            } catch (dbError) {
                console.error('数据库查询失败:', dbError);
                resultsDiv.innerHTML = '<p>未找到该学号的学生信息</p>';
                return;
            }
        }

        if (!Array.isArray(subjectNames) || !Array.isArray(scores)) {
            throw new Error('科目名称或成绩数据格式错误');
        }

        // 显示区块链结果
        resultsDiv.innerHTML = `
            <p class="info">数据来源: 区块链</p>
            ${generateResultTable(studentId, subjectNames, scores)}
        `;

    } catch (error) {
        console.error('详细错误信息:', error);
        const debugInfo = {
            contractAddress: contract._address,
            networkId: (await web3.eth.net.getId()).toString(),
            hasCode: await web3.eth.getCode(contract._address) !== '0x',
            currentAccount: (await web3.eth.getAccounts())[0]
        };

        // 如果区块链查询失败，尝试从MySQL数据库获取
        try {
            console.log('区块链查询失败，尝试从数据库查询...');
            const apiResponse = await fetch(`http://localhost:8080/api/students/${studentId}`);
            const apiResult = await apiResponse.json();

            if (apiResult.success) {
                console.log('从数据库获取数据成功:', apiResult);

                // 从数据库结果提取数据
                const dbSubjectNames = apiResult.data.subject_names;
                const dbScores = apiResult.data.scores;

                if (Array.isArray(dbSubjectNames) && Array.isArray(dbScores)) {
                    resultsDiv.innerHTML = `
                        <p class="info">数据来源: MySQL数据库 (区块链查询失败)</p>
                        <p class="warning">区块链查询错误: ${error.message}</p>
                        ${generateResultTable(studentId, dbSubjectNames, dbScores)}
                    `;
                    return;
                }
            }
        } catch (dbError) {
            console.error('数据库查询也失败:', dbError);
        }

        // 如果两者都失败，显示错误信息
        document.getElementById('results').innerHTML = `
            <p class="error">查询失败: ${error.message}</p>
            <p>请检查以下内容：</p>
            <ul>
                <li>合约是否已正确部署（当前地址: ${contract._address}）</li>
                <li>是否已录入该学号的成绩</li>
                <li>网络连接是否正常（当前网络ID: ${await web3.eth.net.getId()}）</li>
                <li>MetaMask是否已解锁并选择了正确的网络</li>
                <li>ABI文件是否已更新</li>
                <li>数据库服务是否正常运行</li>
            </ul>
            <p>调试信息：</p>
            <pre>${BigIntSerializer.stringify(debugInfo)}</pre>
            <button onclick="window.location.reload()">刷新页面</button>
        `;
    }
}

// 添加班级成绩查询功能
async function queryClassGrades() {
    const className = document.getElementById('classNameQuery').value.trim();
    if (!className) {
        document.getElementById('classQueryError').innerText = '请输入班级名称';
        document.getElementById('classQueryResults').innerHTML = '';
        document.getElementById('chartsContainer').innerHTML = '';
        return;
    }

    try {
        // 清除之前的错误信息
        document.getElementById('classQueryError').innerText = '';
        document.getElementById('classQueryResults').innerHTML = '<p>正在查询数据...</p>';
        
        // 调用API按班级查询学生
        const response = await fetch(`http://localhost:8080/api/student-info/class/${encodeURIComponent(className)}`);
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
            document.getElementById('classQueryResults').innerHTML = `<p>未找到班级名称包含 "${className}" 的学生</p>`;
            document.getElementById('chartsContainer').innerHTML = '';
            return;
        }
        
        // 获取学生列表
        const students = result.data;
        
        // 显示学生列表
        let html = `<h3>班级 "${className}" 学生列表</h3>`;
        html += '<div class="students-table-container">';
        html += '<table class="results-table">';
        html += '<thead><tr><th>学号</th><th>姓名</th><th>性别</th><th>操作</th></tr></thead>';
        html += '<tbody>';
        
        students.forEach(student => {
            html += `
                <tr>
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>${student.gender}</td>
                    <td>
                        <button onclick="getStudentGradesForChart(${student.student_id})">查看成绩</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        
        document.getElementById('classQueryResults').innerHTML = html;
        
        // 获取班级所有学生的成绩数据
        await getClassGradesData(students);
        
    } catch (error) {
        console.error('查询班级学生失败:', error);
        document.getElementById('classQueryError').innerText = '查询失败: ' + error.message;
        document.getElementById('classQueryResults').innerHTML = '';
        document.getElementById('chartsContainer').innerHTML = '';
    }
}

// 获取班级所有学生的成绩数据
async function getClassGradesData(students) {
    try {
        // 准备数据结构
        const classData = {
            studentIds: [],
            studentNames: [],
            subjects: new Set(),
            gradesData: []
        };
        
        // 收集所有学生的成绩
        for (const student of students) {
            try {
                // 调用合约的get方法获取学生信息
                const result = await contract.methods.get(parseInt(student.student_id)).call();
                
                if (!result || !result[0]) {
                    continue; // 跳过没有成绩的学生
                }
                
                // 解析返回值
                const subjectNames = result[1];
                const scores = result[2];
                
                if (!Array.isArray(subjectNames) || !Array.isArray(scores) || subjectNames.length === 0) {
                    continue; // 跳过没有成绩的学生
                }
                
                // 添加学生信息
                classData.studentIds.push(student.student_id);
                classData.studentNames.push(student.name);
                
                // 添加科目
                subjectNames.forEach(subject => classData.subjects.add(subject));
                
                // 添加成绩数据
                const studentGrades = {};
                for (let i = 0; i < subjectNames.length; i++) {
                    studentGrades[subjectNames[i]] = parseInt(scores[i]);
                }
                
                classData.gradesData.push({
                    studentId: student.student_id,
                    name: student.name,
                    grades: studentGrades
                });
            } catch (error) {
                console.error(`获取学生 ${student.student_id} 成绩失败:`, error);
            }
        }
        
        // 如果没有成绩数据，显示提示
        if (classData.gradesData.length === 0) {
            document.getElementById('chartsContainer').innerHTML = '<p>未找到任何学生的成绩数据</p>';
            return;
        }
        
        // 生成图表
        generateClassCharts(classData);
        
    } catch (error) {
        console.error('获取班级成绩数据失败:', error);
        document.getElementById('chartsContainer').innerHTML = '<p>获取成绩数据失败: ' + error.message + '</p>';
    }
}

// 预览Excel数据
async function previewExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择一个Excel文件');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 获取第一个工作表
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // 将工作表转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
                document.getElementById('batchError').innerText = '表格数据不足，至少需要标题行和一行数据';
                return;
            }

            // 处理表格数据
            const headers = jsonData[0];

            if (headers.length < 2) {
                document.getElementById('batchError').innerText = '表格至少需要两列：学号和至少一个课程';
                return;
            }

            // 准备处理后的数据
            const processedData = {
                headers: headers.slice(1), // 第一列是学号，所以从第二列开始为课程名
                students: []
            };

            // 处理每个学生的数据
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];

                if (row.length < 2 || row[0] === undefined || row[0] === '') {
                    continue; // 跳过没有学号的行
                }

                const studentId = String(row[0]).trim();
                const scores = [];

                // 收集每门课程的成绩
                for (let j = 1; j < row.length; j++) {
                    if (j < headers.length) {
                        const score = row[j] !== undefined ? parseInt(row[j]) : null;
                        scores.push(score);
                    }
                }

                // 添加学生数据
                processedData.students.push({
                    studentId: studentId,
                    scores: scores
                });
            }

            if (processedData.students.length === 0) {
                document.getElementById('batchError').innerText = '没有找到有效的学生数据';
                return;
            }

            // 保存处理后的数据
            window.excelData = processedData;

            // 生成预览表格
            generatePreviewTable(processedData);

            // 启用导入按钮
            document.getElementById('importButton').disabled = false;

            // 清除错误信息
            document.getElementById('batchError').innerText = '';
        } catch (error) {
            console.error('解析Excel文件时出错:', error);
            document.getElementById('batchError').innerText = '解析文件失败: ' + error.message;
        }
    };

    reader.onerror = function () {
        document.getElementById('batchError').innerText = '读取文件失败';
    };

    reader.readAsArrayBuffer(file);
}

// 生成预览表格
function generatePreviewTable(data) {
    const previewContainer = document.getElementById('previewContainer');
    const previewTable = document.getElementById('previewTable');

    // 构建表格HTML
    let tableHTML = '<table>';

    // 表头
    tableHTML += '<thead><tr><th>学号</th>';
    for (const header of data.headers) {
        tableHTML += `<th>${header}</th>`;
    }
    tableHTML += '</tr></thead>';

    // 表体
    tableHTML += '<tbody>';
    for (const student of data.students) {
        tableHTML += `<tr><td>${student.studentId}</td>`;

        for (let i = 0; i < data.headers.length; i++) {
            const score = i < student.scores.length ? student.scores[i] : '';
            const scoreClass = score !== null && !isNaN(score) && score >= 0 && score <= 100 ? 'valid-data' : 'invalid-data';
            tableHTML += `<td class="${scoreClass}">${score !== null ? score : ''}</td>`;
        }

        tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';

    // 更新预览
    previewTable.innerHTML = tableHTML;
    previewContainer.style.display = 'block';
}

// 导入Excel数据
async function importExcelData() {
    if (!window.excelData || window.excelData.students.length === 0) {
        document.getElementById('batchError').innerText = '没有可导入的数据';
        return;
    }

    try {
        // 准备批量导入的数据
        const data = window.excelData;
        const accounts = await web3.eth.getAccounts();
        const gasPrice = await web3.eth.getGasPrice();
        
        // 显示处理中信息
        document.getElementById('batchError').innerHTML = `
            <div class="status-message info">
                ⏳ 正在处理 ${data.students.length} 名学生的成绩数据...
            </div>
        `;
        
        // 准备批量提交的数据
        const batchData = [];
        
        // 收集所有有效的学生数据
        for (const student of data.students) {
            // 准备学生数据
            const studentId = student.studentId;
            const subjectNames = data.headers;
            const scores = student.scores;
            
            // 过滤掉无效的成绩
            const validSubjects = [];
            const validScores = [];
            
            for (let i = 0; i < subjectNames.length; i++) {
                const score = i < scores.length ? scores[i] : null;
                if (score !== null && !isNaN(score) && score >= 0 && score <= 100) {
                    validSubjects.push(subjectNames[i]);
                    validScores.push(score);
                }
            }
            
            if (validSubjects.length > 0) {
                batchData.push({
                    studentId: parseInt(studentId),
                    subjectNames: validSubjects,
                    scores: validScores
                });
            }
        }
        
        if (batchData.length === 0) {
            document.getElementById('batchError').innerText = '没有有效的成绩数据可导入';
            return;
        }
        
        // 显示处理进度信息
        document.getElementById('batchError').innerHTML = `
            <div class="status-message info">
                ⏳ 正在将数据写入区块链和数据库，共 ${batchData.length} 名学生...
            </div>
        `;
        
        // 记录成功和失败的数量
        let blockchainSuccessCount = 0;
        let blockchainFailCount = 0;
        let dbSuccessCount = 0;
        
        // 创建结果数组
        let results = [];
        
        try {
            // 准备批量提交到区块链的数据
            const studentIds = [];
            const allSubjectNames = [];
            const allScores = [];
            
            // 收集所有学生数据
            for (const studentData of batchData) {
                // 先尝试获取学生现有成绩
                let existingSubjectNames = [];
                let existingScores = [];
                
                try {
                    const result = await contract.methods.get(studentData.studentId).call();
                    
                    // 解析返回值
                    if (Array.isArray(result) && result.length >= 3) {
                        const exists = result[0];
                        if (exists) {
                            existingSubjectNames = result[1];
                            existingScores = result[2];
                        }
                    } else if (typeof result === 'object') {
                        const exists = result.exists || result[0];
                        if (exists) {
                            existingSubjectNames = result.subjectNames || result[1];
                            existingScores = result.scores || result[2];
                        }
                    }
                } catch (error) {
                    console.log(`获取学生 ${studentData.studentId} 现有成绩失败，可能是新学生:`, error);
                }
                
                // 合并现有成绩和新成绩
                const mergedSubjectNames = [...existingSubjectNames];
                const mergedScores = [...existingScores];
                
                // 遍历新科目和成绩
                for (let i = 0; i < studentData.subjectNames.length; i++) {
                    const subjectName = studentData.subjectNames[i];
                    const score = studentData.scores[i];
                    
                    // 查找是否已存在该科目
                    const existingIndex = mergedSubjectNames.findIndex(name => name === subjectName);
                    
                    if (existingIndex !== -1) {
                        // 如果科目已存在，更新成绩
                        mergedScores[existingIndex] = score;
                    } else {
                        // 如果科目不存在，添加新科目和成绩
                        mergedSubjectNames.push(subjectName);
                        mergedScores.push(score);
                    }
                }
                
                // 添加到批量数据中
                studentIds.push(studentData.studentId);
                allSubjectNames.push(mergedSubjectNames);
                allScores.push(mergedScores);
            }
            
            // 检查合约是否有批量设置方法
            // 检查合约是否有批量设置方法
            if (contract.methods.setBatch) {
                // 使用批量设置方法一次性提交所有数据
                const tx = await contract.methods.setBatch(studentIds, allSubjectNames, allScores).send({
                    from: accounts[0],
                    gasPrice: gasPrice,
                    gas: 5000000  // 增加gas限制，因为批量操作需要更多gas
                });
                
                blockchainSuccessCount = studentIds.length;
                
                // 记录所有学生的成功结果
                for (let i = 0; i < studentIds.length; i++) {
                    results.push({
                        studentId: studentIds[i],
                        blockchainSuccess: true,
                        txHash: tx.transactionHash,
                        dbSuccess: false
                    });
                }
            } else {
                // 如果没有批量方法，则使用单个交易包含所有学生数据
                document.getElementById('batchError').innerHTML = `
                    <div class="status-message warning">
                        ⚠️ 合约没有批量设置方法，将使用单个交易逐个处理学生数据...
                    </div>
                `;
                
                // 逐个处理学生数据
                for (let i = 0; i < studentIds.length; i++) {
                    try {
                        const tx = await contract.methods.set(studentIds[i], allSubjectNames[i], allScores[i]).send({
                            from: accounts[0],
                            gasPrice: gasPrice,
                            gas: 3000000
                        });
                        
                        blockchainSuccessCount++;
                        
                        results.push({
                            studentId: studentIds[i],
                            blockchainSuccess: true,
                            txHash: tx.transactionHash,
                            dbSuccess: false
                        });
                    } catch (error) {
                        console.error(`学生 ${studentIds[i]} 区块链写入失败:`, error);
                        blockchainFailCount++;
                        
                        results.push({
                            studentId: studentIds[i],
                            blockchainSuccess: false,
                            blockchainError: error.message,
                            dbSuccess: false
                        });
                    }
                }
            }
        } catch (error) {
            console.error('区块链批量写入失败:', error);
            blockchainFailCount = batchData.length;
            
            // 记录所有学生的失败结果
            for (const studentData of batchData) {
                results.push({
                    studentId: studentData.studentId,
                    blockchainSuccess: false,
                    blockchainError: error.message,
                    dbSuccess: false
                });
            }
        }
        
        // 更新进度信息
        document.getElementById('batchError').innerHTML = `
            <div class="status-message info">
                ⏳ 区块链写入完成，正在保存到数据库...
            </div>
        `;
        
        // 一次性提交到数据库
        try {
            const response = await fetch('http://localhost:8080/api/students/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(batchData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || '批量导入数据库失败');
            }
            
            dbSuccessCount = batchData.length;
            
            // 更新结果状态
            results.forEach(item => {
                item.dbSuccess = true;
            });
            
        } catch (dbError) {
            console.error('数据库批量导入失败:', dbError);
            
            // 更新结果状态
            results.forEach(item => {
                item.dbSuccess = false;
                item.dbError = dbError.message;
            });
        }
        
        // 显示最终结果
        const totalSuccess = results.filter(r => r.blockchainSuccess && r.dbSuccess).length;
        const partialSuccess = results.filter(r => r.blockchainSuccess || r.dbSuccess).length - totalSuccess;
        const totalFail = results.length - totalSuccess - partialSuccess;
        
        let statusClass = 'success';
        if (totalFail > 0) {
            statusClass = 'error';
        } else if (partialSuccess > 0) {
            statusClass = 'warning';
        }
        
        document.getElementById('batchError').innerHTML = `
            <div class="status-message ${statusClass}">
                <h4>导入结果</h4>
                <p>✅ 完全成功: ${totalSuccess} 名学生</p>
                ${partialSuccess > 0 ? `<p>⚠️ 部分成功: ${partialSuccess} 名学生</p>` : ''}
                ${totalFail > 0 ? `<p>❌ 完全失败: ${totalFail} 名学生</p>` : ''}
                <p>区块链写入: ${blockchainSuccessCount}/${batchData.length} 成功</p>
                <p>数据库保存: ${dbSuccessCount}/${batchData.length} 成功</p>
            </div>
        `;
        
        // 显示详细结果
        let resultHTML = '<div class="batch-results">';
        resultHTML += '<h4>导入结果详情</h4>';
        resultHTML += '<table>';
        resultHTML += '<thead><tr><th>学号</th><th>区块链</th><th>数据库</th><th>详情</th></tr></thead>';
        resultHTML += '<tbody>';
        
        for (const result of results) {
            resultHTML += `
                <tr>
                    <td>${result.studentId}</td>
                    <td>${result.blockchainSuccess ? '✅ 成功' : '❌ 失败'}</td>
                    <td>${result.dbSuccess ? '✅ 成功' : '❌ 失败'}</td>
                    <td>
                        ${result.blockchainSuccess ? `交易哈希: ${result.txHash.substring(0, 10)}...` : 
                          `区块链错误: ${result.blockchainError || '未知错误'}`}
                        ${!result.dbSuccess && result.dbError ? `<br>数据库错误: ${result.dbError}` : ''}
                    </td>
                </tr>
            `;
        }
        
        resultHTML += '</tbody></table></div>';
        
        document.getElementById('batchTransactionInfo').innerHTML = resultHTML;
        
        // 禁用导入按钮，防止重复导入
        document.getElementById('importButton').disabled = true;
        
    } catch (error) {
        console.error('批量导入失败:', error);
        document.getElementById('batchError').innerHTML = `
            <div class="status-message error">
                ❌ 批量导入失败: ${error.message}
            </div>
        `;
    }

}