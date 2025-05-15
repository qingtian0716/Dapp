let web3;
let contract;
// 存储解析后的Excel数据
let excelData = null;

// Pinata API credentials
const pinataApiKey = '4474fad72af52b1a7bcf'; // Replace with your Pinata API key
const pinataSecretApiKey = 'baf5c086b522e409e08d13bae1dd933f5adfdfbeb86efc0af5adaf9dbfffa566'; // Replace with your Pinata Secret API key

// 生成结果表格的函数
function generateResultTable(studentId, subjectNames, scores) {
    // 计算平均分
    const totalScore = scores.reduce((sum, score) => sum + parseInt(score), 0);
    const averageScore = scores.length > 0 ? (totalScore / scores.length).toFixed(2) : 0;

    // 创建结果表格
    let tableHTML = `
        <h3>学号 ${studentId} 的成绩单</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>课程</th>
                    <th>成绩</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let i = 0; i < subjectNames.length; i++) {
        tableHTML += `
            <tr>
                <td>${subjectNames[i]}</td>
                <td>${scores[i]}</td>
            </tr>
        `;
    }

    tableHTML += `
            </tbody>
            <tfoot>
                <tr>
                    <th>平均分</th>
                    <td>${averageScore}</td>
                </tr>
            </tfoot>
        </table>
    `;

    return tableHTML;
}

// Get Account Info Function
async function getAccountInfo() {
    const accounts = await web3.eth.getAccounts();
    const accountAddress = accounts[0];
    document.getElementById('accountAddress').innerText = "Account Address: " + accountAddress;

    const balance = await web3.eth.getBalance(accountAddress);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    document.getElementById('accountBalance').innerText = "Account Balance: " + balanceInEther + " ETH";
}

// Get Transaction Info Function
async function getTransactionInfo() {
    const txHash = document.getElementById('txHashInput').value;
    if (!txHash) {
        alert('Please enter a transaction hash.');
        return;
    }

    const receipt = await web3.eth.getTransactionReceipt(txHash);
    if (receipt) {
        const status = receipt.status ? "Success" : "Failed"; // Status: Success or Failed
        const blockHash = receipt.blockHash; // Block hash
        const blockNumber = receipt.blockNumber; // Block number
        const from = receipt.from; // Sender address
        const to = receipt.to; // Receiver address
        const gasUsed = receipt.gasUsed; // Gas used

        document.getElementById('transactionInfo').innerText = `
            Status: ${status}
            Transaction Hash: ${txHash}
            Block Hash: ${blockHash}
            Block Number: ${blockNumber}
            From: ${from}
            To: ${to}
            Gas Used: ${gasUsed}
        `;
    } else {
        document.getElementById('transactionInfo').innerText = "Transaction not found!";
    }
}

// 预览选择的图片
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.getElementById('imagePreview');
            previewDiv.innerHTML = `<img src="${e.target.result}" alt="预览图片" style="max-width: 300px; margin: 10px 0;">`;
        }
        reader.readAsDataURL(file);
    }
}

// Upload Image to Pinata Function
async function uploadImageToPinata() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择一个图片文件');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretApiKey,
            },
            body: formData,
        });

        const result = await response.json();
        if (result.IpfsHash) {
            const imageUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
            document.getElementById('pinataResponse').innerHTML = `
                <p>图片上传成功！</p>
                <p>IPFS Hash: ${result.IpfsHash}</p>
                <p><a href="${imageUrl}" target="_blank">查看图片</a></p>
                <img src="${imageUrl}" alt="已上传的图片" style="max-width: 300px; margin: 10px 0;">
            `;
        } else {
            document.getElementById('pinataResponse').innerText = '图片上传失败';
        }
    } catch (error) {
        console.error('上传图片到 Pinata 时出错:', error);
        document.getElementById('pinataResponse').innerText = '上传图片时发生错误';
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
            excelData = processedData;

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

// 批量导入数据
// 导入Excel数据
async function importExcelData() {
    if (!excelData || !excelData.students || excelData.students.length === 0) {
        document.getElementById('batchError').innerText = '没有可导入的数据';
        return;
    }

    try {
        document.getElementById('batchError').innerHTML = `
            <div class="status-message info">
                ⏳ 正在处理数据，共 ${excelData.students.length} 名学生...
            </div>
        `;
        
        const accounts = await web3.eth.getAccounts();
        if (!accounts || accounts.length === 0) {
            throw new Error('未检测到以太坊账户，请确保MetaMask已登录并授权');
        }
        
        // 验证数据格式
        const validStudents = [];
        const invalidStudents = [];
        
        for (const student of excelData.students) {
            // 验证学号
            const studentId = parseInt(student.studentId);
            if (isNaN(studentId) || studentId <= 0) {
                invalidStudents.push({
                    studentId: student.studentId,
                    reason: '学号无效'
                });
                continue;
            }
            
            // 验证成绩
            const validScores = [];
            const validSubjects = [];
            let hasValidScore = false;
            
            for (let i = 0; i < excelData.headers.length; i++) {
                const subject = excelData.headers[i];
                const score = student.scores[i];
                
                if (score === null || isNaN(score)) {
                    continue; // 跳过无效成绩
                }
                
                validSubjects.push(subject);
                validScores.push(score);
                hasValidScore = true;
            }
            
            if (!hasValidScore) {
                invalidStudents.push({
                    studentId: student.studentId,
                    reason: '没有有效成绩'
                });
                continue;
            }
            
            validStudents.push({
                studentId: studentId,
                subjectNames: validSubjects,
                scores: validScores
            });
        }
        
        if (validStudents.length === 0) {
            throw new Error('没有有效的学生成绩数据可导入');
        }
        
        if (invalidStudents.length > 0) {
            document.getElementById('batchError').innerHTML += `
                <div class="status-message warning">
                    ⚠️ ${invalidStudents.length} 名学生的数据无效，将被跳过
                </div>
            `;
        }

        document.getElementById('batchError').innerHTML += `
            <div class="status-message info">
                ⏳ 准备写入区块链，共 ${validStudents.length} 名学生的成绩数据...
            </div>
        `;

        // 分批处理，每批最多3名学生 (减小批次大小)
        const batchSize = 3;
        let successCount = 0;
        let failCount = 0;
        let lastTransactionHash = '';

        for (let i = 0; i < validStudents.length; i += batchSize) {
            const endIndex = Math.min(i + batchSize, validStudents.length);
            const batchStudents = validStudents.slice(i, endIndex);
            
            document.getElementById('batchError').innerHTML += `
                <div class="status-message info">
                    ⏳ 正在处理第 ${i+1} 到 ${endIndex} 名学生的数据...
                </div>
            `;
            
            // 单独处理每个学生
            for (let j = 0; j < batchStudents.length; j++) {
                const student = batchStudents[j];
                
                document.getElementById('batchError').innerHTML += `
                    <div class="status-message info">
                        ⏳ 正在处理学号为 ${student.studentId} 的学生数据...
                    </div>
                `;
                
                try {
                    // 获取学生现有成绩
                    let existingSubjectNames = [];
                    let existingScores = [];
                    
                    try {
                        const result = await contract.methods.get(student.studentId).call();
                        if (result && result[0]) {
                            existingSubjectNames = result[1] || [];
                            existingScores = result[2] || [];
                        }
                    } catch (error) {
                        console.log(`获取学生 ${student.studentId} 现有成绩失败:`, error);
                    }
                    
                    // 合并现有成绩和新成绩
                    const mergedSubjectNames = [...existingSubjectNames];
                    const mergedScores = [...existingScores];
                    
                    // 添加新成绩
                    for (let k = 0; k < student.subjectNames.length; k++) {
                        const subjectName = student.subjectNames[k];
                        const score = student.scores[k];
                        
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
                    
                    // 使用单个学生的set方法
                    const tx = await contract.methods.set(
                        student.studentId,
                        mergedSubjectNames,
                        mergedScores
                    ).send({
                        from: accounts[0],
                        gas: 3000000  // 设置足够的gas限制
                    });
                    
                    lastTransactionHash = tx.transactionHash;
                    successCount++;
                    
                    document.getElementById('batchError').innerHTML += `
                        <div class="status-message success">
                            ✅ 学号 ${student.studentId} 写入成功！
                        </div>
                    `;
                } catch (singleError) {
                    console.error(`学号 ${student.studentId} 写入失败:`, singleError);
                    failCount++;
                    
                    document.getElementById('batchError').innerHTML += `
                        <div class="status-message error">
                            ❌ 学号 ${student.studentId} 写入失败: ${singleError.message.substring(0, 100)}...
                        </div>
                    `;
                }
                
                // 添加延迟，避免交易堵塞
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // 批次之间添加延迟，避免交易堵塞
            if (i + batchSize < validStudents.length) {
                document.getElementById('batchError').innerHTML += `
                    <div class="status-message info">
                        ⏳ 等待5秒后处理下一批数据...
                    </div>
                `;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // 尝试保存到数据库
        try {
            document.getElementById('batchError').innerHTML += `
                <div class="status-message info">
                    ⏳ 正在保存数据到数据库...
                </div>
            `;
            
            const response = await fetch('http://localhost:8080/api/students/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ students: validStudents })
            });
            
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('batchError').innerHTML += `
                    <div class="status-message success">
                        ✅ 数据库保存成功！成功: ${result.stats?.success || validStudents.length}, 失败: ${result.stats?.error || 0}
                    </div>
                `;
            } else {
                throw new Error(result.message || '数据库保存失败');
            }
        } catch (dbError) {
            console.error('数据库批量保存失败:', dbError);
            document.getElementById('batchError').innerHTML += `
                <div class="status-message error">
                    ❌ 数据库批量保存失败: ${dbError.message || '服务器错误'}
                </div>
            `;
        }
        
        // 显示最终结果
        document.getElementById('batchError').innerHTML += `
            <div class="status-message ${successCount > 0 ? 'success' : 'error'}">
                📊 批量导入结果: 成功 ${successCount} 名学生, 失败 ${failCount} 名学生
                ${successCount > 0 ? `<br>最后成功交易哈希: ${lastTransactionHash}` : ''}
            </div>
        `;
        
        // 清除预览数据
        if (successCount > 0) {
            document.getElementById('previewContainer').style.display = 'none';
            document.getElementById('importButton').disabled = true;
            excelData = null;
        }
    } catch (error) {
        console.error('批量导入成绩失败:', error);
        document.getElementById('batchError').innerHTML += `
            <div class="status-message error">
                ❌ 批量导入成绩失败: ${error.message}
            </div>
        `;
    }
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

// 检查区块链连接状态
async function checkBlockchainConnection() {
    const blockchainIcon = document.getElementById('blockchainIcon');
    const blockchainStatusText = document.getElementById('blockchainStatusText');

    blockchainIcon.textContent = '🔄';
    blockchainIcon.className = 'status-icon connecting';
    blockchainStatusText.textContent = '正在连接...';
    blockchainStatusText.className = 'connecting';

    // 检查web3是否已初始化
    if (!web3) {
        blockchainIcon.textContent = '❌';
        blockchainIcon.className = 'status-icon disconnected';
        blockchainStatusText.textContent = '未连接 (未找到Web3提供者)';
        blockchainStatusText.className = 'disconnected';
        return;
    }

    try {
        // 尝试获取网络ID
        const networkId = await web3.eth.net.getId();
        const accounts = await web3.eth.getAccounts();

        if (accounts && accounts.length > 0) {
            blockchainIcon.textContent = '✅';
            blockchainIcon.className = 'status-icon connected';
            let networkName = '';

            switch (networkId) {
                case 1:
                    networkName = 'Ethereum主网';
                    break;
                case 3:
                    networkName = 'Ropsten测试网';
                    break;
                case 4:
                    networkName = 'Rinkeby测试网';
                    break;
                case 5:
                    networkName = 'Goerli测试网';
                    break;
                case 42:
                    networkName = 'Kovan测试网';
                    break;
                case 1337:
                    networkName = 'Hardhat本地网络';
                    break;
                case 5777:
                    networkName = 'Ganache本地网络';
                    break;
                case 31337:
                    networkName = 'Hardhat本地网络';
                    break;
                default:
                    networkName = `网络ID: ${networkId}`;
            }

            blockchainStatusText.textContent = `已连接 (${networkName})`;
            blockchainStatusText.className = 'connected';
        } else {
            blockchainIcon.textContent = '⚠️';
            blockchainIcon.className = 'status-icon connecting';
            blockchainStatusText.textContent = '已连接网络，但未获取到账户';
            blockchainStatusText.className = 'connecting';
        }
    } catch (error) {
        console.error('区块链连接检查失败:', error);
        blockchainIcon.textContent = '❌';
        blockchainIcon.className = 'status-icon disconnected';
        blockchainStatusText.textContent = '连接失败';
        blockchainStatusText.className = 'disconnected';
    }
};

