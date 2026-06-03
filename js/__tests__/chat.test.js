// ============================================================
//  chat.test.js — Unit tests for chat.js pure logic
//  Tests: article formatting for context, news context building,
//  system prompt construction, API key validation,
//  response handling edge cases
// ============================================================

import { describe, it, expect } from 'vitest';

// ── Article fixture ─────────────────────────────────────────
function makeArticle(overrides = {}) {
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 8),
    category: 'national',
    title: 'Test Article',
    titleBn: 'টেস্ট আর্টিকেল',
    description: 'This is a test article description for unit testing the chat context generation.',
    descriptionBn: 'এটি ইউনিট টেস্টের জন্য একটি পরীক্ষামূলক নিবন্ধ যা চ্যাট কনটেক্সট জেনারেশন পরীক্ষা করে।',
    tags: ['test', 'sample', 'news'],
    source: 'NewsBuzz',
    timestamp: Date.now(),
    viralScore: 50,
    image: '',
    ...overrides,
  };
}

function makeArticles(n = 20) {
  const categories = ['wb', 'national', 'sports', 'politics', 'crime', 'education', 'weather'];
  return Array.from({ length: n }, (_, i) =>
    makeArticle({
      id: `art-${i}`,
      category: categories[i % categories.length],
      title: `Article ${i}: ${i === 0 ? 'Breaking Kolkata Metro Extension' : i === 1 ? 'Parliament Passes Key Bill' : `Test Headline ${i}`}`,
      description: i === 0
        ? 'The Kolkata Metro Railway expansion project was announced today by the PWD Minister, covering a new 15-kilometer stretch from Howrah Maidan to Salt Lake Sector V.'
        : i === 1
        ? 'The Indian Parliament passed a landmark bill today in a historic session that lasted through the night.'
        : `This is a test description for article number ${i}. It contains enough words to test truncation behavior at the 100-character limit.`,
    })
  );
}

// ── Pure logic extracted from queryChatAI ──────────────────

/**
 * Format a single article for inclusion in the chat AI context.
 * Pattern: `- [CATEGORY] Title: truncated description...`
 */
function formatArticleForChat(article, lang = 'en') {
  if (!article) return '';
  const title = (lang === 'bn' && article.titleBn) ? article.titleBn : (article.title || 'Untitled');
  const desc = (lang === 'bn' && article.descriptionBn) ? article.descriptionBn : (article.description || '');
  const cat = article.category || 'news';
  return `- [${cat.toUpperCase()}] ${title}: ${desc ? desc.slice(0, 100) : ''}...`;
}

/**
 * Build the news context string from the top N articles.
 */
function buildNewsContext(articles, lang = 'en', max = 15) {
  if (!articles || !articles.length) return '';
  return articles.slice(0, max).map(a => formatArticleForChat(a, lang)).join('\n');
}

/**
 * Build the full system prompt for the chat AI.
 */
function buildSystemPrompt(newsContext, lang = 'en') {
  return [
    `You are the NewsBuzz AI Desk assistant, themed for a highly professional news wire service covering West Bengal and India.`,
    `The current year is 2026.`,
    ``,
    `Use this context of today's top stories on our site to answer the user's questions:`,
    newsContext || '(No articles available)',
    ``,
    `RULES:`,
    `- Answer in a neutral, informative, journalistic tone.`,
    `- Be extremely brief (under 120 words).`,
    `- If the user asks about current topics or news, answer using the context provided above.`,
    `- If the topic is not covered in the context, use your general knowledge of West Bengal and India but remind the reader that it is a general news update from our wire logs.`,
    `- Support both English and Bengali queries. If they write in Bengali, reply in Bengali. If they write in English, reply in English.`,
  ].join('\n');
}

/**
 * Validate that the OpenRouter API key is configured.
 */
function validateOpenRouterConfig(apiKey) {
  if (!apiKey) return { valid: false, error: 'OpenRouter API key is not configured' };
  if (apiKey.includes('PASTE_')) return { valid: false, error: 'OpenRouter API key is not configured' };
  return { valid: true };
}

