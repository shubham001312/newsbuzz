// ============================================================
//  js/search.js  — Search bar with pagination, highlights,
//                  AI on-demand generation, and admin trigger
// ============================================================

import { allArticles, injectArticle } from './news.js';
import { saveArticle } from './firebase.js';
import { getArticleImage } from './news.js';

const RESULTS_PER_PAGE = 8;
let searchResults = [];
let currentPage = 1;
let lastQuery = '';

export function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const val = input.value.trim();

    // Secret admin trigger
    if (val === CONFIG.ADMIN_CODE) {
      input.value = '';
      try {
        const admin = await import('./admin.js');
        if (admin.openAdmin) admin.openAdmin();
      } catch (e) {
        console.error('[Admin] Failed to open:', e);
        alert('Admin panel failed to load. Check browser console for details.');
      }
      return;
    }

    if (!val) return;
    lastQuery = val;
    currentPage = 1;

    const q = val.toLowerCase();
    searchResults = allArticles.filter(a =>
      (a.title       || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.titleBn     || '').includes(val) ||
      (a.descriptionBn || '').includes(val) ||
      (a.tags        || []).some(t => t.toLowerCase().includes(q))
    );

    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById('page-search')?.classList.add('active');
    document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));

    const $c = document.getElementById('search-count');
    const $r = document.getElementById('search-results');
    if (!$r) return;

    if (!searchResults.length) {
      // ── AI On-Demand Generation ────────────────────────────
      if ($c) $c.textContent = `Searching the wire for "${val}"…`;
      $r.innerHTML = `
        <div class="search-generating">
          <div class="search-generating__spinner"></div>
          <p>🔍 No local results found. NewsBuzz AI is live-searching the wire and generating an authentic report…</p>
        </div>`;

      try {
        const { generateSearchArticle } = await import('./openrouter.js');
        const article = await generateSearchArticle(val, 'national');
        article.source    = 'AI / NewsBuzz Wire';
        article.timestamp = Date.now();
        article.autoPosted = true;

        const id = await saveArticle(article);
        const full = { ...article, id };
        injectArticle(full);

        // Add to search results and render
        searchResults = [full];
        currentPage = 1;
        renderSearchPage(val, $c, $r);
      } catch (err) {
        console.error('[Search] AI generation failed:', err);
        if ($c) $c.textContent = `0 results for "${val}"`;
        $r.innerHTML = '<div class="search-empty"><strong>0 results</strong> for "' + escapeHtml(val) + '". AI generation failed. Try different keywords.</div>';
      }
    } else {
      // ── Normal local search results with pagination ────────
      renderSearchPage(val, $c, $r);
    }
  });
}

