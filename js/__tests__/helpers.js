// ============================================================
//  Test helpers — pure implementations of sorting, filtering,
//  and utility functions extracted from news.js and search.js
// ============================================================

// ── Category labels ─────────────────────────────────────────
export const SECTIONS = {
  wb        : { en: 'West Bengal',         bn: 'পশ্চিমবঙ্গ' },
  national  : { en: 'National India',      bn: 'জাতীয় ভারত' },
  govt      : { en: 'Govt Schemes',        bn: 'সরকারি প্রকল্প' },
  politics  : { en: 'Politics',            bn: 'রাজনীতি' },
  crime     : { en: 'Crime & Law',         bn: 'অপরাধ ও আইন' },
  education : { en: 'Education',           bn: 'শিক্ষা' },
  sports    : { en: 'Sports',              bn: 'খেলাধুলা' },
  weather   : { en: 'Weather',             bn: 'আবহাওয়া' },
};

export function catLabel(cat, lang = 'en') {
  return SECTIONS[cat] ? (lang === 'bn' ? SECTIONS[cat].bn : SECTIONS[cat].en) : cat;
}

// ── Time ago ────────────────────────────────────────────────
export function timeAgo(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1)  return 'এইমাত্র / Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Filter by category ──────────────────────────────────────
export function byCategory(articles, cat, n = 20) {
  return articles.filter(a => a.category === cat).slice(0, n);
}

// ── Sort by viral score (trending) ──────────────────────────
export function sortByViralScore(articles, limit = 5) {
  return [...articles]
    .sort((a, b) => (b.viralScore || 0) - (a.viralScore || 0))
    .slice(0, limit);
}

// ── Sort by newest timestamp first ──────────────────────────
export function sortByNewest(articles) {
  return [...articles].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

// ── Search filter (match title, description, tags) ──────────
export function searchArticles(articles, query) {
  if (!query) return [];
  const q = query.toLowerCase();
  return articles.filter(a =>
    (a.title       || '').toLowerCase().includes(q) ||
    (a.description || '').toLowerCase().includes(q) ||
    (a.titleBn     || '').includes(query) ||
    (a.descriptionBn || '').includes(query) ||
    (a.tags        || []).some(t => t.toLowerCase().includes(q))
  );
}

// ── Pagination range with ellipsis ──────────────────────────
export function getPaginationRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push('...');
    pages.push(total);
  }

  return pages;
}

// ── Article recommendation scoring ──────────────────────────
export function getRecommendedArticle(articles, currentId, interest = {}) {
  const current = articles.find(a => a.id === currentId);
  if (!current) return null;

  const scored = articles
    .filter(a => a.id !== currentId)
    .map(a => {
      let score = 0;
      if (a.category === current.category) score += 10;
      score += (interest[a.category] || 0) * 5;
      const sharedTags = (a.tags || []).filter(t => (current.tags || []).includes(t)).length;
      score += sharedTags * 2;
      const age = Date.now() - (a.timestamp || 0);
      score += Math.max(0, 24 - Math.floor(age / 3600000));
      return { article: a, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0].article : null;
}

// ── Text highlighting ───────────────────────────────────────
export function highlightText(text, query) {
  if (!text || !query) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const words = escaped.split(/\s+/).filter(Boolean);
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  words.forEach(word => {
    if (word.length < 2) return;
    const regex = new RegExp(`(${word})`, 'gi');
    result = result.replace(regex, '<span class="search-highlight">$1</span>');
  });
  return result;
}

// ── Helper to create sample articles for tests ──────────────
export function makeArticle(overrides = {}) {
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 8),
    category: 'national',
    title: 'Test Article',
    titleBn: 'টেস্ট আর্টিকেল',
    description: 'This is a test article description for unit testing.',
    descriptionBn: 'এটি ইউনিট টেস্টের জন্য একটি পরীক্ষামূলক নিবন্ধ।',
    tags: ['test', 'sample', 'news'],
    source: 'NewsBuzz',
    timestamp: Date.now(),
    viralScore: 50,
    image: '',
    ...overrides,
  };
}

// ── Create a dataset of diverse articles for testing ────────
export function createTestDataset() {
  const now = Date.now();
  return [
    makeArticle({ id: 'a1', category: 'wb', title: 'Kolkata Metro News', viralScore: 82, timestamp: now - 60000 }),
    makeArticle({ id: 'a2', category: 'national', title: 'Parliament Bill Passed', viralScore: 76, timestamp: now - 120000 }),
    makeArticle({ id: 'a3', category: 'sports', title: 'India Wins Cricket Match', viralScore: 95, timestamp: now - 300000 }),
    makeArticle({ id: 'a4', category: 'politics', title: 'Election Campaign Heats Up', viralScore: 88, timestamp: now - 600000 }),
    makeArticle({ id: 'a5', category: 'crime', title: 'CBI Makes Arrests', viralScore: 71, timestamp: now - 900000 }),
    makeArticle({ id: 'a6', category: 'education', title: 'Board Results Announced', viralScore: 93, timestamp: now - 1800000 }),
    makeArticle({ id: 'a7', category: 'weather', title: 'Cyclone Alert Issued', viralScore: 67, timestamp: now - 3600000 }),
    makeArticle({ id: 'a8', category: 'wb', title: 'Bengal Flood Update', viralScore: 79, timestamp: now - 7200000 }),
    makeArticle({ id: 'a9', category: 'national', title: 'GDP Growth Figures Released', viralScore: 60, timestamp: now - 14400000 }),
    makeArticle({ id: 'a10', category: 'sports', title: 'ISL Football Match Tonight', viralScore: 85, timestamp: now - 28800000 }),
  ];
}
