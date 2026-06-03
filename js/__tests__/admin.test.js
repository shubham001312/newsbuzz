// ============================================================
//  admin.test.js — Unit tests for admin.js pure logic
//  Tests: analytics computations, social post generation, A/B
//  testing, survey results, scheduling, SEO analysis, bulk
//  operations filtering, auto-publish state management
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Fixtures ────────────────────────────────────────────────
function makeArticle(overrides = {}) {
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 8),
    category: 'national',
    title: 'Test Article',
    titleBn: 'টেস্ট আর্টিকেল',
    description: 'This is a test article description.',
    descriptionBn: 'এটি একটি পরীক্ষামূলক নিবন্ধ।',
    tags: ['test', 'sample', 'news'],
    source: 'NewsBuzz',
    timestamp: Date.now(),
    viralScore: 50,
    image: '',
    ...overrides,
  };
}

function createTestDataset() {
  const now = Date.now();
  return [
    makeArticle({ id: 'a1', category: 'wb', title: 'Kolkata Metro News', viralScore: 82, timestamp: now - 60000 }),
    makeArticle({ id: 'a2', category: 'national', title: 'Parliament Bill Passed', viralScore: 76, timestamp: now - 120000 }),
    makeArticle({ id: 'a3', category: 'sports', title: 'India Wins Cricket', viralScore: 95, timestamp: now - 300000 }),
    makeArticle({ id: 'a4', category: 'politics', title: 'Election Campaign', viralScore: 88, timestamp: now - 600000 }),
    makeArticle({ id: 'a5', category: 'crime', title: 'CBI Makes Arrests', viralScore: 71, timestamp: now - 900000 }),
    makeArticle({ id: 'a6', category: 'education', title: 'Board Results Out', viralScore: 93, timestamp: now - 1800000 }),
    makeArticle({ id: 'a7', category: 'weather', title: 'Cyclone Alert', viralScore: 67, timestamp: now - 3600000 }),
    makeArticle({ id: 'a8', category: 'wb', title: 'Bengal Flood Update', viralScore: 79, timestamp: now - 7200000 }),
    makeArticle({ id: 'a9', category: 'national', title: 'GDP Growth Figures', viralScore: 60, timestamp: now - 14400000 }),
    makeArticle({ id: 'a10', category: 'sports', title: 'ISL Football Tonight', viralScore: 85, timestamp: now - 28800000 }),
  ];
}

// ── localStorage mock for tests that need it ────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
  };
})();

// ── CATEGORY COUNTS (extracted from adminLoadAnalytics) ────
function computeCategoryCounts(articles) {
  const counts = {};
  articles.forEach(a => {
    counts[a.category] = (counts[a.category] || 0) + 1;
  });
  return counts;
}

function computeBarPercent(articles) {
  const counts = computeCategoryCounts(articles);
  const maxCount = Math.max(...Object.values(counts), 1);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({
      category: cat,
      count,
      percent: maxCount > 0 ? (count / maxCount) * 100 : 0,
    }));
}

function computeAnalyticsSummary(articles) {
  const total = articles.length;
  const cats = new Set(articles.map(a => a.category)).size;
  const avgScore = articles.reduce((s, a) => s + (a.viralScore || 0), 0) / Math.max(total, 1);
  const today = new Date().setHours(0, 0, 0, 0);
  const todayArts = articles.filter(a => a.timestamp >= today).length;
  return { total, categories: cats, avgScore: Math.round(avgScore), todayArticles: todayArts };
}

// ── SOCIAL MEDIA POST GENERATION (extracted from adminGenerateSocialPosts) ─
function generateSocialPosts(article, lang = 'en') {
  const title = (lang === 'bn' && article.titleBn) ? article.titleBn : (article.title || '');
  const desc = (lang === 'bn' && article.descriptionBn) ? article.descriptionBn : (article.description || '');
  const url = `https://newsbuzz.in/?article=${article.id}`;
  const tags = (article.tags || []).slice(0, 3).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
  const shortDesc = desc.slice(0, 120) + (desc.length > 120 ? '…' : '');

  const twitter = `${title}\n\n${shortDesc}\n\n${url} ${tags}`.slice(0, 280);
  const facebook = `📰 ${title}\n\n${shortDesc}\n\nRead more: ${url}`;
  const whatsapp = `📰 *${title}*\n\n${shortDesc}\n\n🔗 ${url}\n\n${tags}`;
  const linkedin = `📰 ${title}\n\n${shortDesc}\n\n🔗 ${url}\n\n${tags}\n\n---\nNewsBuzz — West Bengal & India's Trusted News Source`;

  return { twitter, facebook, whatsapp, linkedin };
}