// ── Render search page with pagination ───────────────────────
function renderSearchPage(query, $countEl, $resultsEl) {
  const total = searchResults.length;
  const totalPages = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE));

  if (currentPage > totalPages) currentPage = totalPages;

  if ($countEl) {
    $countEl.textContent = `${total} result${total !== 1 ? 's' : ''} for "${query}"`;
  }

  const start = (currentPage - 1) * RESULTS_PER_PAGE;
  const end = Math.min(start + RESULTS_PER_PAGE, total);
  const pageItems = searchResults.slice(start, end);

  const lang = window.__lang || 'en';

  let html = '<div class="search-page-grid">';

  pageItems.forEach(a => {
    const title = (lang === 'bn' && a.titleBn) ? a.titleBn : (a.title || 'Untitled');
    const descVal = (lang === 'bn' && a.descriptionBn) ? a.descriptionBn : (a.description || '');
    const desc = descVal.slice(0, 200) + (descVal.length > 200 ? '…' : '');
    const tags = (a.tags || []).slice(0, 4).map(t => `<span class="tag">#${t}</span>`).join('');
    const imgUrl = getArticleImage(a);
    const imgHtml = imgUrl ? `<img src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : '';
    const sourcesHtml = (a.sources || []).map(s =>
      `<a href="${s.url}" target="_blank" rel="noopener" class="search-result-source">${s.name}</a>`
    ).join(', ');

    // Highlight matching text
    const highlightedTitle = highlightText(title, query);
    const highlightedDesc = highlightText(desc, query);
    const hasImage = !!imgUrl;
    const articleClass = hasImage ? 'search-result-card' : 'search-result-card search-result-card--noimg';

    html += `
      <article class="${articleClass}" onclick="window.__openArticle('${a.id}')">
        ${imgHtml}
        <div class="card__body">
          <div class="card__cat">${catLabel(a.category)}</div>
          <h3 class="card__title">${highlightedTitle}</h3>
          <p class="card__desc">${highlightedDesc}</p>
          ${tags ? `<div class="card__tags">${tags}</div>` : ''}
          <div class="card__foot">
            <span class="card__time">${timeAgo(a.timestamp)} &middot; ${calcReadTime(descVal)} min read</span>
            <span class="card__source">${a.source || 'NewsBuzz'}</span>
          </div>
          ${sourcesHtml ? `<div class="search-result-sources">Sources: ${sourcesHtml}</div>` : ''}
        </div>
      </article>`;
  });

  html += '</div>';

  // ── Pagination controls ────────────────────────────────────
  html += renderPagination(total, totalPages);

  $resultsEl.innerHTML = html;

  // Attach pagination event listeners after rendering
  if (totalPages > 1) {
    attachPaginationListeners($resultsEl);
  }
}

// ── Render pagination UI ─────────────────────────────────────
function renderPagination(total, totalPages) {
  if (totalPages <= 1) return '';

  let html = '<div class="search-pagination">';

  // Previous button
  html += `<button class="search-pagination__btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>
    ← Prev
  </button>`;

  // Page numbers with ellipsis
  html += '<div class="search-pagination__pages">';
  
  const pages = getPaginationRange(currentPage, totalPages);
  pages.forEach(p => {
    if (p === '...') {
      html += `<span class="search-pagination__page ellipsis">…</span>`;
    } else {
      html += `<button class="search-pagination__page ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  html += '</div>';

  // Next button
  html += `<button class="search-pagination__btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>
    Next →
  </button>`;

  // Info text
  const start = (currentPage - 1) * RESULTS_PER_PAGE + 1;
  const end = Math.min(currentPage * RESULTS_PER_PAGE, total);
  html += `<span class="search-pagination__info">${start}–${end} of ${total}</span>`;

  html += '</div>';
  return html;
}

// ── Calculate pagination range with ellipsis ──────────────────
function getPaginationRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  
  if (current <= 4) {
    // Show: 1 2 3 4 5 … total
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  } else if (current >= total - 3) {
    // Show: 1 … total-4 total-3 total-2 total-1 total
    pages.push(1);
    pages.push('...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    // Show: 1 … current-1 current current+1 … total
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

// ── Attach pagination click listeners ────────────────────────
function attachPaginationListeners($container) {
  $container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.page;
      if (target === 'prev' && currentPage > 1) {
        currentPage--;
      } else if (target === 'next') {
        currentPage++;
      } else if (target !== 'prev' && target !== 'next') {
        currentPage = parseInt(target, 10);
      }
      
      const $c = document.getElementById('search-count');
      const $r = document.getElementById('search-results');
      if ($r) renderSearchPage(lastQuery, $c, $r);
      
      // Scroll to top of search results
      const el = document.getElementById('page-search');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── Highlight matching text ──────────────────────────────────
function highlightText(text, query) {
  if (!text || !query) return text || '';
  const escaped = escapeRegExp(query);
  // Split into words for multi-word highlighting
  const words = escaped.split(/\s+/).filter(Boolean);
  let result = escapeHtml(text);
  words.forEach(word => {
    if (word.length < 2) return;
    const regex = new RegExp(`(${word})`, 'gi');
    result = result.replace(regex, '<span class="search-highlight">$1</span>');
  });
  return result;
}

// ── Helpers ──────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function catLabel(cat) {
  const SECTIONS = {
    wb: 'West Bengal', national: 'National', govt: 'Govt Schemes',
    politics: 'Politics', crime: 'Crime & Law', education: 'Education',
    sports: 'Sports', weather: 'Weather'
  };
  const lang = window.__lang || 'en';
  const SECTIONS_BN = {
    wb: 'পশ্চিমবঙ্গ', national: 'জাতীয়', govt: 'সরকারি প্রকল্প',
    politics: 'রাজনীতি', crime: 'অপরাধ', education: 'শিক্ষা',
    sports: 'খেলাধুলা', weather: 'আবহাওয়া'
  };
  if (lang === 'bn' && SECTIONS_BN[cat]) return SECTIONS_BN[cat];
  return SECTIONS[cat] || cat;
}

function timeAgo(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function calcReadTime(text) {
  const wordCount = (text || '').split(/\s+/).length || 1;
  return Math.max(1, Math.round(wordCount / 160));
}
