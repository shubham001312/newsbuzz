// ============================================================
//  js/chat.js  — Floating AI Chatbot
// ============================================================

import { allArticles } from './news.js';

export function initChat() {
  const toggleBtn = document.getElementById('chat-toggle-btn');
  const closeBtn = document.getElementById('chat-close-btn');
  const windowEl = document.getElementById('chat-window');
  const sendBtn = document.getElementById('chat-send-btn');
  const inputEl = document.getElementById('chat-input');
  const messagesEl = document.getElementById('chat-messages');

  if (!toggleBtn || !windowEl) return;

  // Toggle open/close
  toggleBtn.addEventListener('click', () => {
    const isHidden = windowEl.style.display === 'none';
    windowEl.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      inputEl.focus();
      toggleBtn.textContent = '❌';
    } else {
      toggleBtn.textContent = '💬';
    }
  });

  closeBtn.addEventListener('click', () => {
    windowEl.style.display = 'none';
    toggleBtn.textContent = '💬';
  });

  // Send message handler
  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;

    // Append User Message
    appendMessage(text, 'user');
    inputEl.value = '';

    // Append Loading State
    const loadingId = appendMessage('Thinking...', 'bot-loading');
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const reply = await queryChatAI(text);
      removeMessage(loadingId);
      appendMessage(reply, 'bot');
    } catch (e) {
      removeMessage(loadingId);
      appendMessage('Sorry, I encountered an error connecting to the news desk: ' + e.message, 'bot-err');
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}

function appendMessage(text, type) {
  const messagesEl = document.getElementById('chat-messages');
  const id = 'msg_' + Math.random().toString(36).substr(2, 9);
  
  let styles = '';
  if (type === 'user') {
    styles = 'align-self: flex-end; background: var(--accent); color: var(--white); border: 1px solid var(--accent-dk); padding: 8px 12px; max-width: 85%;';
  } else if (type === 'bot-loading') {
    styles = 'align-self: flex-start; background: var(--paper-dark); border: 1px dashed var(--rule-light); padding: 8px 12px; max-width: 85%; color: #888; font-style: italic;';
  } else if (type === 'bot-err') {
    styles = 'align-self: flex-start; background: #fee; border: 1px solid #fcc; padding: 8px 12px; max-width: 85%; color: #c33;';
  } else {
    styles = 'align-self: flex-start; background: var(--paper-dark); border: 1px solid var(--rule-light); padding: 8px 12px; max-width: 85%; color: var(--ink-soft);';
  }

  const msgHtml = `<div id="${id}" class="chat-msg chat-msg--${type}" style="${styles}">${text}</div>`;
  messagesEl.insertAdjacentHTML('beforeend', msgHtml);
  return id;
}

function removeMessage(id) {
  document.getElementById(id)?.remove();
}

async function queryChatAI(userQuery) {
  const lang = window.__lang || 'en';
  
  // Construct news context from top 15 database articles
  const topNews = allArticles.slice(0, 15).map(a => {
    const title = (lang === 'bn' && a.titleBn) ? a.titleBn : a.title;
    const desc = (lang === 'bn' && a.descriptionBn) ? a.descriptionBn : a.description;
    return `- [${a.category.toUpperCase()}] ${title}: ${desc ? desc.slice(0, 100) : ''}...`;
  }).join('\n');

  const systemPrompt = `
You are the NewsBuzz AI Desk assistant, themed for a highly professional news wire service covering West Bengal and India.
The current year is 2026.

Use this context of today's top stories on our site to answer the user's questions:
${topNews}

RULES:
- Answer in a neutral, informative, journalistic tone.
- Be extremely brief (under 120 words).
- If the user asks about current topics or news, answer using the context provided above.
- If the topic is not covered in the context, use your general knowledge of West Bengal and India but remind the reader that it is a general news update from our wire logs.
- Support both English and Bengali queries. If they write in Bengali, reply in Bengali. If they write in English, reply in English.
`;

  // Fetch from OpenRouter via configuration
  if (!CONFIG.OPENROUTER_API_KEY || CONFIG.OPENROUTER_API_KEY.includes('PASTE_')) {
    throw new Error('OpenRouter API key is not configured');
  }

  const res = await fetch(CONFIG.OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
      'HTTP-Referer': CONFIG.OPENROUTER_SITE_URL || window.location.origin,
      'X-Title': CONFIG.OPENROUTER_APP_NAME || 'NewsBuzz AI Chat',
    },
    body: JSON.stringify({
      model: CONFIG.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery }
      ],
      max_tokens: 300,
      temperature: 0.5
    })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response received from the desk.';
}