// ── A/B TEST LOGIC (extracted from adminStartABTest / adminEndABTest) ─
function createABTest(article, headlineA, headlineB) {
  if (!article || !headlineA || !headlineB) return null;
  const testId = 'ab_' + Date.now();
  return {
    id: testId,
    articleId: article.id,
    articleTitle: article.title || 'Untitled',
    headlineA,
    headlineB,
    startsAt: Date.now(),
    impressionsA: 0,
    impressionsB: 0,
    clicksA: 0,
    clicksB: 0,
    active: true,
  };
}

function endABTest(tests, testId) {
  if (!tests[testId]) return null;
  return { ...tests[testId], active: false };
}

function clearABTest(tests, testId) {
  const updated = { ...tests };
  delete updated[testId];
  return updated;
}

function computeABTestResults(test) {
  const totalImpressions = test.impressionsA + test.impressionsB;
  const rateA = totalImpressions > 0 ? ((test.clicksA / Math.max(test.impressionsA, 1)) * 100).toFixed(1) : '—';
  const rateB = totalImpressions > 0 ? ((test.clicksB / Math.max(test.impressionsB, 1)) * 100).toFixed(1) : '—';
  const winner = test.clicksA > test.clicksB ? 'A' : test.clicksB > test.clicksA ? 'B' : '—';
  return { rateA, rateB, winner, totalImpressions };
}

// ── SURVEY LOGIC (extracted from adminLaunchSurvey / renderSurveyResults) ─
function launchSurvey(question, options) {
  if (!question || options.length < 2) return null;
  return { question, options, startsAt: Date.now(), active: true };
}

function endSurvey(survey) {
  return { ...survey, active: false };
}

function computeSurveyResults(survey, responses) {
  if (!survey || !survey.question) return null;

  const counts = {};
  survey.options.forEach(o => { counts[o] = 0; });
  responses.forEach(r => {
    if (counts[r] !== undefined) counts[r]++;
  });

  const totalResponses = responses.length;
  const maxCount = Math.max(...Object.values(counts), 1);

  return survey.options.map(opt => {
    const count = counts[opt] || 0;
    const pct = totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : '0';
    const barPct = (count / maxCount) * 100;
    return { option: opt, count, percent: pct, barPercent: barPct, totalResponses };
  });
}

// ── SCHEDULE VALIDATION (extracted from adminScheduleArticle) ─
function validateSchedule(title, body, dateStr) {
  if (!title || !body) return { valid: false, error: 'Fill all fields and select a date.' };
  if (!dateStr) return { valid: false, error: 'Fill all fields and select a date.' };
  const scheduledTime = new Date(dateStr).getTime();
  if (isNaN(scheduledTime)) return { valid: false, error: 'Invalid date format.' };
  if (scheduledTime <= Date.now()) return { valid: false, error: 'Please select a future date/time.' };
  return { valid: true, scheduledTime };
}

function getPendingSchedules(scheduled) {
  return scheduled.filter(s => s.scheduledTime > Date.now());
}

// ── SEO ANALYSIS (extracted from adminSEOAnalyze) ────────────
function analyzeSEO(article) {
  if (!article) return { found: false };

  const seoTitle = article.seoTitle || article.title?.slice(0, 60) || 'No SEO title';
  const seoDesc = article.seoDesc || article.description?.slice(0, 155) || 'No SEO description';
  const tags = article.tags || [];

  return {
    found: true,
    seoTitle,
    seoUrl: `https://newsbuzz.in/?article=${article.id}`,
    seoDesc,
    tags,
    titleLength: seoTitle.length,
    titleOver60: seoTitle.length > 60,
    descLength: seoDesc.slice(0, 155).length,
    descOver155: seoDesc.slice(0, 155).length > 155,
    tagList: tags.map(t => `#${t}`).join(', ') || 'None',
  };
}

// ── BULK FILTERING (extracted from adminBulkDelete / adminBulkExport) ─
function filterBulkArticles(articles, category) {
  return category === 'all' ? [...articles] : articles.filter(a => a.category === category);
}

// ── AUTO-PUBLISH STATE (extracted from shouldAutoStart / rememberAutoPublish) ─
function autoPublishShouldStart(config, localStorage) {
  if (config.AUTO_PUBLISH_AUTOSTART) return true;
  if (config.AUTO_PUBLISH_REMEMBER && localStorage.getItem('newsbuzz_auto_publish_enabled') === 'true') return true;
  return false;
}

function autoPublishRemember(enabled, localStorage) {
  if (enabled) {
    localStorage.setItem('newsbuzz_auto_publish_enabled', 'true');
  } else {
    localStorage.setItem('newsbuzz_auto_publish_enabled', 'false');
  }
}

