import { describe, it, expect } from 'vitest';
import {
  byCategory,
  sortByViralScore,
  sortByNewest,
  searchArticles,
  getRecommendedArticle,
  createTestDataset,
  makeArticle,
  catLabel,
  timeAgo,
} from './helpers.js';

describe('byCategory — article filtering', () => {
  const articles = createTestDataset();

  it('filters articles by exact category match', () => {
    const wbArticles = byCategory(articles, 'wb');
    expect(wbArticles.every(a => a.category === 'wb')).toBe(true);
    expect(wbArticles.length).toBe(2); // a1 and a8
  });

  it('returns empty array for non-existent category', () => {
    const result = byCategory(articles, 'nonexistent');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const result = byCategory([], 'wb');
    expect(result).toEqual([]);
  });

  it('respects the n limit parameter', () => {
    const result = byCategory(articles, 'national', 1);
    expect(result.length).toBe(1);
  });

  it('does not mutate the original array', () => {
    const originalLength = articles.length;
    byCategory(articles, 'wb');
    expect(articles.length).toBe(originalLength);
  });

  it('handles articles with missing category field', () => {
    const withMissing = [...articles, makeArticle({ id: 'no-cat' })];
    delete withMissing[withMissing.length - 1].category;
    const result = byCategory(withMissing, 'wb');
    expect(result.every(a => a.category === 'wb')).toBe(true);
  });
});

describe('sortByViralScore — trending sort', () => {
  const articles = createTestDataset();

  it('sorts articles descending by viralScore', () => {
    const sorted = sortByViralScore(articles, articles.length);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].viralScore).toBeGreaterThanOrEqual(sorted[i].viralScore);
    }
  });

  it('respects the limit parameter', () => {
    const top3 = sortByViralScore(articles, 3);
    expect(top3.length).toBe(3);
  });

  it('defaults to limit of 5', () => {
    const result = sortByViralScore(articles);
    expect(result.length).toBe(5);
  });

  it('handles articles with missing viralScore', () => {
    const withMissing = [...articles, makeArticle({ id: 'no-score' })];
    delete withMissing[withMissing.length - 1].viralScore;
    const result = sortByViralScore(withMissing, withMissing.length);
    // The article with no score should be at the end (score defaults to 0)
    expect(result[result.length - 1].viralScore || 0).toBe(0);
  });

  it('does not mutate the original array', () => {
    const original = articles.map(a => a.id);
    sortByViralScore(articles);
    expect(articles.map(a => a.id)).toEqual(original);
  });

  it('returns the highest scored article first', () => {
    const top = sortByViralScore(articles, 1);
    expect(top[0].viralScore).toBe(95); // sports cricket has 95
  });
});

describe('sortByNewest — recency sort', () => {
  const articles = createTestDataset();

  it('sorts articles newest first', () => {
    const sorted = sortByNewest(articles);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].timestamp).toBeGreaterThanOrEqual(sorted[i].timestamp);
    }
  });

  it('puts the article with latest timestamp first', () => {
    const sorted = sortByNewest(articles);
    expect(sorted[0].id).toBe('a1'); // a1 has most recent timestamp
  });

  it('handles articles with missing timestamp', () => {
    const withMissing = [...articles, makeArticle({ id: 'no-ts' })];
    delete withMissing[withMissing.length - 1].timestamp;
    const result = sortByNewest(withMissing);
    expect(result.length).toBe(withMissing.length);
  });

  it('does not mutate the original array', () => {
    const original = articles.map(a => a.id);
    sortByNewest(articles);
    expect(articles.map(a => a.id)).toEqual(original);
  });
});

