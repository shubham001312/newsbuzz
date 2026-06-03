// ============================================================
//  js/openrouter.js  — OpenRouter AI engine
//  Handles: article generation, hot-news detection,
//           SEO tags, viral scoring, auto-publish loop.
//  Do NOT edit. Change API key in js/config.js only.
// ============================================================

import { saveArticle, articleExists } from './firebase.js';

// ── Categories + their hot-topic seed queries ────────────────
const CATEGORY_TOPICS = {
  wb: [
    'West Bengal breaking news today',
    'Kolkata latest news',
    'West Bengal politics today',
    'West Bengal flood cyclone weather emergency',
    'Mamata Banerjee latest news',
    'West Bengal TMC BJP news',
    'Kolkata crime law enforcement news',
    'West Bengal government scheme announcement',
    'Darjeeling Siliguri news today',
    'Howrah Murshidabad Malda news',
  ],
  national: [
    'India breaking news today',
    'Modi government latest news',
    'Indian Parliament session news',
    'India economy GDP news today',
    'India China border news',
    'India Pakistan latest news',
    'Supreme Court India judgment today',
    'Indian Railways latest update',
    'India inflation price rise news',
    'India election news today',
  ],
  govt: [
    'PM Modi new scheme launch India 2024',
    'West Bengal government yojana scheme',
    'Pradhan Mantri Awas Yojana update',
    'PM Kisan Samman Nidhi update',
    'Ayushman Bharat health scheme news',
    'Government subsidy scheme India 2024',
    'Digital India initiative news',
    'MGNREGA scheme Bengal update',
    'India budget scheme announcement',
    'State government new policy West Bengal',
  ],
  politics: [
    'India political news today',
    'BJP Congress TMC political fight',
    'West Bengal election news',
    'Lok Sabha Rajya Sabha session debate',
    'Opposition party India news',
    'Political rally West Bengal today',
    'Chief Minister West Bengal latest',
    'India state politics news',
    'MLA MP arrest controversy India',
    'Alliance formation India politics',
  ],
  crime: [
    'West Bengal crime news today',
    'Kolkata murder robbery case',
    'CBI ED arrest India today',
    'West Bengal police crackdown',
    'India corruption scam arrest',
    'Drug trafficking Bengal news',
    'Cyber crime India latest news',
    'Woman safety Bengal crime news',
    'India court verdict judgment crime',
    'Bengal ration scam police action',
  ],
  education: [
    'West Bengal board exam result 2024',
    'WBCHSE WBBSE result news',
    'University admission Bengal news',
    'India education policy news today',
    'JEE NEET exam result news',
    'School college Bengal news today',
    'Government scholarship Bengal students',
    'Education reform India latest news',
    'Teacher recruitment Bengal TET news',
    'Study abroad scholarship India 2024',
  ],
  sports: [
    'India cricket match today news',
    'IPL cricket latest news',
    'East Bengal Mohun Bagan football news',
    'India Olympics sports news',
    'ISL Indian Super League news',
    'Bengal athletes sports achievement',
    'India football cricket hockey news',
    'Virat Kohli Rohit Sharma cricket news',
    'India vs match score today',
    'Sports award India Bengal today',
  ],
  weather: [
    'West Bengal weather forecast today',
    'Kolkata temperature rain forecast',
    'IMD weather alert West Bengal',
    'Cyclone Bay of Bengal warning',
    'Flood river level Bengal today',
    'Heatwave cold wave Bengal forecast',
    'Monsoon rain Bengal update today',
    'West Bengal storm alert today',
    'India weather disaster news today',
    'Drought flood Bengal district news',
  ],
};