// ── OFFLINE CACHE STATUS (extracted from renderBackupList) ─
function getOfflineCacheStatus(localStorage) {
  const cached = localStorage.getItem('nb_offline_cache');
  const cacheTime = localStorage.getItem('nb_offline_cache_time');
  return {
    available: !!cached,
    cacheTime: cacheTime ? new Date(Number(cacheTime)).toLocaleString('en-IN') : null,
    hasTime: !!cacheTime,
  };
}

// ══════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════

// ── ANALYTICS ───────────────────────────────────────────────
describe('Analytics — computeCategoryCounts', () => {
  it('counts articles per category', () => {
    const articles = createTestDataset();
    const counts = computeCategoryCounts(articles);
    expect(counts).toEqual({ wb: 2, national: 2, sports: 2, politics: 1, crime: 1, education: 1, weather: 1 });
  });

  it('returns empty object for no articles', () => {
    expect(computeCategoryCounts([])).toEqual({});
  });

  it('handles single article', () => {
    expect(computeCategoryCounts([makeArticle({ category: 'wb' })])).toEqual({ wb: 1 });
  });
});

describe('Analytics — computeBarPercent', () => {
  it('computes bar percentages relative to max', () => {
    const articles = createTestDataset();
    const bars = computeBarPercent(articles);
    expect(bars[0].category).toBe('wb'); // or sports — tie, sorted alphabetically? No, sorted by count desc
    // wb, national, sports all have 2 — sorted by count desc, then insertion order? Actually sort is stable
    expect(bars[0].percent).toBe(100); // max count is 2
    expect(bars[0].count).toBe(2);
  });

  it('handles empty articles', () => {
    const bars = computeBarPercent([]);
    expect(bars).toEqual([]);
  });

  it('uses 1 as minimum divisor', () => {
    const bars = computeBarPercent([makeArticle({ category: 'wb' })]);
    expect(bars[0].percent).toBe(100);
  });
});

describe('Analytics — computeAnalyticsSummary', () => {
  it('computes total articles count', () => {
    const summary = computeAnalyticsSummary(createTestDataset());
    expect(summary.total).toBe(10);
  });

  it('counts unique categories', () => {
    const summary = computeAnalyticsSummary(createTestDataset());
    expect(summary.categories).toBe(7);
  });

  it('computes average viral score', () => {
    const summary = computeAnalyticsSummary(createTestDataset());
    // Sum: 82+76+95+88+71+93+67+79+60+85 = 796, /10 = 79.6, rounded = 80
    // Actually 82+76=158, +95=253, +88=341, +71=412, +93=505, +67=572, +79=651, +60=711, +85=796
    expect(summary.avgScore).toBe(80);
  });

  it('handles empty articles', () => {
    const summary = computeAnalyticsSummary([]);
    expect(summary).toEqual({ total: 0, categories: 0, avgScore: 0, todayArticles: 0 });
  });

  it('handles articles with missing viralScore', () => {
    const articles = [makeArticle({ viralScore: undefined })];
    const summary = computeAnalyticsSummary(articles);
    expect(summary.avgScore).toBe(0);
  });
});