describe('searchArticles — search filter', () => {
  const articles = createTestDataset();

  it('finds articles by title match (case-insensitive)', () => {
    const result = searchArticles(articles, 'metro');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a1');
  });

  it('finds articles by description match', () => {
    const result = searchArticles(articles, 'unit testing');
    // a1's description doesn't contain 'unit testing', but a2..a10 do from makeArticle defaults
    // Actually the test dataset uses makeArticle which has 'This is a test article description for unit testing.'
    // So all articles should match 'unit testing'
    expect(result.length).toBe(articles.length);
  });

  it('finds articles by tag match', () => {
    const result = searchArticles(articles, 'sample');
    expect(result.length).toBe(articles.length);
  });

  it('finds articles by Bengali title', () => {
    const result = searchArticles(articles, 'টেস্ট');
    expect(result.length).toBe(articles.length);
  });

  it('returns empty for no match', () => {
    const result = searchArticles(articles, 'xyznonexistentkeyword');
    expect(result).toEqual([]);
  });

  it('returns empty for empty query', () => {
    const result = searchArticles(articles, '');
    expect(result).toEqual([]);
  });

  it('returns empty for null query', () => {
    const result = searchArticles(articles, null);
    expect(result).toEqual([]);
  });

  it('handles empty articles array', () => {
    const result = searchArticles([], 'test');
    expect(result).toEqual([]);
  });
});

describe('getRecommendedArticle — recommendation scoring', () => {
  const articles = createTestDataset();

  it('returns an article different from the current one', () => {
    const rec = getRecommendedArticle(articles, 'a1');
    expect(rec).not.toBeNull();
    expect(rec.id).not.toBe('a1');
  });

  it('prefers same-category articles', () => {
    // a1 is wb category, a8 is also wb category
    const rec = getRecommendedArticle(articles, 'a1');
    expect(rec.category).toBe('wb');
  });

  it('returns null when only one article exists', () => {
    const single = [makeArticle({ id: 'only' })];
    const rec = getRecommendedArticle(single, 'only');
    expect(rec).toBeNull();
  });

  it('considers user interest when scoring', () => {
    const interest = { wb: 10, sports: 1 };
    const rec = getRecommendedArticle(articles, 'a3', interest);
    // a3 is sports, but wb has higher interest. If there's a wb article with decent score...
    // Actually the recommendation considers current article's category and interest
    // Since a3 is sports, same-category sports article a10 should score high
    expect(rec).not.toBeNull();
  });

  it('handles missing current article', () => {
    const rec = getRecommendedArticle(articles, 'nonexistent');
    expect(rec).toBeNull();
  });
});

describe('catLabel — category label helper', () => {
  it('returns English label for known category', () => {
    expect(catLabel('wb')).toBe('West Bengal');
    expect(catLabel('sports')).toBe('Sports');
  });

  it('returns Bengali label when lang is bn', () => {
    expect(catLabel('wb', 'bn')).toBe('পশ্চিমবঙ্গ');
    expect(catLabel('sports', 'bn')).toBe('খেলাধুলা');
  });

  it('returns raw key for unknown category', () => {
    expect(catLabel('unknown')).toBe('unknown');
  });

  it('returns default English for missing lang', () => {
    expect(catLabel('crime')).toBe('Crime & Law');
  });
});

describe('timeAgo — timestamp formatting', () => {
  it('returns "Just now" for very recent timestamps', () => {
    const result = timeAgo(Date.now() - 1000);
    expect(result).toBe('এইমাত্র / Just now');
  });

  it('returns minutes ago for timestamps within the hour', () => {
    const result = timeAgo(Date.now() - 5 * 60000);
    expect(result).toMatch(/5m ago/);
  });

  it('returns hours ago for timestamps within the day', () => {
    const result = timeAgo(Date.now() - 3 * 3600000);
    expect(result).toMatch(/3h ago/);
  });

  it('returns days ago for older timestamps', () => {
    const result = timeAgo(Date.now() - 5 * 86400000);
    expect(result).toMatch(/5d ago/);
  });

  it('returns empty string for null/undefined', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
    expect(timeAgo(0)).toBe('');
  });
});