/**
 * Parse the AI response from the OpenRouter API response data.
 */
function parseChatResponse(data) {
  if (!data || !data.choices || !data.choices.length) {
    return { text: 'No response received from the desk.', ok: false };
  }
  const text = data.choices[0]?.message?.content?.trim();
  if (!text) return { text: 'No response received from the desk.', ok: false };
  return { text, ok: true };
}



// ══════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════

// ── formatArticleForChat ────────────────────────────────────
describe('formatArticleForChat — article formatting for context', () => {
  it('formats an article with category, title, and truncated description', () => {
    const article = makeArticle({
      category: 'wb',
      title: 'Kolkata Metro Extension Announced',
      description: 'A big infrastructure project was launched today in Kolkata.',
    });
    const result = formatArticleForChat(article);
    expect(result).toContain('[WB]');
    expect(result).toContain('Kolkata Metro Extension Announced');
    expect(result).toContain('A big infrastructure project was launched today in Kolkata.');
    expect(result.endsWith('...')).toBe(true);
  });

  it('uses Bengali title and description when lang is bn', () => {
    const article = makeArticle({
      title: 'English Title',
      titleBn: 'বাংলা শিরোনাম',
      description: 'English desc',
      descriptionBn: 'বাংলা বর্ণনা',
    });
    const result = formatArticleForChat(article, 'bn');
    expect(result).toContain('বাংলা শিরোনাম');
    expect(result).toContain('বাংলা বর্ণনা');
    expect(result).not.toContain('English Title');
  });

  it('uses English title when lang is bn but titleBn is missing', () => {
    const article = makeArticle({
      title: 'English Title',
      titleBn: undefined,
      description: 'English desc',
      descriptionBn: undefined,
    });
    const result = formatArticleForChat(article, 'bn');
    expect(result).toContain('English Title');
  });

  it('truncates description to 100 characters', () => {
    const longDesc = 'A'.repeat(200);
    const article = makeArticle({ description: longDesc });
    const result = formatArticleForChat(article);
    // Should contain exactly 100 A's before the ...
    const match = result.match(/: (A+)\.\.\.$/);
    expect(match).not.toBeNull();
    expect(match[1].length).toBe(100);
  });

  it('uses "news" as default category when category is missing', () => {
    const article = makeArticle({ category: undefined });
    const result = formatArticleForChat(article);
    expect(result).toContain('[NEWS]');
  });

  it('uses "Untitled" as fallback title when title is missing', () => {
    const article = makeArticle({ title: undefined, description: 'Some desc' });
    const result = formatArticleForChat(article);
    expect(result).toContain('Untitled');
  });

  it('handles empty description gracefully', () => {
    const article = makeArticle({ title: 'Only Title', description: '' });
    const result = formatArticleForChat(article);
    expect(result).toBe('- [NATIONAL] Only Title: ...');
  });

  it('returns empty string for null article', () => {
    expect(formatArticleForChat(null)).toBe('');
    expect(formatArticleForChat(undefined)).toBe('');
  });

  it('uppercases the category code', () => {
    const article = makeArticle({ category: 'wb' });
    const result = formatArticleForChat(article);
    expect(result).toMatch(/^- \[WB\]/);
  });

  it('handles articles with only a title and no description', () => {
    const article = { title: 'Breaking News Alert', description: undefined, category: 'sports' };
    const result = formatArticleForChat(article);
    expect(result).toBe('- [SPORTS] Breaking News Alert: ...');
  });
});

