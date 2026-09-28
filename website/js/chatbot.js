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
    this.projectName = 'DHARTI RAKSHAK';
    this.projectTagline = 'Technology for Protecting the Earth';
    this.teamName = 'Royal Challenger Kanpur';
    this.teamMembers = [];
    this.systemConfig = null;
  }

  setProjectBranding(systemConfig = {}) {
    if (!systemConfig) return;
    this.systemConfig = systemConfig;
    if (systemConfig.project_name) this.projectName = systemConfig.project_name;
    if (systemConfig.project_tagline) this.projectTagline = systemConfig.project_tagline;
    if (systemConfig.team_name) this.teamName = systemConfig.team_name;
    if (Array.isArray(systemConfig.team_members)) {
      this.teamMembers = systemConfig.team_members
        .filter(m => m && m.visible !== false)
        .map(m => typeof m === 'string' ? m : m.name)
        .filter(Boolean);
    }
    this.updateChatHeaderAndChips();
  }

  updateChatHeaderAndChips() {
    const headerTitleH4 = document.querySelector('#dharti-chat-window .chat-header-title h4');
    if (headerTitleH4) {
      headerTitleH4.innerText = `${this.projectName} AI Assistant`;
    }

    const toggleSpan = document.querySelector('#dharti-chat-toggle span:not(.chat-toggle-pulse)');
    if (toggleSpan) {
      toggleSpan.innerText = `🌱 Ask ${this.projectName} AI`;
    }

    const teamChip = document.querySelector('.chat-suggestion-pill[data-query*="created"], .chat-suggestion-pill[data-query*="Created"]');
    if (teamChip) {
      teamChip.setAttribute('data-query', `Who created ${this.projectName}?`);
      teamChip.innerText = `👥 Who Created ${this.projectName}?`;
    }
  }

  setBackendUrl(url) {
    this.backendUrl = (url || '').replace(/\/$/, '');
    localStorage.setItem('dharti_backend_url', this.backendUrl);
  }

  setGroqConfig(apiKey, model) {
    this.groqApiKey = (apiKey !== undefined ? apiKey : (localStorage.getItem('dharti_groq_api_key') || '')).trim();
    this.groqModel = (model !== undefined ? model : (localStorage.getItem('dharti_groq_model') || 'llama-3.3-70b-versatile')).trim();
  }

  init() {
    this.cacheDom();
    this.attachEvents();
    this.updateChatHeaderAndChips();
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
            this.sendUserPrompt(query);
          }
        }
      });
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.chatWindow) {
      this.chatWindow.classList.toggle('active', this.isOpen);
      if (this.isOpen && this.inputField) {
        setTimeout(() => this.inputField.focus(), 150);
      }
    }
  }

  closeChat() {
    this.isOpen = false;
    if (this.chatWindow) {
      this.chatWindow.classList.remove('active');
    }
  }

  resetChat() {
    this.messages = [];
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
    this.renderInitialMessage();
  }

  renderInitialMessage() {
    const aiName = `${this.projectName} AI`;
    const welcomeMsg = `👋 <strong>Namaste! I am ${aiName}.</strong><br>I am your precision agronomy assistant connected to your live soil sensors and hardware. Ask me anything about your <strong>NPK nutrients, pH, moisture, crop suitability</strong>, or project specifications!`;
    this.appendMessage('ai', welcomeMsg);
  }

  sendUserPrompt(text) {
    if (this.inputField) {
      this.inputField.value = text;
    }
    this.handleSendMessage();
  }

  async handleSendMessage() {
    if (!this.inputField) return;
    const userText = this.inputField.value.trim();
    if (!userText || this.isProcessing) return;

    this.inputField.value = '';
    this.isProcessing = true;

    // 1. Append user message to UI
    this.appendMessage('user', userText);
    this.messages.push({ role: 'user', content: userText });

    // 2. Show Typing Indicator
    const typingId = this.showTypingIndicator();

    try {
      // 3. Send request to Render backend
      const headers = { 'Content-Type': 'application/json' };
      if (this.groqApiKey) headers['x-groq-api-key'] = this.groqApiKey;
      if (this.groqModel) headers['x-groq-model'] = this.groqModel;

      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: this.messages,
          deviceId: 'dharti-node-01',
          groqApiKey: this.groqApiKey || undefined,
          groqModel: this.groqModel || undefined,
          clientConfig: this.systemConfig || {
            project_name: this.projectName,
            project_tagline: this.projectTagline,
            team_name: this.teamName,
            team_members: this.teamMembers.map(name => ({ name, visible: true }))
          }
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