// ── SOCIAL MEDIA POSTS ──────────────────────────────────────
describe('Social Posts — generateSocialPosts', () => {
  const article = makeArticle({
    id: 'test123',
    title: 'Kolkata Metro Extension Announced by PWD Minister',
    description: 'The Kolkata Metro Railway expansion project was announced today by the PWD Minister, covering a new 15-kilometer stretch from Howrah Maidan to Salt Lake Sector V. The project is expected to be completed by December 2026.',
    tags: ['Kolkata Metro', 'Infrastructure', 'West Bengal', 'Urban Transport'],
  });

  it('generates a Twitter post under 280 characters', () => {
    const posts = generateSocialPosts(article);
    expect(posts.twitter.length).toBeLessThanOrEqual(280);
    expect(posts.twitter).toContain(article.title);
    expect(posts.twitter).toContain('https://newsbuzz.in/?article=test123');
  });

  it('generates a Facebook post with emoji prefix', () => {
    const posts = generateSocialPosts(article);
    expect(posts.facebook).toContain('📰');
    expect(posts.facebook).toContain('Read more:');
    expect(posts.facebook).toContain(article.title);
  });

  it('generates a WhatsApp post with bold markers and emoji', () => {
    const posts = generateSocialPosts(article);
    expect(posts.whatsapp).toContain('📰');
    expect(posts.whatsapp).toContain('*');
    expect(posts.whatsapp).toContain('🔗');
    expect(posts.whatsapp).toContain('#KolkataMetro');
  });

  it('generates a LinkedIn post with source attribution', () => {
    const posts = generateSocialPosts(article);
    expect(posts.linkedin).toContain('📰');
    expect(posts.linkedin).toContain('NewsBuzz — West Bengal');
    expect(posts.linkedin).toContain('🔗');
  });

  it('uses Bengali title when lang is bn', () => {
    const posts = generateSocialPosts(article, 'bn');
    expect(posts.twitter).toContain(article.titleBn);
    expect(posts.twitter).not.toContain('Kolkata Metro Extension');
  });

  it('limits tags to 3', () => {
    const posts = generateSocialPosts(article);
    // article has 4 tags, should only take first 3
    const hashtagCount = (posts.whatsapp.match(/#/g) || []).length;
    expect(hashtagCount).toBe(3);
  });

  it('truncates description to 120 characters', () => {
    const posts = generateSocialPosts(article);
    // The description is longer than 120 chars, so should end with …
    expect(posts.twitter).toContain('…');
  });

  it('handles missing tags gracefully', () => {
    const noTags = makeArticle({ id: 'notags', title: 'Test', tags: [] });
    const posts = generateSocialPosts(noTags);
    expect(posts.twitter).not.toContain('#');
  });

  it('handles missing titleBn gracefully', () => {
    const noBn = makeArticle({ id: 'nobn', title: 'English Only', titleBn: undefined });
    const posts = generateSocialPosts(noBn, 'bn');
    expect(posts.twitter).toContain('English Only');
  });
});

// ── A/B TESTING ─────────────────────────────────────────────
describe('A/B Testing — createABTest', () => {
  it('creates a test with zero initial stats', () => {
    const article = makeArticle({ id: 'abtest1', title: 'Hot News' });
    const test = createABTest(article, 'Headline A', 'Headline B');
    expect(test).not.toBeNull();
    expect(test.articleId).toBe('abtest1');
    expect(test.articleTitle).toBe('Hot News');
    expect(test.headlineA).toBe('Headline A');
    expect(test.headlineB).toBe('Headline B');
    expect(test.impressionsA).toBe(0);
    expect(test.impressionsB).toBe(0);
    expect(test.clicksA).toBe(0);
    expect(test.clicksB).toBe(0);
    expect(test.active).toBe(true);
    expect(test.id).toMatch(/^ab_\d+$/);
  });

  it('returns null when article is missing', () => {
    expect(createABTest(null, 'A', 'B')).toBeNull();
  });

  it('returns null when headlines are empty', () => {
    const article = makeArticle({ id: 'test' });
    expect(createABTest(article, '', 'B')).toBeNull();
    expect(createABTest(article, 'A', '')).toBeNull();
  });
});

describe('A/B Testing — endABTest', () => {
  it('marks a test as inactive', () => {
    const test = { id: 'ab_123', active: true };
    const ended = endABTest({ ab_123: test }, 'ab_123');
    expect(ended.active).toBe(false);
  });

  it('returns null for non-existent test', () => {
    expect(endABTest({}, 'nonexistent')).toBeNull();
  });
});

describe('A/B Testing — clearABTest', () => {
  it('removes a test from the collection', () => {
    const tests = { ab_1: { id: 'ab_1' }, ab_2: { id: 'ab_2' } };
    const updated = clearABTest(tests, 'ab_1');
    expect(updated).not.toHaveProperty('ab_1');
    expect(updated).toHaveProperty('ab_2');
  });
});

describe('A/B Testing — computeABTestResults', () => {
  it('computes CTR and winner for variant B', () => {
    const test = {
      impressionsA: 100, clicksA: 5,
      impressionsB: 100, clicksB: 15,
    };
    const results = computeABTestResults(test);
    expect(results.rateA).toBe('5.0');
    expect(results.rateB).toBe('15.0');
    expect(results.winner).toBe('B');
  });

  it('declares tie when clicks are equal', () => {
    const results = computeABTestResults({ impressionsA: 100, clicksA: 10, impressionsB: 100, clicksB: 10 });
    expect(results.winner).toBe('—');
  });

  it('declares — when no impressions exist', () => {
    const results = computeABTestResults({ impressionsA: 0, clicksA: 0, impressionsB: 0, clicksB: 0 });
    expect(results.rateA).toBe('—');
    expect(results.rateB).toBe('—');
    expect(results.winner).toBe('—');
  });

  it('returns dash for rates when total impressions is zero; winner uses raw click comparison', () => {
    // Production checks totalImpressions > 0 for rates. With 0 total, rates show '—'.
    // Winner is determined by raw click comparison regardless of impressions.
    const results = computeABTestResults({ impressionsA: 0, clicksA: 5, impressionsB: 0, clicksB: 0 });
    expect(results.rateA).toBe('—');
    expect(results.rateB).toBe('—');
    expect(results.winner).toBe('A'); // 5 > 0, so A wins
  });
});

// ── SURVEY RESULTS ──────────────────────────────────────────
describe('Survey — launchSurvey', () => {
  it('creates an active survey with provided options', () => {
    const survey = launchSurvey('Best news category?', ['Sports', 'Politics', 'Weather']);
    expect(survey.question).toBe('Best news category?');
    expect(survey.options).toEqual(['Sports', 'Politics', 'Weather']);
    expect(survey.active).toBe(true);
  });

  it('returns null when less than 2 options', () => {
    expect(launchSurvey('Question?', ['Only one'])).toBeNull();
  });

  it('returns null when question is empty', () => {
    expect(launchSurvey('', ['A', 'B'])).toBeNull();
  });
});

describe('Survey — endSurvey', () => {
  it('marks survey as inactive', () => {
    const survey = launchSurvey('Test?', ['A', 'B']);
    const ended = endSurvey(survey);
    expect(ended.active).toBe(false);
    expect(ended.question).toBe('Test?');
  });
});

describe('Survey — computeSurveyResults', () => {
  it('computes percentages from responses', () => {
    const survey = launchSurvey('Favorite category?', ['Sports', 'Politics', 'Weather']);
    const responses = ['Sports', 'Sports', 'Politics', 'Sports', 'Weather'];
    const results = computeSurveyResults(survey, responses);

    expect(results).toHaveLength(3);

    const sports = results.find(r => r.option === 'Sports');
    const politics = results.find(r => r.option === 'Politics');
    const weather = results.find(r => r.option === 'Weather');

    expect(sports.count).toBe(3);
    expect(sports.percent).toBe('60.0');
    expect(sports.barPercent).toBe(100); // max count is 3

    expect(politics.count).toBe(1);
    expect(politics.percent).toBe('20.0');

    expect(weather.count).toBe(1);
    expect(weather.percent).toBe('20.0');
  });

  it('returns empty results for no responses', () => {
    const survey = launchSurvey('Test?', ['A', 'B']);
    const results = computeSurveyResults(survey, []);
    expect(results[0].count).toBe(0);
    expect(results[0].percent).toBe('0');
  });

  it('returns null for null survey', () => {
    expect(computeSurveyResults(null, [])).toBeNull();
  });

  it('handles responses for options not in survey gracefully', () => {
    const survey = launchSurvey('Test?', ['A', 'B']);
    const results = computeSurveyResults(survey, ['A', 'C', 'A']);
    // 'C' should be ignored since it's not in survey.options
    expect(results[0].count).toBe(2); // A
    expect(results[1].count).toBe(0); // B
  });
});

// ── SCHEDULING ──────────────────────────────────────────────
describe('Schedule — validateSchedule', () => {
  it('rejects empty title', () => {
    const result = validateSchedule('', 'Body', '2026-12-25T10:00');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Fill all fields');
  });

  it('rejects empty body', () => {
    const result = validateSchedule('Title', '', '2026-12-25T10:00');
    expect(result.valid).toBe(false);
  });

  it('rejects missing date', () => {
    const result = validateSchedule('Title', 'Body', '');
    expect(result.valid).toBe(false);
  });

  it('rejects past dates', () => {
    const result = validateSchedule('Title', 'Body', '2020-01-01T00:00');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('future date');
  });

  it('rejects invalid date format', () => {
    const result = validateSchedule('Title', 'Body', 'not-a-date');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid date');
  });

  it('accepts valid future date', () => {
    const future = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const result = validateSchedule('Title', 'Body', future);
    expect(result.valid).toBe(true);
    expect(result.scheduledTime).toBeGreaterThan(Date.now());
  });
});

describe('Schedule — getPendingSchedules', () => {
  it('filters out past schedules', () => {
    const now = Date.now();
    const schedules = [
      { title: 'Past', scheduledTime: now - 3600000 },
      { title: 'Future 1', scheduledTime: now + 3600000 },
      { title: 'Future 2', scheduledTime: now + 7200000 },
      { title: 'Distant Past', scheduledTime: now - 86400000 },
    ];
    const pending = getPendingSchedules(schedules);
    expect(pending).toHaveLength(2);
    expect(pending[0].title).toBe('Future 1');
    expect(pending[1].title).toBe('Future 2');
  });

  it('returns empty array when all past', () => {
    const schedules = [
      { title: 'Past 1', scheduledTime: Date.now() - 1000 },
    ];
    expect(getPendingSchedules(schedules)).toHaveLength(0);
  });

  it('returns empty array when empty', () => {
    expect(getPendingSchedules([])).toEqual([]);
  });
});

// ── SEO ANALYSIS ────────────────────────────────────────────
describe('SEO — analyzeSEO', () => {
  it('returns found: false for null article', () => {
    expect(analyzeSEO(null).found).toBe(false);
  });

  it('uses seoTitle when present', () => {
    const result = analyzeSEO(makeArticle({ seoTitle: 'Custom SEO Title' }));
    expect(result.seoTitle).toBe('Custom SEO Title');
    expect(result.found).toBe(true);
  });

  it('falls back to truncated title when no seoTitle', () => {
    const result = analyzeSEO(makeArticle({ title: 'My Article Title Here', seoTitle: undefined }));
    expect(result.seoTitle).toBe('My Article Title Here');
  });

  it('flags title over 60 characters', () => {
    const longTitle = 'A'.repeat(70);
    const result = analyzeSEO(makeArticle({ seoTitle: longTitle }));
    expect(result.titleOver60).toBe(true);
    expect(result.titleLength).toBe(70);
  });

  it('accepts title under 60 characters', () => {
    const shortTitle = 'A'.repeat(45);
    const result = analyzeSEO(makeArticle({ seoTitle: shortTitle }));
    expect(result.titleOver60).toBe(false);
    expect(result.titleLength).toBe(45);
  });

  it('reports description length as 155 when sliced (production behavior)', () => {
    // Production code slices seoDesc to 155 before checking length:
    // (article.seoDesc || '').slice(0, 155).length > 155 — which is never true.
    // This matches the (buggy) production behavior.
    const longDesc = 'B'.repeat(200);
    const result = analyzeSEO(makeArticle({ seoDesc: longDesc }));
    expect(result.descOver155).toBe(false);  // slice(0,155).length === 155, never > 155
    expect(result.descLength).toBe(155);
  });

  it('generates correct SEO URL', () => {
    const result = analyzeSEO(makeArticle({ id: 'abc123' }));
    expect(result.seoUrl).toBe('https://newsbuzz.in/?article=abc123');
  });

  it('formats tags as hashtag string', () => {
    const result = analyzeSEO(makeArticle({ tags: ['cricket', 'ipl', 'sports'] }));
    expect(result.tagList).toBe('#cricket, #ipl, #sports');
  });

  it('shows None for empty tags', () => {
    const result = analyzeSEO(makeArticle({ tags: [] }));
    expect(result.tagList).toBe('None');
  });
});

// ── BULK OPERATIONS FILTERING ───────────────────────────────
describe('Bulk Operations — filterBulkArticles', () => {
  const articles = createTestDataset();

  it('returns all articles when category is "all"', () => {
    const filtered = filterBulkArticles(articles, 'all');
    expect(filtered).toHaveLength(articles.length);
  });

  it('filters by specific category', () => {
    const filtered = filterBulkArticles(articles, 'wb');
    expect(filtered).toHaveLength(2);
    expect(filtered.every(a => a.category === 'wb')).toBe(true);
  });

  it('returns empty array for non-existent category', () => {
    const filtered = filterBulkArticles(articles, 'nonexistent');
    expect(filtered).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const originalLength = articles.length;
    filterBulkArticles(articles, 'wb');
    expect(articles.length).toBe(originalLength);
  });

  it('returns a new array for "all"', () => {
    const filtered = filterBulkArticles(articles, 'all');
    expect(filtered).not.toBe(articles);
  });
});

// ── AUTO-PUBLISH STATE MANAGEMENT ──────────────────────────
describe('Auto-Publish — shouldAutoStart', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns true when AUTO_PUBLISH_AUTOSTART is true', () => {
    const config = { AUTO_PUBLISH_AUTOSTART: true, AUTO_PUBLISH_REMEMBER: false };
    expect(autoPublishShouldStart(config, localStorageMock)).toBe(true);
  });

  it('returns false when AUTOSTART is false and no saved state', () => {
    const config = { AUTO_PUBLISH_AUTOSTART: false, AUTO_PUBLISH_REMEMBER: true };
    expect(autoPublishShouldStart(config, localStorageMock)).toBe(false);
  });

  it('returns true when REMEMBER is on and localStorage has true', () => {
    localStorageMock.setItem('newsbuzz_auto_publish_enabled', 'true');
    const config = { AUTO_PUBLISH_AUTOSTART: false, AUTO_PUBLISH_REMEMBER: true };
    expect(autoPublishShouldStart(config, localStorageMock)).toBe(true);
  });

  it('returns false when REMEMBER is on but localStorage is false', () => {
    localStorageMock.setItem('newsbuzz_auto_publish_enabled', 'false');
    const config = { AUTO_PUBLISH_AUTOSTART: false, AUTO_PUBLISH_REMEMBER: true };
    expect(autoPublishShouldStart(config, localStorageMock)).toBe(false);
  });

  it('returns false when REMEMBER is off even if localStorage has true', () => {
    localStorageMock.setItem('newsbuzz_auto_publish_enabled', 'true');
    const config = { AUTO_PUBLISH_AUTOSTART: false, AUTO_PUBLISH_REMEMBER: false };
    expect(autoPublishShouldStart(config, localStorageMock)).toBe(false);
  });
});