// ── Call OpenRouter API ──────────────────────────────────────
async function callOpenRouter(prompt, maxTokens = 1200) {
  if (!CONFIG.OPENROUTER_API_KEY || CONFIG.OPENROUTER_API_KEY.includes('PASTE_')) {
    throw new Error('OpenRouter API key is not configured');
  }

  const res = await fetch(CONFIG.OPENROUTER_URL, {
    method  : 'POST',
    headers : {
      'Content-Type'  : 'application/json',
      'Authorization' : `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
      'HTTP-Referer'  : CONFIG.OPENROUTER_SITE_URL || window.location.origin,
      'X-Title'       : CONFIG.OPENROUTER_APP_NAME || CONFIG.SITE_NAME || 'NewsBuzz',
    },
    body: JSON.stringify({
      model    : CONFIG.OPENROUTER_MODEL,
      messages : [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message ? `: ${err.error.message}` : '';
    } catch {}
    throw new Error(`OpenRouter HTTP ${res.status}${detail}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Parse JSON safely from AI response ──────────────────────
function parseJSON(text) {
  try {
    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(clean);
  } catch {
    // Try to extract JSON object from mixed text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

// ── Generate full article with SEO from a topic ─────────────
export async function generateArticle(topic, category) {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  
  const customPersona = localStorage.getItem('nb_ai_persona') || '';
  const customFocus = localStorage.getItem('nb_ai_focus') || '';
  const customSeo = localStorage.getItem('nb_ai_seo') || '';
  
  const prompt = `
You are a professional senior Indian news journalist for NewsBuzz, a prestigious news wire service covering West Bengal and India with integrity and accuracy.

Write a complete, publication-ready news article about: "${topic}"
Category: ${category}

${customPersona ? `YOUR EDITORIAL VOICE: ${customPersona}` : 'STYLE: Professional PTI/ANI wire service — factual, neutral, authoritative, no editorializing, no sensationalism. Write with the gravitas of a national newspaper.'}

${customFocus ? `FOCUS TOPICS: ${customFocus}` : ''}

CRITICAL DATE CONTEXT:
- TODAY's EXACT DATE: ${todayStr}
- The CURRENT YEAR is 2026 (NOT 2024, NOT 2025).
- ALL time references, dates, and events mentioned MUST be relative to 2026.
- Example: Instead of "next month" use the actual month name like "June 2026" or "July 2026".
- Instead of "last year" use "2025" or specific months.

RULES:
- Write in PTI/ANI wire service style — factual, neutral, no opinion, no first-person
- 3-4 paragraphs, 200-280 words total
- Include SPECIFIC details: exact numbers, real place names in West Bengal/India, official designations
- Make it feel like REAL breaking news happening RIGHT NOW in 2026
- Generate 2 real or highly plausible news source citations (e.g. Times of India, NDTV, Anandabazar Patrika, PTI, The Hindu, Indian Express) with their URLs.
- DO NOT reference any year other than 2026 for current events
- Every article MUST have proper journalistic structure: lede (who, what, where, when), body (context, details, quotes), ending (what happens next)

${customSeo ? `SEO STRATEGY: ${customSeo}` : ''}

ALSO generate:
- SEO meta title (under 60 chars, include primary keyword, specific to Indian Google search)
- SEO meta description (under 160 chars, compelling news summary)
- 8-12 SEO tags/keywords (mix of short-tail and long-tail, optimized for Indian Google search)
- Open Graph title (for social sharing on WhatsApp/Facebook)
- Viral score: 0-100 (how likely this spreads on WhatsApp/Facebook in Bengal — based on real news virality patterns)
- Bengali title (same headline translated to professional Bengali)
- Bengali description (full 3-4 paragraph article body translated to professional Bengali)
- Image search query (3-5 words, specific, for relevant stock imagery)
- 2-3 credible source citations with names and URLs

Return ONLY valid JSON, no markdown, no extra text:
{
  "title": "Professional news headline with 2026 date references",
  "titleBn": "বাংলায় পেশাদার শিরোনাম",
  "description": "Full 3-4 paragraph article in English with 2026-specific dates, journalistic style…",
  "descriptionBn": "বাংলায় পূর্ণ ৩-৪ অনুচ্ছেদের পেশাদার বিবরণ...",
  "seoTitle": "SEO optimized title under 60 chars",
  "seoDesc": "Meta description under 160 chars for Google India",
  "ogTitle": "Social sharing title for WhatsApp/Facebook",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "imageQuery": "specific image search term",
  "viralScore": 75,
  "category": "${category}",
  "sources": [
    { "name": "Credible Source Name", "url": "https://..." },
    { "name": "Credible Source Name", "url": "https://..." }
  ]
}`;

  const raw  = await callOpenRouter(prompt, 1500);
  const data = parseJSON(raw);
  if (!data || !data.title) throw new Error('Invalid article JSON from OpenRouter');
  return data;
}

// ── Generate live search article on demand ───────────────────
export async function generateSearchArticle(topic, category = 'national') {
  const customPersona = localStorage.getItem('nb_ai_persona') || '';
  
  const prompt = `
You are a professional senior Indian news journalist for NewsBuzz, a trusted news wire service.

Write an authentic, publication-ready news report about this search topic: "${topic}"
Category: ${category}

${customPersona ? `EDITORIAL VOICE: ${customPersona}` : 'STYLE: Factual, neutral, authoritative wire-service journalism. No opinion, no first-person.'}

RULES:
- Write in professional PTI/ANI wire-service style — factual, neutral, authoritative.
- 3-4 paragraphs, 200-280 words total.
- Ground the article with authentic facts, names, and places if available, or write a highly plausible current news update.
- The current year is 2026. Make sure all time/date references are relative to 2026.
- Create 2 real or highly plausible news source citations (e.g. Times of India, NDTV, PTI, Anandabazar Patrika) with URL links.
- Follow journalistic structure: lede paragraph with key facts, context paragraph, details/quotes, concluding with significance or next steps.

Return ONLY valid JSON, no markdown, no extra text:
{
  "title": "Professional news headline",
  "titleBn": "বাংলায় পেশাদার শিরোনাম",
  "description": "Full 3-4 paragraph article in English in wire-service style...",
  "descriptionBn": "বাংলায় পূর্ণ ৩-৪ অনুচ্ছেদের পেশাদার বিবরণ...",
  "seoTitle": "SEO optimized title under 60 chars",
  "seoDesc": "Meta description under 160 chars for Google India",
  "ogTitle": "Social sharing title",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "imageQuery": "specific image search term",
  "viralScore": 80,
  "category": "${category}",
  "sources": [
    { "name": "Credible Source Name", "url": "https://..." },
    { "name": "Credible Source Name", "url": "https://..." }
  ]
}`;

  const raw  = await callOpenRouter(prompt, 1500);
  const data = parseJSON(raw);
  if (!data || !data.title) throw new Error('Invalid article JSON from OpenRouter');
  return data;
}

// ── Detect hot/trending topics in a category ────────────────
export async function detectHotTopics(category) {
  const seeds = CATEGORY_TOPICS[category] || [];
  const prompt = `
You are a news trend analyst specializing in Indian and West Bengal news.

Given these news topic areas for the "${category}" category:
${seeds.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Today's date context: ${new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.

Identify the 5 HOTTEST, most shareable news angles right now that:
1. Have high search volume potential on Google India
2. Are likely trending on WhatsApp groups in West Bengal
3. People would urgently want to read and share
4. Cover real plausible current events in the Indian context

Return ONLY valid JSON array, no extra text:
[
  { "topic": "specific hot topic/angle", "viralEstimate": 85, "reason": "why hot" },
  { "topic": "...", "viralEstimate": 78, "reason": "..." },
  { "topic": "...", "viralEstimate": 72, "reason": "..." },
  { "topic": "...", "viralEstimate": 68, "reason": "..." },
  { "topic": "...", "viralEstimate": 65, "reason": "..." }
]`;

  const raw    = await callOpenRouter(prompt, 800);
  const topics = parseJSON(raw);
  if (!Array.isArray(topics)) return [];
  return topics.filter(t => t.viralEstimate >= CONFIG.MIN_VIRAL_SCORE);
}

// ── Seed 20 articles per category ───────────────────────────
export async function seedCategory(category, onProgress) {
  const seeds = CATEGORY_TOPICS[category] || [];
  let published = 0;

  for (let i = 0; i < Math.min(seeds.length, 20); i++) {
    try {
      const topic  = seeds[i];
      const exists = await articleExists(`seed_${category}_${i}`);
      if (exists) { published++; continue; }

      const article = await generateArticle(topic, category);
      article.source    = 'AI / NewsBuzz';
      article.timestamp = Date.now() - (i * 3_600_000); // stagger timestamps
      article._seedKey  = `seed_${category}_${i}`;

      await saveArticle(article);
      published++;
      if (onProgress) onProgress(category, i + 1, seeds.length, article.title);
      await sleep(800); // rate-limit
    } catch (e) {
      console.warn(`[Seed] ${category} topic ${i} failed:`, e.message);
    }
  }
  return published;
}

// ── Auto-publish loop (runs every CONFIG.AUTO_SCAN_INTERVAL) ─
let autoPublishTimer = null;

export function startAutoPublish(onPublish) {
  if (autoPublishTimer) return;
  console.log('[AutoPublish] Started — interval:', CONFIG.AUTO_SCAN_INTERVAL / 60000, 'min');

  async function runScan() {
    const categories = Object.keys(CATEGORY_TOPICS);
    for (const cat of categories) {
      try {
        const hotTopics = await detectHotTopics(cat);
        for (const hot of hotTopics) {
          try {
            const exists = await articleExists(hot.topic);
            if (exists) continue;

            const article = await generateArticle(hot.topic, cat);
            article.source     = 'AI / NewsBuzz';
            article.timestamp  = Date.now();
            article.autoPosted = true;
            article.hotReason  = hot.reason;

            const id = await saveArticle(article);
            console.log(`[AutoPublish] Published: ${article.title} (score: ${article.viralScore})`);
            if (onPublish) onPublish({ ...article, id });
            await sleep(1500);
          } catch (e) {
            console.warn('[AutoPublish] Article error:', e.message);
          }
        }
        await sleep(2000); // between categories
      } catch (e) {
        console.warn('[AutoPublish] Category error:', cat, e.message);
      }
    }
  }

  // Run immediately, then on interval
  runScan();
  autoPublishTimer = setInterval(runScan, CONFIG.AUTO_SCAN_INTERVAL);
}

export function stopAutoPublish() {
  if (autoPublishTimer) { clearInterval(autoPublishTimer); autoPublishTimer = null; }
}

// ── Utility ──────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
