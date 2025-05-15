// 全局变量
let votingContract;
let provider;
let signer;
let currentAccount;
let currentProposalId;

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    // 检查是否安装了MetaMask
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                // 用户断开连接
                console.log('请连接钱包');
                currentAccount = null;
                updateUI();
            } else {
                // 切换账户
                currentAccount = accounts[0];
                initializeApp();
            }
        });
        
        // 监听链变化
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
        
        // 连接钱包按钮点击事件
        document.getElementById('connectWallet').addEventListener('click', connectWallet);
        
        // 创建提案按钮点击事件
        document.getElementById('createProposal').addEventListener('click', createProposal);
        
        // 初始化投票确认按钮
        document.getElementById('confirmVote').addEventListener('click', confirmVote);
    } else {
        alert('请安装MetaMask或其他Web3钱包扩展程序');
    }
});

// 连接钱包
async function connectWallet() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        initializeApp();
    } catch (error) {
        console.error('连接钱包失败:', error);
        alert('连接钱包失败: ' + error.message);
    }
}

// 初始化应用
async function initializeApp() {
    try {
        signer = await provider.getSigner();
        
        // 加载合约地址和ABI
        const [addressRes, abiRes] = await Promise.all([
            fetch('./scripts/Votingaddress.json'),
            fetch('./scripts/Voting_ABI.json')
        ]);
        
        const addressData = await addressRes.json();
        const abiData = await abiRes.json();
        
        // 初始化合约实例
        votingContract = new ethers.Contract(addressData.address, abiData, signer);
        
        // 更新UI
        updateUI();
        
        // 加载提案
        loadProposals();
    } catch (error) {
        console.error('初始化失败:', error);
        alert('初始化失败: ' + error.message);
    }
}

// 更新UI状态
function updateUI() {
    const connectBtn = document.getElementById('connectWallet');
    
    if (currentAccount) {
        // 截取地址显示
        const shortAddress = `${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;
        connectBtn.innerHTML = `<i class="bi bi-wallet2 me-1"></i> ${shortAddress}`;
        connectBtn.classList.remove('btn-outline-primary');
        connectBtn.classList.add('btn-primary');
    } else {
        connectBtn.innerHTML = '<i class="bi bi-wallet2 me-1"></i> 连接钱包';
        connectBtn.classList.remove('btn-primary');
        connectBtn.classList.add('btn-outline-primary');
    }
}

// 加载提案列表
// 加载提案列表
async function loadProposals() {
  try {
      const proposalsList = document.getElementById('proposalsList');
      proposalsList.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></div>';
      
      // 获取当前提案ID
      currentProposalId = await votingContract.getCurrentProposalId();
      
      // 检查是否有提案
      if (currentProposalId === 0n) {
          try {
              // 尝试获取第一个提案的描述
              const firstProposal = await votingContract.proposals(0);
              if (firstProposal.description === "") {
                  // 如果没有提案
                  proposalsList.innerHTML = '<div class="alert alert-info">目前没有提案，请创建第一个提案。</div>';
                  return;
              }
          } catch (error) {
              // 如果获取提案失败，可能是因为没有提案
              proposalsList.innerHTML = '<div class="alert alert-info">目前没有提案，请创建第一个提案。</div>';
              return;
          }
      }
      
      // 清空列表
      proposalsList.innerHTML = '';
      
      // 加载所有提案
      for (let i = 0; i <= currentProposalId; i++) {
          try {
              const proposal = await votingContract.proposals(i);
              const result = await votingContract.getProposalResult(i);
              
              // 检查提案是否有效（有描述）
              if (proposal.description === "") continue;
              
              // 创建提案卡片
              const proposalCard = document.createElement('div');
              proposalCard.className = 'card proposal-card mb-3';
              
              // 提案状态
              const statusClass = result.ended ? 'status-ended' : 'status-active';
              const statusText = result.ended ? '已结束' : '进行中';
              
              // 投票结果
              const resultText = result.ended 
                  ? (result.result ? '<span class="text-success">通过</span>' : '<span class="text-danger">未通过</span>')
                  : '';
              
              proposalCard.innerHTML = `
                  <div class="card-body">
                      <div class="d-flex justify-content-between align-items-start mb-2">
                          <h5 class="card-title mb-0">提案 #${i}: ${result.description}</h5>
                          <span class="status-badge ${statusClass}">${statusText} ${resultText}</span>
                      </div>
                      <p class="text-muted mb-3"><small>创建者: ${proposal.creator.substring(0, 6)}...${proposal.creator.substring(38)}</small></p>
                      
                      <div class="d-flex justify-content-between align-items-center mb-3">
                          <div>
                              <span class="vote-count yes-count me-3"><i class="bi bi-check-circle-fill me-1"></i> ${result.yes.toString()} 赞成</span>
                              <span class="vote-count no-count"><i class="bi bi-x-circle-fill me-1"></i> ${result.no.toString()} 反对</span>
                          </div>
                          ${!result.ended ? `
                          <div>
                              <button class="btn btn-yes btn-vote me-2" data-proposal-id="${i}" data-vote="true">
                                  <i class="bi bi-check-lg me-1"></i> 赞成
                              </button>
                              <button class="btn btn-no btn-vote" data-proposal-id="${i}" data-vote="false">
                                  <i class="bi bi-x-lg me-1"></i> 反对
                              </button>
                          </div>
                          ` : ''}
                      </div>
                      
                      ${proposal.creator.toLowerCase() === currentAccount?.toLowerCase() && !result.ended ? `
                      <button class="btn btn-outline-danger btn-sm end-voting-btn" data-proposal-id="${i}">
                          <i class="bi bi-stop-circle me-1"></i> 结束投票
                      </button>
                      ` : ''}
                  </div>
              `;
              
              proposalsList.appendChild(proposalCard);
          } catch (error) {
              console.error(`加载提案 #${i} 失败:`, error);
              continue; // 跳过错误的提案
          }
      }
      
      // 如果没有加载到任何有效提案
      if (proposalsList.innerHTML === '') {
          proposalsList.innerHTML = '<div class="alert alert-info">目前没有提案，请创建第一个提案。</div>';
          return;
      }
      
      // 添加投票按钮事件
      document.querySelectorAll('.btn-vote').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const proposalId = e.target.getAttribute('data-proposal-id') || 
                                e.target.closest('.btn-vote').getAttribute('data-proposal-id');
              const vote = e.target.getAttribute('data-vote') === 'true' || 
                            e.target.closest('.btn-vote').getAttribute('data-vote') === 'true';
              
              showVoteModal(proposalId, vote);
          });
      });
      
      // 添加结束投票按钮事件
      document.querySelectorAll('.end-voting-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const proposalId = e.target.getAttribute('data-proposal-id') || 
                                e.target.closest('.end-voting-btn').getAttribute('data-proposal-id');
              endVoting(proposalId);
          });
      });
      
  } catch (error) {
      console.error('加载提案失败:', error);
      document.getElementById('proposalsList').innerHTML = `<div class="alert alert-danger">加载提案失败: ${error.message}</div>`;
  }
}