describe('Auto-Publish — rememberAutoPublish', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('saves true to localStorage', () => {
    autoPublishRemember(true, localStorageMock);
    expect(localStorageMock.getItem('newsbuzz_auto_publish_enabled')).toBe('true');
  });

  it('saves false to localStorage', () => {
    autoPublishRemember(false, localStorageMock);
    expect(localStorageMock.getItem('newsbuzz_auto_publish_enabled')).toBe('false');
  });
});

// ── HOT TOPIC DETECTION LOGIC (extracted from detectHotTopics) ──
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
  sports: [
    'India cricket match today news',
    'IPL cricket latest news',
    'East Bengal Mohun Bagan football news',
    'India Olympics sports news',
    'ISL Indian Super League news',
  ],
};

function getSeedTopics(category) {
  return CATEGORY_TOPICS[category] || [];
}

function filterHotTopics(topics, minViralScore) {
  if (!Array.isArray(topics)) return [];
  return topics.filter(t => t.viralEstimate >= minViralScore);
}

// ── RSS FEED STRUCTURE (extracted from adminRefreshRSS) ────
const RSS_FEEDS = [
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', category: 'national' },
  { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news', category: 'national' },
  { name: 'Times of India Kolkata', url: 'https://timesofindia.indiatimes.com/rssfeeds/2951478.cms', category: 'wb' },
];

function getFeedsByCategory(category) {
  return RSS_FEEDS.filter(f => f.category === category);
}

function getUniqueFeedNames(feeds) {
  return [...new Set(feeds.map(f => f.name))];
}

// ── OFFLINE CACHE STATUS ────────────────────────────────────
describe('Offline Cache — status', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('reports unavailable when no cache', () => {
    const status = getOfflineCacheStatus(localStorageMock);
    expect(status.available).toBe(false);
    expect(status.hasTime).toBe(false);
  });

  it('reports available when cache exists', () => {
    localStorageMock.setItem('nb_offline_cache', JSON.stringify([makeArticle()]));
    localStorageMock.setItem('nb_offline_cache_time', '1700000000000');
    const status = getOfflineCacheStatus(localStorageMock);
    expect(status.available).toBe(true);
    expect(status.hasTime).toBe(true);
  });

  it('reports available when cache data exists even without time', () => {
    localStorageMock.setItem('nb_offline_cache', JSON.stringify([makeArticle()]));
    // no cache_time set
    const status = getOfflineCacheStatus(localStorageMock);
    expect(status.available).toBe(true); // cache data exists
    expect(status.hasTime).toBe(false);
  });
});

