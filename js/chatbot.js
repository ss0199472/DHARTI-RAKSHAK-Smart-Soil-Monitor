/**
 * ============================================================================
 * DHARTI RAKSHAK - NATURE-TECH AI CHATBOT CONTROLLER
 * ============================================================================
 * Coordinates conversational interaction with Groq AI via the Render backend.
 */

export class DhartiChatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isProcessing = false;
    this.backendUrl = localStorage.getItem('dharti_backend_url') || 'http://localhost:5000';
  }

  setBackendUrl(url) {
    this.backendUrl = (url || '').replace(/\/$/, '');
    localStorage.setItem('dharti_backend_url', this.backendUrl);
  }

  init() {
    this.cacheDom();
    this.attachEvents();
    this.renderInitialMessage();
  }

  cacheDom() {
    this.toggleBtn = document.getElementById('dharti-chat-toggle');
    this.chatWindow = document.getElementById('dharti-chat-window');
    this.closeBtn = document.getElementById('chat-close-btn');
    this.newChatBtn = document.getElementById('chat-new-btn');
    this.messagesContainer = document.getElementById('chat-messages-container');
    this.inputField = document.getElementById('chat-user-input');
    this.sendBtn = document.getElementById('chat-send-btn');
    this.suggestionsContainer = document.getElementById('chat-suggestions-container');
  }

  attachEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleChat());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeChat());
    }

    if (this.newChatBtn) {
      this.newChatBtn.addEventListener('click', () => this.resetChat());
    }

    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    if (this.inputField) {
      this.inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // Attach suggested query click delegation
    if (this.suggestionsContainer) {
      this.suggestionsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.chat-suggestion-pill');
        if (pill) {
          const query = pill.getAttribute('data-query');
          if (query) {
            this.sendUserMessage(query);
          }
        }
      });
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.chatWindow) {
      if (this.isOpen) {
        this.chatWindow.classList.add('active');
        if (this.inputField) this.inputField.focus();
      } else {
        this.chatWindow.classList.remove('active');
      }
    }
  }

  closeChat() {
    this.isOpen = false;
    if (this.chatWindow) this.chatWindow.classList.remove('active');
  }

  resetChat() {
    this.messages = [];
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
    this.renderInitialMessage();
  }

  renderInitialMessage() {
    const welcomeHtml = `
      <div class="chat-msg chat-msg-ai">
        <div class="chat-avatar">🌱</div>
        <div class="chat-bubble">
          <p><strong>Namaste! I am Dharti AI</strong> 🌿</p>
          <p>Your intelligent agronomy & project assistant for <strong>Dharti Rakshak</strong>. I have real-time access to your RS-485 Modbus soil telemetry and project details.</p>
          <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 6px;">How can I assist your farm today?</p>
        </div>
      </div>
    `;
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = welcomeHtml;
    }
  }

  handleSendMessage() {
    if (!this.inputField) return;
    const text = this.inputField.value.trim();
    if (!text || this.isProcessing) return;
    this.inputField.value = '';
    this.sendUserMessage(text);
  }

  async sendUserMessage(userText) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // 1. Append user message to UI
    this.appendMessage('user', userText);
    this.messages.push({ role: 'user', content: userText });

    // 2. Show Typing Indicator
    const typingId = this.showTypingIndicator();

    try {
      // 3. Send request to Render backend
      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages,
          deviceId: 'dharti-node-01'
        })
      });

      this.removeTypingIndicator(typingId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.reply || "I am currently unable to generate a response. Please check your backend connection.";

      this.appendMessage('ai', aiReply);
      this.messages.push({ role: 'assistant', content: aiReply });

    } catch (err) {
      this.removeTypingIndicator(typingId);
      console.error('[Chatbot Error]', err);

      let fallbackText = `⚠️ <strong>Connection Notice:</strong> Unable to connect to Dharti AI backend service.`;
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        fallbackText += `<br><span style="font-size: 0.78rem; color: var(--text-dim);">Please ensure your Render backend service is deployed and configured in the Admin Panel.</span>`;
      } else {
        fallbackText += `<br><span style="font-size: 0.78rem; color: #f87171;">${err.message}</span>`;
      }

      this.appendMessage('ai', fallbackText, true);
    } finally {
      this.isProcessing = false;
      this.scrollToBottom();
    }
  }

  appendMessage(role, content, isError = false) {
    if (!this.messagesContainer) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg chat-msg-${role} ${isError ? 'chat-msg-error' : ''}`;

    const formattedContent = this.formatMarkdown(content);

    if (role === 'ai') {
      msgDiv.innerHTML = `
        <div class="chat-avatar">🌱</div>
        <div class="chat-bubble">${formattedContent}</div>
      `;
    } else {
      msgDiv.innerHTML = `
        <div class="chat-bubble">${formattedContent}</div>
      `;
    }

    this.messagesContainer.appendChild(msgDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    if (!this.messagesContainer) return null;
    const id = `typing-${Date.now()}`;
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'chat-msg chat-msg-ai typing-msg';
    typingDiv.innerHTML = `
      <div class="chat-avatar">🌱</div>
      <div class="chat-bubble typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
    return id;
  }

  removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  formatMarkdown(text) {
    if (!text) return '';
    
    let html = text
      // Escape HTML tags to prevent XSS (while preserving our intended bold tags)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic *text*
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline `code`
      .replace(/`(.*?)`/g, '<code class="chat-code">$1</code>')
      // Bullet points
      .replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>')
      // Line breaks
      .replace(/\n/g, '<br>');

    // Wrap multiple <li> into <ul>
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Unescape our custom safe tags
    html = html
      .replace(/&lt;strong&gt;/g, '<strong>')
      .replace(/&lt;\/strong&gt;/g, '</strong>')
      .replace(/&lt;em&gt;/g, '<em>')
      .replace(/&lt;\/em&gt;/g, '</em>')
      .replace(/&lt;code class="chat-code"&gt;/g, '<code class="chat-code">')
      .replace(/&lt;\/code&gt;/g, '</code>')
      .replace(/&lt;ul&gt;/g, '<ul style="margin: 4px 0 6px 18px; padding: 0;">')
      .replace(/&lt;\/ul&gt;/g, '</ul>')
      .replace(/&lt;li&gt;/g, '<li style="margin-bottom: 3px;">')
      .replace(/&lt;\/li&gt;/g, '</li>')
      .replace(/&lt;br&gt;/g, '<br>')
      .replace(/&lt;span(.*?)&gt;/g, '<span$1>')
      .replace(/&lt;\/span&gt;/g, '</span>');

    return html;
  }
}

export const dhartiChatbot = new DhartiChatbot();
