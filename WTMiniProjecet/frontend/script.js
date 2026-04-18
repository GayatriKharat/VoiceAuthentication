const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyList = document.getElementById('history-list');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');

// Backend URL - Adjust if your backend runs on a different port
const BACKEND_URL = 'http://localhost:3000/chat';

// Chat history stored in localStorage
let chatHistory = [];
let currentChatId = null;

// Initialize app
function initApp() {
    loadChatHistory();
    startNewChat();
    renderHistoryList();
}

// Start a new chat
function startNewChat() {
    currentChatId = Date.now().toString();
    chatHistory.push({
        id: currentChatId,
        title: '',
        messages: [],
        timestamp: new Date().toLocaleString()
    });
    clearChatDisplay();
    saveChatHistory();
    renderHistoryList();
}

// Save chat history to localStorage
function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Load chat history from localStorage
function loadChatHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
            if (chatHistory.length === 0) {
                startNewChat();
            } else {
                currentChatId = chatHistory[chatHistory.length - 1].id;
            }
        } catch {
            chatHistory = [];
            startNewChat();
        }
    } else {
        startNewChat();
    }
}

// Get current chat
function getCurrentChat() {
    return chatHistory.find(chat => chat.id === currentChatId);
}

// Add message to current chat
function addMessage(content, sender) {
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    // Remove welcome screen on first message
    const welcomeScreen = chatBox.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.remove();
    }

    // Limit chat title to first message
    if (currentChat.messages.length === 0 && sender === 'user') {
        currentChat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }

    currentChat.messages.push({ content, sender });
    saveChatHistory();

    // Display message in UI
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Show typing indicator
function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.id = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.classList.add('typing-dot');
        typingDiv.appendChild(dot);
    }
    
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Remove typing indicator
function removeTyping() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Clear chat display and show welcome screen
function clearChatDisplay() {
    chatBox.innerHTML = `
        <div class="welcome-screen">
            <div class="welcome-icon">💬</div>
            <h2>Welcome to ChatBot Assistant</h2>
            <p>Start a conversation by typing a message below</p>
        </div>
    `;
}

// Display chat from history
function displayChat(chatId) {
    currentChatId = chatId;
    const chat = getCurrentChat();
    
    if (chat) {
        clearChatDisplay();
        if (chat.messages.length === 0) {
            clearChatDisplay();
        } else {
            chatBox.innerHTML = '';
            chat.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message', msg.sender === 'user' ? 'user-message' : 'bot-message');
                
                const contentDiv = document.createElement('div');
                contentDiv.classList.add('message-content');
                contentDiv.textContent = msg.content;
                
                messageDiv.appendChild(contentDiv);
                chatBox.appendChild(messageDiv);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        renderHistoryList();
    }
}

// Render history list
function renderHistoryList() {
    historyList.innerHTML = '';
    
    // Show chats in reverse order (newest first)
    [...chatHistory].reverse().forEach(chat => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        if (chat.id === currentChatId) {
            item.classList.add('active');
        }
        
        item.innerHTML = `
            <div class="history-item-content">
                <p class="history-item-title">${chat.title || 'New Chat'}</p>
                <p class="history-item-time">${chat.timestamp}</p>
            </div>
            <button class="history-item-delete" data-id="${chat.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;
        
        const contentArea = item.querySelector('.history-item-content');
        contentArea.addEventListener('click', () => displayChat(chat.id));
        
        const deleteBtn = item.querySelector('.history-item-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        historyList.appendChild(item);
    });
}

// Delete a chat
function deleteChat(chatId) {
    chatHistory = chatHistory.filter(chat => chat.id !== chatId);
    saveChatHistory();
    
    if (currentChatId === chatId) {
        if (chatHistory.length > 0) {
            currentChatId = chatHistory[chatHistory.length - 1].id;
            displayChat(currentChatId);
        } else {
            startNewChat();
        }
    }
    renderHistoryList();
}

// Send message
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    
    userInput.value = '';
    sendBtn.disabled = true;
    
    addMessage(text, 'user');
    showTyping();
    
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text })
        });
        
        const data = await response.json();
        removeTyping();
        
        if (response.ok) {
            addMessage(data.reply, 'bot');
        } else {
            addMessage(data.error || 'Oops! Something went wrong.', 'bot');
        }
    } catch (error) {
        removeTyping();
        addMessage('Error: Cannot connect to the server. Is the backend running?', 'bot');
        console.error('Fetch error:', error);
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
        renderHistoryList();
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

newChatBtn.addEventListener('click', () => {
    startNewChat();
    userInput.focus();
    sidebar.classList.remove('active');
});

clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
        chatHistory = [];
        saveChatHistory();
        startNewChat();
        renderHistoryList();
    }
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar') && !e.target.closest('.menu-toggle')) {
        sidebar.classList.remove('active');
    }
});

// Initialize
initApp();