// 显示投票确认模态框
function showVoteModal(proposalId, vote) {
    const modal = new bootstrap.Modal(document.getElementById('voteModal'));
    document.getElementById('voteType').textContent = vote ? '赞成' : '反对';
    document.getElementById('voteType').className = vote ? 'text-success' : 'text-danger';
    document.getElementById('proposalDescriptionModal').textContent = `提案ID: ${proposalId}`;
    
    // 设置确认按钮的数据属性
    const confirmBtn = document.getElementById('confirmVote');
    confirmBtn.setAttribute('data-proposal-id', proposalId);
    confirmBtn.setAttribute('data-vote', vote);
    
    modal.show();
}

// 确认投票
async function confirmVote(e) {
    const proposalId = e.target.getAttribute('data-proposal-id');
    const vote = e.target.getAttribute('data-vote') === 'true';
    
    try {
        // 禁用按钮防止重复点击
        e.target.disabled = true;
        e.target.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';
        
        // 调用合约投票方法
        const tx = await votingContract.vote(proposalId, vote);
        await tx.wait();
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('voteModal'));
        modal.hide();
        
        // 重新加载提案
        loadProposals();
        
        // 显示成功消息
        alert(`投票成功！交易哈希: ${tx.hash}`);
    } catch (error) {
        console.error('投票失败:', error);
        alert('投票失败: ' + error.message);
        
        // 恢复按钮状态
        e.target.disabled = false;
        e.target.textContent = '确认投票';
    }
}

// 创建提案
async function createProposal() {
    const description = document.getElementById('proposalDescription').value.trim();
    
    if (!description) {
        alert('请输入提案描述');
        return;
    }
    
    if (!currentAccount) {
        alert('请先连接钱包');
        return;
    }
    
    try {
        const btn = document.getElementById('createProposal');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 创建中...';
        
        // 调用合约创建提案方法
        const tx = await votingContract.createProposal(description);
        await tx.wait();
        
        // 清空输入框
        document.getElementById('proposalDescription').value = '';
        
        // 重新加载提案
        loadProposals();
        
        // 显示成功消息
        alert(`提案创建成功！交易哈希: ${tx.hash}`);
    } catch (error) {
        console.error('创建提案失败:', error);
        alert('创建提案失败: ' + error.message);
    } finally {
        const btn = document.getElementById('createProposal');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> 创建提案';
    }
}

// 结束投票
async function endVoting(proposalId) {
    if (!confirm('确定要结束此提案的投票吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const btn = document.querySelector(`.end-voting-btn[data-proposal-id="${proposalId}"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';
        }
        
        // 调用合约结束投票方法
        const tx = await votingContract.endVoting(proposalId);
        await tx.wait();
        
        // 重新加载提案
        loadProposals();
        
        // 显示成功消息
        alert(`投票已结束！交易哈希: ${tx.hash}`);
    } catch (error) {
        console.error('结束投票失败:', error);
        alert('结束投票失败: ' + error.message);
        
        const btn = document.querySelector(`.end-voting-btn[data-proposal-id="${proposalId}"]`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-stop-circle me-1"></i> 结束投票';
        }
    }
}