// AI聊天功能实现
function sendMessage() {
  const userMessageInput = document.getElementById('user-message');
  const userMessage = userMessageInput.value.trim();
  
  if (!userMessage) return;
  
  // 清空输入框
  userMessageInput.value = '';
  
  // 添加用户消息到聊天窗口
  addMessage(userMessage, 'user');
  
  // 显示正在输入指示器
  showTypingIndicator();
  
  // 发送请求到AI服务 - 修改为使用您的后端API
  fetch('http://localhost:3000/api/spark', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: userMessage })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('网络响应不正常');
    }
    return response.json();
  })
  .then(data => {
    // 隐藏正在输入指示器
    hideTypingIndicator();
    
    // 根据您的后端API响应格式进行调整
    if (data.response) {
      // 添加AI回复到聊天窗口
      addMessage(data.response, 'ai');
    } else {
      // 显示错误消息
      addMessage('抱歉，我遇到了一些问题: ' + (data.error || '未知错误'), 'ai');
    }
  })
  .catch(error => {
    // 隐藏正在输入指示器
    hideTypingIndicator();
    
    // 显示错误消息
    addMessage('连接AI服务失败，请确保服务已启动: ' + error.message, 'ai');
    console.error('AI服务请求失败:', error);
  });
}

// 添加消息到聊天窗口
// 添加快速提问功能
function askQuestion(question) {
  const userMessageInput = document.getElementById('user-message');
  userMessageInput.value = question;
  sendMessage();
}

// 更新添加消息的函数，增加图标
function addMessage(text, sender) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  // 为AI消息添加图标
  let messageContent = '';

  
  // 处理换行符和链接
  const formattedText = formatMessageText(text);
  
  // 添加消息内容
  messageDiv.innerHTML = messageContent + formattedText;
  
  // 删除添加时间戳的代码
  
  chatMessages.appendChild(messageDiv);
  
  // 滚动到底部
  scrollToBottom();
}

// 格式化消息文本，处理换行符和链接
function formatMessageText(text) {
  // 将换行符转换为<br>
  let formattedText = text.replace(/\n/g, '<br>');
  
  // 将URL转换为可点击的链接
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formattedText = formattedText.replace(urlRegex, url => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  
  return formattedText;
}

// 显示正在输入指示器
function showTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages');
  
  // 创建打字指示器
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typing-indicator';
  
  // 添加动画点
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    typingDiv.appendChild(dot);
  }
  
  chatMessages.appendChild(typingDiv);
  
  // 滚动到底部
  scrollToBottom();
}

// 隐藏正在输入指示器
function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// 滚动聊天窗口到底部
function scrollToBottom() {
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 处理按下Enter键发送消息
document.addEventListener('DOMContentLoaded', function() {
  const userMessageInput = document.getElementById('user-message');
  if (userMessageInput) {
    userMessageInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        sendMessage();
      }
    });
  }
  
  // 初始化聊天功能按钮
  initChatFeatures();
});

// 初始化聊天功能按钮
function initChatFeatures() {
  const features = document.querySelectorAll('.feature');
  
  features.forEach(feature => {
    feature.addEventListener('click', function() {
      const featureText = this.querySelector('span').textContent;
      let message = '';
      
      switch(featureText) {
        case '提问系统功能':
          message = '请问校园管理系统有哪些主要功能？';
          break;
        case '查询使用指南':
          message = '我想了解如何使用成绩管理功能，能提供指南吗？';
          break;
        case '报告问题':
          message = '我在使用系统时遇到了问题，请问如何解决？';
          break;
        default:
          message = featureText;
      }
      
      // 设置输入框内容
      const userMessageInput = document.getElementById('user-message');
      userMessageInput.value = message;
      userMessageInput.focus();
    });
  });
}