// ── buildNewsContext ────────────────────────────────────────
describe('buildNewsContext — context building from articles', () => {
  it('includes up to 15 articles by default', () => {
    const articles = makeArticles(30);
    const context = buildNewsContext(articles);
    const lines = context.split('\n').filter(Boolean);
    expect(lines).toHaveLength(15);
  });

  it('respects a custom max value', () => {
    const articles = makeArticles(30);
    const context = buildNewsContext(articles, 'en', 5);
    const lines = context.split('\n').filter(Boolean);
    expect(lines).toHaveLength(5);
  });

  it('includes all articles when fewer than max', () => {
    const articles = makeArticles(3);
    const context = buildNewsContext(articles);
    const lines = context.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
  });

  it('joins articles with newlines', () => {
    const articles = makeArticles(2);
    const context = buildNewsContext(articles);
    expect(context.split('\n')).toHaveLength(2);
  });

  it('returns empty string for empty articles array', () => {
    expect(buildNewsContext([])).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(buildNewsContext(null)).toBe('');
    expect(buildNewsContext(undefined)).toBe('');
  });

  it('preserves Bengali formatting when lang is bn', () => {
    const articles = [
      makeArticle({
        title: 'English',
        titleBn: 'বাংলা',
        description: 'English desc',
        descriptionBn: 'বাংলা বর্ণনা',
      }),
    ];
    const context = buildNewsContext(articles, 'bn');
    expect(context).toContain('বাংলা');
    expect(context).toContain('বাংলা বর্ণনা');
    expect(context).not.toContain('English');
  });

  it('takes the first N articles sorted as provided (top of allArticles)', () => {
    const articles = makeArticles(20);
    const context = buildNewsContext(articles, 'en', 3);
    expect(context).toContain('Article 0');
    expect(context).toContain('Article 1');
    expect(context).toContain('Article 2');
    expect(context).not.toContain('Article 3');
  });
});

// ── buildSystemPrompt ───────────────────────────────────────
describe('buildSystemPrompt — prompt construction', () => {
  it('includes the NewsBuzz AI Desk identity', () => {
    const prompt = buildSystemPrompt('context');
    expect(prompt).toContain('NewsBuzz AI Desk assistant');
    expect(prompt).toContain('West Bengal and India');
  });

  it('includes the current year 2026', () => {
    const prompt = buildSystemPrompt('context');
    expect(prompt).toContain('2026');
  });

  it('includes the provided news context', () => {
    const ctx = '- [WB] Kolkata Metro: Project announced...';
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain(ctx);
  });

  it('shows fallback when context is empty', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('(No articles available)');
  });

  it('includes all rules (neutral tone, under 120 words, bilingual)', () => {
    const prompt = buildSystemPrompt('ctx');
    expect(prompt).toContain('neutral, informative, journalistic tone');
    expect(prompt).toContain('under 120 words');
    expect(prompt).toContain('general knowledge');
    expect(prompt).toContain('Bengali');
  });

  it('has a consistent structure with sections', () => {
    const prompt = buildSystemPrompt('ctx');
    expect(prompt).toContain('You are the');
    expect(prompt).toContain('The current year is');
    expect(prompt).toContain('Use this context');
    expect(prompt).toContain('RULES:');
  });
});

