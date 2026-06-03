import { describe, it, expect } from 'vitest';
import {
  getPaginationRange,
  highlightText,
  createTestDataset,
  searchArticles,
  sortByNewest,
} from './helpers.js';

describe('getPaginationRange — page number display', () => {
  it('shows all pages when total <= 7', () => {
    expect(getPaginationRange(1, 1)).toEqual([1]);
    expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows first 5 pages + ellipsis when current is early', () => {
    const range = getPaginationRange(1, 10);
    expect(range).toEqual([1, 2, 3, 4, 5, '...', 10]);

    const range2 = getPaginationRange(4, 10);
    expect(range2).toEqual([1, 2, 3, 4, 5, '...', 10]);
  });

  it('shows ellipsis + last 5 pages when current is near end', () => {
    const range = getPaginationRange(10, 10);
    expect(range).toEqual([1, '...', 6, 7, 8, 9, 10]);

    const range2 = getPaginationRange(8, 10);
    expect(range2).toEqual([1, '...', 6, 7, 8, 9, 10]);
  });

  it('shows ellipsis on both sides when current is in the middle', () => {
    const range = getPaginationRange(6, 15);
    expect(range).toEqual([1, '...', 5, 6, 7, '...', 15]);

    const range2 = getPaginationRange(8, 20);
    expect(range2).toEqual([1, '...', 7, 8, 9, '...', 20]);
  });

  it('handles boundary at current=5 with total=10', () => {
    const range = getPaginationRange(5, 10);
    // current=5 falls in middle range since current <= 4 is false and current >= 7 is false
    expect(range).toEqual([1, '...', 4, 5, 6, '...', 10]);
  });

  it('handles boundary at current=7 with total=10', () => {
    const range = getPaginationRange(7, 10);
    // current >= total - 3 = 7, so show: 1, ..., 6, 7, 8, 9, 10
    expect(range).toEqual([1, '...', 6, 7, 8, 9, 10]);
  });
});

describe('highlightText — search term highlighting', () => {
  it('wraps matching words in highlight spans', () => {
    const result = highlightText('Kolkata Metro News', 'metro');
    expect(result).toContain('<span class="search-highlight">Metro</span>');
  });

  it('is case-insensitive', () => {
    const result = highlightText('Metro News', 'metro');
    expect(result).toContain('<span class="search-highlight">Metro</span>');
  });

  it('handles multi-word queries', () => {
    const result = highlightText('Kolkata Metro Rail Update', 'metro rail');
    expect(result).toContain('<span class="search-highlight">Metro</span>');
    expect(result).toContain('<span class="search-highlight">Rail</span>');
  });

  it('returns original text when query is empty', () => {
    expect(highlightText('Some text', '')).toBe('Some text');
    expect(highlightText('', 'query')).toBe('');
  });

  it('correctly escapes HTML in text', () => {
    const result = highlightText('<script>alert("xss")</script>', 'alert');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('<span class="search-highlight">alert</span>');
  });

  it('skips single-character search terms', () => {
    const result = highlightText('A test article', 'a');
    expect(result).toBe('A test article'); // no highlight, single char
  });

  it('handles null/undefined text', () => {
    expect(highlightText(null, 'test')).toBe('');
    expect(highlightText(undefined, 'test')).toBe('');
  });

  it('highlights partial word matches', () => {
    const result = highlightText('Football Championship', 'ball');
    expect(result).toContain('<span class="search-highlight">ball</span>');
  });
});

describe('search + sort integration', () => {
  const articles = createTestDataset();

  it('filters then sorts by newest', () => {
    const searched = searchArticles(articles, 'cricket');
    const sorted = sortByNewest(searched);
    expect(sorted.length).toBe(1);
    expect(sorted[0].id).toBe('a3');
  });

  it('filters and sorts can be chained', () => {
    const searched = searchArticles(articles, 'election');
    expect(searched.length).toBe(1);
    expect(searched[0].id).toBe('a4');
  });

  it('pagination and search work together conceptually', () => {
    // Simulate what the search page does: filter, then paginate
    const pageSize = 3;
    const results = searchArticles(articles, 'test'); // all articles have 'test'
    const page1 = results.slice(0, pageSize);
    const page2 = results.slice(pageSize, pageSize * 2);

    expect(page1.length).toBe(pageSize);
    expect(page2.length).toBe(pageSize);
    expect(page1[0]).not.toEqual(page2[0]);
  });
});