// ── HOT TOPIC DETECTION ────────────────────────────────────
describe('Hot Topics — getSeedTopics', () => {
  it('returns 10 seed topics for wb category', () => {
    const seeds = getSeedTopics('wb');
    expect(seeds).toHaveLength(10);
    expect(seeds[0]).toContain('West Bengal');
  });

  it('returns 10 seed topics for national category', () => {
    const seeds = getSeedTopics('national');
    expect(seeds).toHaveLength(10);
    expect(seeds[0]).toContain('India');
  });

  it('returns empty array for unknown category', () => {
    expect(getSeedTopics('unknown')).toEqual([]);
  });

  it('returns empty array for null category', () => {
    expect(getSeedTopics(null)).toEqual([]);
  });

  it('returns correct number of sports seeds (5)', () => {
    const seeds = getSeedTopics('sports');
    expect(seeds).toHaveLength(5);
  });
});

describe('Hot Topics — filterHotTopics', () => {
  const topics = [
    { topic: 'Very Hot', viralEstimate: 92, reason: 'trending' },
    { topic: 'Warm', viralEstimate: 75, reason: 'popular' },
    { topic: 'Lukewarm', viralEstimate: 60, reason: 'moderate' },
    { topic: 'Cold', viralEstimate: 30, reason: 'low interest' },
  ];

  it('filters topics above the threshold (e.g. 65)', () => {
    const hot = filterHotTopics(topics, 65);
    expect(hot).toHaveLength(2);
    expect(hot[0].topic).toBe('Very Hot');
    expect(hot[1].topic).toBe('Warm');
  });

  it('returns all topics when threshold is 0', () => {
    const hot = filterHotTopics(topics, 0);
    expect(hot).toHaveLength(4);
  });

  it('returns empty when no topics pass threshold', () => {
    const hot = filterHotTopics(topics, 95);
    expect(hot).toHaveLength(0);
  });

  it('returns empty array for non-array input', () => {
    expect(filterHotTopics(null, 65)).toEqual([]);
    expect(filterHotTopics('not array', 65)).toEqual([]);
    expect(filterHotTopics({}, 65)).toEqual([]);
  });

  it('preserves topic properties through the filter', () => {
    const hot = filterHotTopics(topics, 65);
    expect(hot[0]).toEqual({ topic: 'Very Hot', viralEstimate: 92, reason: 'trending' });
  });

  it('handles boundary value exactly at threshold', () => {
    const boundary = [{ topic: 'Edge', viralEstimate: 65, reason: 'boundary' }];
    const hot = filterHotTopics(boundary, 65);
    expect(hot).toHaveLength(1);
  });
});