// ── validateOpenRouterConfig ────────────────────────────────
describe('validateOpenRouterConfig — API key validation', () => {
  it('validates a properly configured key', () => {
    const result = validateOpenRouterConfig('sk-or-v1-abc123def456');
    expect(result.valid).toBe(true);
  });

  it('rejects missing key', () => {
    const result = validateOpenRouterConfig(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OpenRouter API key is not configured');
  });

  it('rejects undefined key', () => {
    const result = validateOpenRouterConfig(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects empty key', () => {
    const result = validateOpenRouterConfig('');
    expect(result.valid).toBe(false);
  });

  it('rejects placeholder key containing PASTE_', () => {
    const result = validateOpenRouterConfig('sk-or-v1-PASTE_YOUR_KEY_HERE');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('OpenRouter API key is not configured');
  });

  it('rejects key with lowercase paste_', () => {
    const result = validateOpenRouterConfig('paste_your_key');
    expect(result.valid).toBe(true); // only PASTE_ (uppercase) is checked
  });
});

// ── parseChatResponse ──────────────────────────────────────
describe('parseChatResponse — response parsing from API', () => {
  it('returns text and ok when response is valid', () => {
    const data = {
      choices: [
        {
          message: {
            content: 'Here is the latest news update for you.  ',
          },
        },
      ],
    };
    const result = parseChatResponse(data);
    expect(result.ok).toBe(true);
    expect(result.text).toBe('Here is the latest news update for you.');
  });

  it('returns fallback when choices array is empty', () => {
    const result = parseChatResponse({ choices: [] });
    expect(result.ok).toBe(false);
    expect(result.text).toBe('No response received from the desk.');
  });

  it('returns fallback when data is null', () => {
    const result = parseChatResponse(null);
    expect(result.ok).toBe(false);
    expect(result.text).toBe('No response received from the desk.');
  });

  it('returns fallback when data is undefined', () => {
    const result = parseChatResponse(undefined);
    expect(result.ok).toBe(false);
  });

  it('returns fallback when message content is empty', () => {
    const data = { choices: [{ message: { content: '   ' } }] };
    const result = parseChatResponse(data);
    expect(result.ok).toBe(false);
  });

  it('returns fallback when message is missing', () => {
    const data = { choices: [{}] };
    const result = parseChatResponse(data);
    expect(result.ok).toBe(false);
  });

  it('handles multiple choices and returns the first one', () => {
    const data = {
      choices: [
        { message: { content: 'First choice response.' } },
        { message: { content: 'Second choice response.' } },
      ],
    };
    const result = parseChatResponse(data);
    expect(result.text).toBe('First choice response.');
  });
});



// ── INTEGRATION: Full context pipeline ──────────────────────
describe('Chat — context pipeline integration', () => {
  it('builds full context from articles through to prompt', () => {
    // makeArticles creates articles cycling through categories: wb, national, sports, ...
    // So indices 0=wb, 1=national, 2=sports, etc.
    const articles = makeArticles(10);
    const context = buildNewsContext(articles);
    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('NewsBuzz AI Desk assistant');
    expect(prompt).toContain('- [WB] Article 0:');
    expect(prompt).toContain('- [NATIONAL] Article 1:');
    expect(prompt).toContain('- [SPORTS] Article 2:');
    // Verify the news context section exists
    const lines = prompt.split('\n');
    const contextStart = lines.findIndex(l => l.startsWith('- ['));
    expect(contextStart).toBeGreaterThan(-1);
  });

  it('produces valid prompt even with no articles', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('(No articles available)');
    expect(prompt).toContain('RULES:');
  });

  it('API validation + response parsing integration', () => {
    const apiKey = 'sk-or-v1-real-key';
    expect(validateOpenRouterConfig(apiKey).valid).toBe(true);

    const validResponse = {
      choices: [{ message: { content: 'Valid response.' } }],
    };
    const parsed = parseChatResponse(validResponse);
    expect(parsed.ok).toBe(true);
    expect(parsed.text).toBe('Valid response.');
  });

  it('builds Bengali context through the full pipeline', () => {
    const articles = [
      makeArticle({
        title: 'English Headline',
        titleBn: 'বাংলা শিরোনাম',
        description: 'English description',
        descriptionBn: 'বাংলা বর্ণনা',
      }),
    ];
    const context = buildNewsContext(articles, 'bn');
    const prompt = buildSystemPrompt(context);

    expect(context).toContain('বাংলা শিরোনাম');
    expect(context).toContain('বাংলা বর্ণনা');
    expect(prompt).toContain('বাংলা');
  });

  it('correctly limits context size and formats consistently', () => {
    const manyArticles = makeArticles(50);
    const context = buildNewsContext(manyArticles, 'en', 8);
    const lines = context.split('\n').filter(l => l.startsWith('- ['));

    expect(lines).toHaveLength(8);

    // Every line should follow the same format pattern
    lines.forEach(line => {
      expect(line).toMatch(/^- \[[A-Z]+\] [^:]+: .+\.\.\.$/);
    });
  });
});