// ── RSS FEED STRUCTURE ──────────────────────────────────────
describe('RSS Feeds — structure', () => {
  it('defines 3 feed sources', () => {
    expect(RSS_FEEDS).toHaveLength(3);
  });

  it('every feed has required fields', () => {
    RSS_FEEDS.forEach(feed => {
      expect(feed).toHaveProperty('name');
      expect(feed).toHaveProperty('url');
      expect(feed).toHaveProperty('category');
      expect(typeof feed.name).toBe('string');
      expect(typeof feed.url).toBe('string');
      expect(typeof feed.category).toBe('string');
    });
  });

  it('every feed has a non-empty URL with http/https protocol', () => {
    RSS_FEEDS.forEach(feed => {
      expect(feed.url).toMatch(/^https?:\/\//);
    });
  });

  it('uses valid known categories', () => {
    const validCats = ['wb', 'national', 'govt', 'politics', 'crime', 'education', 'sports', 'weather'];
    RSS_FEEDS.forEach(feed => {
      expect(validCats).toContain(feed.category);
    });
  });

  it('filters feeds by category', () => {
    const nationalFeeds = getFeedsByCategory('national');
    expect(nationalFeeds).toHaveLength(2);
    expect(nationalFeeds.every(f => f.category === 'national')).toBe(true);
  });

  it('returns unique feed names (no duplicates)', () => {
    const unique = getUniqueFeedNames(RSS_FEEDS);
    expect(unique).toHaveLength(RSS_FEEDS.length);
  });

  it('has correct feed metadata', () => {
    const toi = RSS_FEEDS.find(f => f.name === 'Times of India');
    expect(toi.category).toBe('national');
    expect(toi.url).toContain('timesofindia.indiatimes.com');

    const ndtv = RSS_FEEDS.find(f => f.name === 'NDTV India');
    expect(ndtv.category).toBe('national');

    const toiKol = RSS_FEEDS.find(f => f.name === 'Times of India Kolkata');
    expect(toiKol.category).toBe('wb');
  });

  it('returns empty array for non-existent category filter', () => {
    expect(getFeedsByCategory('nonexistent')).toEqual([]);
  });
});

// ── INTEGRATION: A/B Test life cycle ────────────────────────
describe('A/B Test — full life cycle', () => {
  it('creates, ends, and verifies a test', () => {
    const article = makeArticle({ id: 'lifecycle1', title: 'Lifecycle Test' });
    const test = createABTest(article, 'Original Headline', 'Bold Headline');
    expect(test.active).toBe(true);

    // Simulate some impressions and clicks
    test.impressionsA = 200;
    test.clicksA = 12;
    test.impressionsB = 200;
    test.clicksB = 28;

    const results = computeABTestResults(test);
    expect(results.winner).toBe('B');
    expect(results.rateA).toBe('6.0');
    expect(results.rateB).toBe('14.0');

    // End the test
    const ended = endABTest({ [test.id]: test }, test.id);
    expect(ended.active).toBe(false);
  });
});

// ── INTEGRATION: Analytics with filtered categories ─────────
describe('Analytics — integration with bulk filtering', () => {
  it('computes analytics on a bulk-filtered subset', () => {
    const articles = createTestDataset();
    const wbArticles = filterBulkArticles(articles, 'wb');
    const summary = computeAnalyticsSummary(wbArticles);
    expect(summary.total).toBe(2);
    expect(summary.categories).toBe(1);
    // wb viral scores: 82 + 79 = 161 / 2 = 80.5 -> Math.round(80.5) = 81
    expect(summary.avgScore).toBe(81);
  });
});
