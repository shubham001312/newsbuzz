// ============================================================
//  js/news.js  — Article rendering, state, modal, infinite scroll
// ============================================================

import { loadArticles, saveArticle } from './firebase.js';

// ── Global state ─────────────────────────────────────────────
export let allArticles = [];
export let currentSection = 'home';
let isLoadingMore = false;
let displayedCount = 15; // Initial number of articles displayed on infinite scroll

const SECTIONS = {
  wb        : { en: 'West Bengal',         bn: 'পশ্চিমবঙ্গ' },
  national  : { en: 'National India',      bn: 'জাতীয় ভারত' },
  govt      : { en: 'Govt Schemes',        bn: 'সরকারি প্রকল্প' },
  politics  : { en: 'Politics',            bn: 'রাজনীতি' },
  crime     : { en: 'Crime & Law',         bn: 'অপরাধ ও আইন' },
  education : { en: 'Education',           bn: 'শিক্ষা' },
  sports    : { en: 'Sports',              bn: 'খেলাধুলা' },
  weather   : { en: 'Weather',             bn: 'আবহাওয়া' },
};
export { SECTIONS };

// ── Curated High-Quality Images Mapped to Categories ─────────
export function getArticleImage(a) {
  if (a.image && !a.image.includes('source.unsplash.com') && a.image !== 'https://images.unsplash.com/photo-') {
    return a.image;
  }
  
  const images = {
    wb: [
      'https://images.unsplash.com/photo-1558431382-27e303142255?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1601999007938-f584b473347b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1562670305-e5f6c5bb887e?w=800&auto=format&fit=crop&q=80'
    ],
    national: [
      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596422846543-75c6fc18a52b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80'
    ],
    govt: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80'
    ],
    politics: [
      'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80'
    ],
    crime: [
      'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507208773393-40d9fc670acf?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80'
    ],
    education: [
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80'
    ],
    sports: [
      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1589987607627-616cca7bfaaa?w=800&auto=format&fit=crop&q=80'
    ],
    weather: [
      'https://images.unsplash.com/photo-1504608524841-42584120d832?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1461511663015-0a700dd4c8cd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504370805625-d32c54b16100?w=800&auto=format&fit=crop&q=80'
    ]
  };
  
  const catImages = images[a.category] || images['wb'];
  const hashStr = a.id || a.title || '';
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % catImages.length;
  return catImages[index];
}

// ── Load all articles from Firebase with skeleton ────────────
export async function loadAndRender() {
  // Show skeletons immediately
  showSkeletons();
  
  try {
    allArticles = await loadArticles({ max: 200 });
    // If database is completely empty (first run), load sample fallback
    if (!allArticles.length) {
      allArticles = getSampleArticles();
    }
  } catch {
    allArticles = getSampleArticles();
  }
  
  renderAll();
  updateTicker();
  setupInfiniteScroll();
  initAllFeatures();
}

// ── Show skeleton loading placeholders ───────────────────────
function showSkeletons() {
  const skeletonHeroLeft = document.getElementById('hero-left');
  const skeletonHeroCenter = document.getElementById('hero-center');
  const skeletonHeroRight = document.getElementById('hero-right');
  const skeletonTrending = document.getElementById('trending-list');
  const skeletonStrips = document.getElementById('strips');
  const skeletonInfinite = document.getElementById('infinite-scroll-grid');

  if (skeletonHeroLeft) {
    skeletonHeroLeft.innerHTML = `
      <div class="col-label">Latest</div>
      <div class="card card--tiny skeleton-card">
        <div class="card__body">
          <div class="card__cat skeleton"></div>
          <h3 class="card__title skeleton"></h3>
        </div>
      </div>
      <div class="card card--tiny skeleton-card">
        <div class="card__body">
          <div class="card__cat skeleton"></div>
          <h3 class="card__title skeleton"></h3>
        </div>
      </div>
      <div class="card card--tiny skeleton-card">
        <div class="card__body">
          <div class="card__cat skeleton"></div>
          <h3 class="card__title skeleton"></h3>
        </div>
      </div>`;
  }

  if (skeletonHeroCenter) {
    skeletonHeroCenter.innerHTML = `
      <div class="col-label">Top Story</div>
      <div class="card card--hero skeleton-card">
        <div class="skeleton skeleton-hero-img"></div>
        <div class="card__body">
          <div class="card__cat skeleton"></div>
          <h3 class="card__title skeleton"></h3>
          <h3 class="card__title skeleton" style="width:75%"></h3>
          <div class="card__desc skeleton"></div>
          <div class="card__desc skeleton" style="width:70%"></div>
          <div class="card__foot skeleton"></div>
        </div>
      </div>`;
  }

  if (skeletonHeroRight) {
    skeletonHeroRight.innerHTML = `
      <div class="col-label">More News</div>
      ${Array(4).fill(`
        <div class="card card--small skeleton-card">
          <div class="skeleton" style="width:90px;height:68px;flex-shrink:0"></div>
          <div class="card__body">
            <div class="card__cat skeleton" style="width:60px"></div>
            <h3 class="card__title skeleton"></h3>
            <div class="card__foot skeleton" style="width:40%"></div>
          </div>
        </div>`).join('')}`;
  }

  if (skeletonTrending) {
    skeletonTrending.innerHTML = Array(5).fill(`
      <div class="skeleton-trending-item">
        <div class="skeleton skeleton-rank"></div>
        <div class="skeleton-text">
          <div class="skeleton"></div>
          <div class="skeleton"></div>
        </div>
      </div>`).join('');
  }

  if (skeletonStrips) {
    skeletonStrips.innerHTML = Array(3).fill(`
      <section class="strip">
        <div class="strip__header">
          <h2 class="strip__title skeleton" style="width:150px;height:24px;background:var(--rule-faint);border-radius:2px"></h2>
        </div>
        <div class="strip__grid">
          ${Array(4).fill(`
            <div class="card card--medium skeleton-card">
              <div class="skeleton" style="height:155px;width:100%;margin-bottom:8px"></div>
              <div class="card__body">
                <div class="card__cat skeleton" style="width:80px"></div>
                <h3 class="card__title skeleton"></h3>
                <div class="card__desc skeleton"></div>
                <div class="card__desc skeleton" style="width:60%"></div>
                <div class="card__foot skeleton" style="width:50%"></div>
              </div>
            </div>`).join('')}
        </div>
      </section>`).join('');
  }

  if (skeletonInfinite) {
    skeletonInfinite.innerHTML = Array(6).fill(`
      <div class="card card--medium skeleton-card">
        <div class="skeleton" style="height:155px;width:100%;margin-bottom:8px"></div>
        <div class="card__body">
          <div class="card__cat skeleton" style="width:70px"></div>
          <h3 class="card__title skeleton"></h3>
          <div class="card__desc skeleton"></div>
          <div class="card__desc skeleton" style="width:55%"></div>
          <div class="card__foot skeleton" style="width:45%"></div>
        </div>
      </div>`).join('');
  }
}

// ── Real-time updates via polling ────────────────────────────
function setupRealTimeListener() {
  // Poll for new articles every 15 seconds
  setInterval(async () => {
    try {
      const fresh = await loadArticles({ max: 200 });
      if (fresh.length > 0 && fresh[0]?.timestamp !== allArticles[0]?.timestamp) {
        const prevIds = new Set(allArticles.map(a => a.id));
        const newArts = fresh.filter(a => !prevIds.has(a.id));
        
        // Preserve bookmarks and history
        const bookmarkedIds = getBookmarks();
        const historyIds = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        
        allArticles = fresh;
        
        // Restore any data that was on old articles
        if (bookmarkedIds.length || historyIds.length) {
          allArticles = fresh.map(a => ({
            ...a,
            _bookmarked: bookmarkedIds.includes(a.id)
          }));
        }
        
        renderAll();
        updateTicker();
        
        newArts.slice(0, 2).forEach(a => {
          sendPushNotification(a);
        });
      }
    } catch(e) {
      // Silent fail for polling
    }
  }, 15000);
}

// ── Initialize all features ───────────────────────────────────
export function initAllFeatures() {
  setupBackToTop();
  setupDarkMode();
  setupBookmarks();
  setupPushNotifications();
  setupWeatherWidget();
  setupTrendingChips();
  setupUserRecognition();
  setupSmartRedirects();
  setupReaderPersonas();
  updateBreadcrumbs('home');
  initSEO();
  setupRealTimeListener();
  setupGovtMonitor();
  setupRSSFeeds();
  initABTestTracking();
  
  // Show survey banner if an active survey exists
  setTimeout(showSurveyBanner, 5000);
}

// ── Add one article to state + re-render (for auto-publish) ──
export function injectArticle(article) {
  allArticles.unshift(article);
  renderAll();
  updateTicker();
}

// ── Render everything ────────────────────────────────────────
export function renderAll() {
  renderHero();
  renderStrips();
  renderTrending();
  renderCategorySections();
  
  // Render initial infinite scroll pool
  const grid = document.getElementById('infinite-scroll-grid');
  if (grid) {
    grid.innerHTML = allArticles.slice(8, displayedCount).map(a => cardHTML(a, 'medium')).join('');
  }
}

function byCategory(cat, n = 20) {
  return allArticles.filter(a => a.category === cat).slice(0, n);
}

function catLabel(cat) {
  const lang = window.__lang || 'en';
  return SECTIONS[cat] ? (lang === 'bn' ? SECTIONS[cat].bn : SECTIONS[cat].en) : cat;
}

function timeAgo(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1)  return 'এইমাত্র / Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Article card HTML ────────────────────────────────────────
function cardHTML(a, size = 'small') {
  const lang  = window.__lang || 'en';
  const title = (lang === 'bn' && a.titleBn) ? a.titleBn : (a.title || 'Untitled');
  const descVal = (lang === 'bn' && a.descriptionBn) ? a.descriptionBn : (a.description || '');
  const desc  = descVal.slice(0, 130) + (descVal.length > 130 ? '…' : '');
  const cat   = catLabel(a.category);
  const tags  = (a.tags || []).slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join('');
  const imgUrl = getArticleImage(a);
  const img   = imgUrl ? `<img src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : '';

  // Calculate Reading Time
  const wordCount = descVal.split(/\s+/).length || 1;
  const minRead = Math.max(1, Math.round(wordCount / 160));
  
  // Bookmark state
  const bookmarked = isBookmarked(a.id) ? '⭐' : '☆';
  const bookmarkedClass = isBookmarked(a.id) ? ' bookmarked' : '';

  return `
  <article class="card card--${size}" data-id="${a.id}" onclick="window.__openArticle('${a.id}')">
    ${size !== 'tiny' ? img : ''}
    <button class="btn-bookmark${bookmarkedClass}" onclick="event.stopPropagation();window.__toggleCardBookmark('${a.id}',this)" title="Save article">${bookmarked}</button>
    <div class="card__body">
      <div class="card__cat">${cat}</div>
      <h3 class="card__title">${title}</h3>
      ${size !== 'tiny' ? `<p class="card__desc">${desc}</p>` : ''}
      <div class="card__foot">
        <span class="card__time">${timeAgo(a.timestamp)} &middot; ${minRead} min read</span>
        <span class="card__source">${a.source || 'NewsBuzz'}</span>
      </div>
      ${tags ? `<div class="card__tags">${tags}</div>` : ''}
    </div>
  </article>`;
}

// ── Hero grid ────────────────────────────────────────────────
function renderHero() {
  const top = allArticles.slice(0, 8);
  if (!top.length) return;

  const $L = document.getElementById('hero-left');
  const $C = document.getElementById('hero-center');
  const $R = document.getElementById('hero-right');
  if (!$L || !$C || !$R) return;

  $C.innerHTML = top[0] ? cardHTML(top[0], 'hero') : '';
  $L.innerHTML = top.slice(5, 8).map(a => cardHTML(a, 'tiny')).join('');
  $R.innerHTML = top.slice(1, 5).map(a => cardHTML(a, 'small')).join('');
}

// ── Section strips on homepage ───────────────────────────────
function renderStrips() {
  const $s = document.getElementById('strips');
  if (!$s) return;
  const lang = window.__lang || 'en';
  let html = '';

  Object.keys(SECTIONS).forEach(cat => {
    const arts = byCategory(cat, 4);
    if (!arts.length) return;
    const label = lang === 'bn' ? SECTIONS[cat].bn : SECTIONS[cat].en;
    html += `
      <section class="strip" id="strip-${cat}">
        <div class="strip__header">
          <h2 class="strip__title">${label}</h2>
          <a href="#" class="strip__more" onclick="window.__showSection('${cat}',event)">
            ${lang === 'bn' ? 'আরও দেখুন' : 'See all'} →
          </a>
        </div>
        <div class="strip__grid">${arts.map(a => cardHTML(a, 'medium')).join('')}</div>
      </section>
      <div class="ad-slot"><span>Advertisement</span></div>`;
  });

  $s.innerHTML = html;
}

// ── Trending Sidebar ──────────────────────────────────────────
export function renderTrending() {
  const $t = document.getElementById('trending-list');
  if (!$t) return;
  
  // Sort articles by viral score or views
  const trending = [...allArticles]
    .sort((a, b) => (b.viralScore || 0) - (a.viralScore || 0))
    .slice(0, 5);

  const lang = window.__lang || 'en';

  $t.innerHTML = trending.map((a, index) => {
    const title = (lang === 'bn' && a.titleBn) ? a.titleBn : (a.title || 'Untitled');
    return `
      <div class="trending-item" onclick="window.__openArticle('${a.id}')" style="cursor: pointer; display: flex; gap: 12px; margin-bottom: 15px; border-bottom: 1px dashed var(--rule-light); padding-bottom: 12px;">
        <div class="trending-item__rank" style="font-family: var(--font-head); font-size: 24px; font-weight: 900; color: var(--rule-light); width: 25px; text-align: center;">${index + 1}</div>
        <div class="trending-item__content" style="flex: 1; min-width: 0;">
          <div class="trending-item__cat" style="font-size: 8.5px; text-transform: uppercase; color: var(--accent); letter-spacing: 1px; margin-bottom: 2px;">${catLabel(a.category)}</div>
          <h4 class="trending-item__title" style="font-family: var(--font-head); font-size: 13.5px; font-weight: 700; line-height: 1.3; color: var(--ink); margin: 0;">${title}</h4>
        </div>
      </div>`;
  }).join('');
}

// ── Individual category pages ────────────────────────────────
function renderCategorySections() {
  Object.keys(SECTIONS).forEach(cat => {
    const $el = document.getElementById(`page-${cat}`);
    if (!$el) return;
    
    // Strict category filter with secondary check for common mis-categorizations
    const arts = allArticles.filter(a => {
      if (a.category === cat) return true;
      // Fix common mis-categorizations via tags
      if (!a.category && a.tags) {
        const catKeywords = {
          wb: ['west bengal', 'kolkata', 'bengal', 'bangla'],
          national: ['india', 'parliament', 'supreme court', 'delhi'],
          govt: ['scheme', 'yojana', 'government', 'pm'],
          politics: ['election', 'party', 'vote', 'political'],
          crime: ['crime', 'arrest', 'cbi', 'police', 'court'],
          education: ['exam', 'result', 'school', 'college', 'university'],
          sports: ['cricket', 'football', 'match', 'sports', 'ipl'],
          weather: ['weather', 'rain', 'cyclone', 'temperature', 'imd']
        };
        const keywords = catKeywords[cat] || [];
        const titleLower = (a.title || '').toLowerCase();
        const tagsLower = (a.tags || []).join(' ').toLowerCase();
        const combined = titleLower + ' ' + tagsLower;
        if (keywords.some(k => combined.includes(k))) return true;
      }
      return false;
    }).slice(0, 30);
    
    const label = catLabel(cat);
    $el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${label}</h1>
        <p class="page-count">${arts.length} articles</p>
      </div>
      <div class="page-grid">
        ${arts.length
          ? arts.map(a => cardHTML(a, 'medium')).join('')
          : `<p class="empty">No articles in this category yet — AI is fetching latest from the wire…</p>`}
      </div>`;
  });
}

// ── Breaking ticker ──────────────────────────────────────────
export function updateTicker() {
  const $t = document.getElementById('ticker-track');
  if (!$t) return;
  const headlines = allArticles.slice(0, 10).map(a => a.title || '');
  if (!headlines.length) return;
  $t.innerHTML = [...headlines, ...headlines] // doubled for seamless loop
    .map(h => `<span class="tick-item">${h}</span>`)
    .join('');
}

// ── Show/hide section ────────────────────────────────────────
export function showSection(name, e) {
  if (e) e.preventDefault();
  currentSection = name;

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`page-${name}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('#main-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.section === name);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Update breadcrumbs for SEO
  updateBreadcrumbs(name);
  
  // Close article modal if open
  const modal = document.getElementById('article-modal');
  if (modal && modal.classList.contains('visible')) {
    closeArticle();
  }
  
  // Render bookmarks page if navigating to it
  if (name === 'bookmarks') {
    renderBookmarksPage();
  }
}

// ── Open article modal ───────────────────────────────────────
export function openArticle(id) {
  const a = allArticles.find(x => x.id === id);
  if (!a) return;

  // Track A/B test click
  trackABTestClick(id);

  // Add to reading history
  addToHistory(id);

  const lang  = window.__lang || 'en';
  const title = (lang === 'bn' && a.titleBn) ? a.titleBn : a.title;
  const desc  = (lang === 'bn' && a.descriptionBn) ? a.descriptionBn : (a.description || '');
  const cat   = catLabel(a.category);
  const tags  = (a.tags || []).map(t => `<a class="tag tag--lg" href="#">#${t}</a>`).join('');

  // Update meta tags dynamically for SEO
  const seoTitle = a.seoTitle || title;
  const seoDesc = a.seoDesc || (desc.slice(0, 155));
  document.title = `${seoTitle} — NewsBuzz`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = seoDesc;
  
  // Update OG tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = `${seoTitle} — NewsBuzz`;
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = seoDesc;
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = `https://newsbuzz.in/?article=${a.id}`;
  
  // Update Twitter tags
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.content = `${seoTitle} — NewsBuzz`;
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.content = seoDesc;
  
  // Update JSON-LD structured data
  updateArticleSEO(a);

  // Set article ID on modal for reaction buttons
  document.getElementById('article-modal').dataset.articleId = a.id;

  document.getElementById('modal-cat').textContent   = cat;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-meta').innerHTML    = `${timeAgo(a.timestamp)} &nbsp;·&nbsp; ${a.source || 'NewsBuzz'}`;
  
  const imgUrl = getArticleImage(a);
  document.getElementById('modal-img').src           = imgUrl || '';
  document.getElementById('modal-img').style.display = imgUrl ? 'block' : 'none';
  document.getElementById('modal-body').innerHTML    = desc
    .split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('');
  document.getElementById('modal-tags').innerHTML    = tags;

  // Reading Progress resets to 0%
  const progressBar = document.getElementById('modal-progress-bar');
  if (progressBar) progressBar.style.width = '0%';

  // Render sources
  const sourcesEl = document.getElementById('modal-sources');
  if (sourcesEl) {
    if (a.sources && a.sources.length) {
      sourcesEl.innerHTML = 'Sources: ' + a.sources.map(s => `<a href="${s.url}" target="_blank" style="color:var(--accent);text-decoration:underline;">${s.name}</a>`).join(', ');
      sourcesEl.style.display = 'block';
    } else {
      sourcesEl.innerHTML = '';
      sourcesEl.style.display = 'none';
    }
  }

  // ── Share buttons ────────────────────────────────────────────
  const shareTitle = encodeURIComponent(title + " — NewsBuzz");
  const shareUrl = encodeURIComponent(window.location.origin + window.location.pathname + "?article=" + a.id);
  const shareFull = `${shareTitle}%20${shareUrl}`;
  
  const waBtn = document.getElementById('share-wa');
  if (waBtn) waBtn.onclick = () => window.open(`https://api.whatsapp.com/send?text=${shareFull}`, '_blank');
  
  const fbBtn = document.getElementById('share-fb');
  if (fbBtn) fbBtn.onclick = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
  
  const twitterBtn = document.getElementById('share-twitter');
  if (twitterBtn) twitterBtn.onclick = () => window.open(`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}&via=newsbuzz`, '_blank');
  
  const emailBtn = document.getElementById('share-email');
  if (emailBtn) emailBtn.onclick = () => {
    window.location.href = `mailto:?subject=${shareTitle}&body=Read this article from NewsBuzz: ${decodeURIComponent(shareUrl)}`;
  };
  
  const copyBtn = document.getElementById('share-copy');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(decodeURIComponent(shareUrl));
      // Visual feedback
      copyBtn.textContent = '✓';
      setTimeout(() => { copyBtn.textContent = '📋'; }, 2000);
    };
  }

  // ── Bookmark button in modal ─────────────────────────────────
  const bmBtn = document.getElementById('modal-bookmark-btn');
  if (bmBtn) {
    const bookmarked = isBookmarked(a.id);
    bmBtn.textContent = bookmarked ? '⭐' : '☆';
    bmBtn.classList.toggle('bookmarked', bookmarked);
    bmBtn.onclick = () => {
      const now = toggleBookmark(a.id);
      bmBtn.textContent = now ? '⭐' : '☆';
      bmBtn.classList.toggle('bookmarked', now);
    };
  }

  // ── Print button ─────────────────────────────────────────────
  const printBtn = document.getElementById('modal-print-btn');
  if (printBtn) {
    printBtn.onclick = () => {
      window.print();
    };
  }

  // ── Related articles ─────────────────────────────────────────
  renderRelatedArticles(a);

  document.getElementById('article-modal').classList.add('visible');
  document.body.style.overflow = 'hidden';

  // Modal Reading Progress Scroll Listener
  const overlay = document.getElementById('article-modal');
  overlay.onscroll = () => {
    const scrollHeight = overlay.scrollHeight - overlay.clientHeight;
    const progress = scrollHeight > 0 ? (overlay.scrollTop / scrollHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = `${progress}%`;
  };
}

// ── Render related articles in modal ───────────────────────────
function renderRelatedArticles(current) {
  const $section = document.getElementById('modal-related');
  const $grid = document.getElementById('modal-related-grid');
  if (!$section || !$grid) return;
  
  // Find related by same category, then by tags
  let related = allArticles
    .filter(a => a.id !== current.id && a.category === current.category)
    .slice(0, 3);
  
  // If not enough, fill from other categories
  if (related.length < 3) {
    const more = allArticles
      .filter(a => a.id !== current.id && a.category !== current.category)
      .slice(0, 3 - related.length);
    related = [...related, ...more];
  }
  
  if (!related.length) {
    $section.style.display = 'none';
    return;
  }
  
  $section.style.display = 'block';
  $grid.innerHTML = related.map(a => {
    const lang = window.__lang || 'en';
    const title = (lang === 'bn' && a.titleBn) ? a.titleBn : (a.title || '');
    const imgUrl = getArticleImage(a);
    const img = imgUrl ? `<img src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : '';
    return `
      <div class="card card--small" onclick="window.__openArticle('${a.id}')">
        ${img}
        <div class="card__body">
          <div class="card__cat">${catLabel(a.category)}</div>
          <h3 class="card__title">${title}</h3>
        </div>
      </div>`;
  }).join('');
}

export function closeArticle() {
  document.getElementById('article-modal').classList.remove('visible');
  document.body.style.overflow = '';
  document.title = 'NewsBuzz — বাংলা ও ভারতের সংবাদ';
  
  // Reset SEO to default
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = 'NewsBuzz brings you the latest breaking news from West Bengal and India — politics, crime, education, sports, weather and government schemes in English and Bengali.';
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = 'NewsBuzz — West Bengal &amp; India News';
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = 'Latest breaking news from West Bengal and India in English and Bengali.';
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = 'https://newsbuzz.in/';
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.content = 'NewsBuzz — West Bengal &amp; India News';
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.content = 'Latest breaking news from West Bengal and India.';
  
  // Reset JSON-LD
  const ldArticle = document.getElementById('ld-article');
  if (ldArticle) {
    ldArticle.textContent = '{"@context":"https://schema.org","@type":"NewsArticle","mainEntityOfPage":{"@type":"WebPage","@id":"https://newsbuzz.in"}}';
  }
  updateBreadcrumbs('home');
}

// ── Infinite Scroll (Unending Page) ──────────────────────────
export function setupInfiniteScroll() {
  window.addEventListener('scroll', async () => {
    if (currentSection !== 'home') return;
    
    // Check if scrolled near bottom
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
      if (isLoadingMore) return;
      isLoadingMore = true;
      await loadNextBatch();
      isLoadingMore = false;
    }
  });
}

async function loadNextBatch() {
  const container = document.getElementById('infinite-scroll-grid');
  if (!container) return;

  const loader = document.getElementById('infinite-loader');
  if (loader) loader.style.display = 'block';

  await new Promise(r => setTimeout(r, 800)); // Smooth loading transition

  const batchSize = 6;
  const start = displayedCount;
  const end = start + batchSize;

  if (start < allArticles.length) {
    const nextArticles = allArticles.slice(start, end);
    const html = nextArticles.map(a => cardHTML(a, 'medium')).join('');
    container.insertAdjacentHTML('beforeend', html);
    displayedCount = Math.min(allArticles.length, end);
  } else {
    // Immence data live fetch from backend AI
    try {
      const categories = ['wb', 'national', 'govt', 'politics', 'crime', 'education', 'sports', 'weather'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      const CATEGORY_TOPICS_FALLBACK = {
        wb: ['Kolkata local news update', 'West Bengal political dialogue'],
        national: ['India GDP and trade outlook', 'Indian Parliament policy update'],
        govt: ['Digital India expansion schemes', 'Lakhpati Didi scheme update'],
        politics: ['Opposition alliance statements India', 'Indian political debate today'],
        crime: ['Cyber investigation unit crackdown India', 'Supreme Court India law verdict'],
        education: ['University Grants Commission reforms India', 'National Education Policy update'],
        sports: ['Indian cricket league match highlight', 'ISL football match analysis'],
        weather: ['Monsoon onset alert India IMD', 'Bay of Bengal deep depression alert']
      };
      
      const topics = CATEGORY_TOPICS_FALLBACK[randomCategory];
      const topic = topics[Math.floor(Math.random() * topics.length)];

      console.log(`[InfiniteScroll] Generating live backend AI article for: ${topic}`);
      const { generateArticle } = await import('./openrouter.js');
      const article = await generateArticle(topic, randomCategory);
      
      article.source     = 'AI / NewsBuzz Wire';
      article.timestamp  = Date.now();
      article.autoPosted = true;

      const id = await saveArticle(article);
      const newArticle = { ...article, id };

      allArticles.push(newArticle);
      const html = cardHTML(newArticle, 'medium');
      container.insertAdjacentHTML('beforeend', html);
      displayedCount++;
    } catch (e) {
      console.warn('[InfiniteScroll] Live AI generation failed:', e.message);
    }
  }

  if (loader) loader.style.display = 'none';
}

// ── Back to Top Button ────────────────────────────────────────
function setupBackToTop() {
  const btn = document.getElementById('back-to-top-btn');
  if (!btn) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 600) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });
  
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── Dark Mode Toggle ──────────────────────────────────────────
function setupDarkMode() {
  const btn = document.getElementById('dark-toggle-btn');
  if (!btn) return;
  
  // Check saved preference
  const isDark = localStorage.getItem('nb_dark_mode') === 'true';
  if (isDark) {
    document.documentElement.classList.add('dark-mode');
    btn.textContent = '☀️';
  }
  
  btn.addEventListener('click', () => {
    const on = document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('nb_dark_mode', on);
    btn.textContent = on ? '☀️' : '🌙';
  });
}

// ── Bookmarks (localStorage) ──────────────────────────────────
const BOOKMARKS_KEY = 'nb_bookmarks';

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
  } catch { return []; }
}

function saveBookmarks(ids) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids));
}

function isBookmarked(id) {
  return getBookmarks().includes(id);
}

function toggleBookmark(id) {
  let ids = getBookmarks();
  if (ids.includes(id)) {
    ids = ids.filter(x => x !== id);
  } else {
    ids.push(id);
  }
  saveBookmarks(ids);
  renderBookmarksPage();
  return ids.includes(id);
}

function setupBookmarks() {
  const bookmarksLink = document.querySelector('#main-nav a[data-section="bookmarks"]');
  if (bookmarksLink) {
    bookmarksLink.style.position = 'relative';
  }
  renderBookmarksPage();
}

export function renderBookmarksPage() {
  const $list = document.getElementById('bookmarks-list');
  const $count = document.getElementById('bookmarks-count');
  const $empty = document.getElementById('bookmarks-empty');
  if (!$list) return;
  
  const ids = getBookmarks();
  const savedArts = allArticles.filter(a => ids.includes(a.id));
  
  if ($count) {
    $count.textContent = `${savedArts.length} saved`;
  }
  
  if ($empty) {
    $empty.style.display = savedArts.length ? 'none' : 'block';
  }
  
  if (savedArts.length) {
    const lang = window.__lang || 'en';
    $list.innerHTML = '<div class="page-grid">' + savedArts.map(a => {
      const title = (lang === 'bn' && a.titleBn) ? a.titleBn : (a.title || 'Untitled');
      const descVal = (lang === 'bn' && a.descriptionBn) ? a.descriptionBn : (a.description || '');
      const desc = descVal.slice(0, 100) + '…';
      const imgUrl = getArticleImage(a);
      const img = imgUrl ? `<img src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : '';
      return `
        <article class="card card--medium" data-id="${a.id}" onclick="window.__openArticle('${a.id}')">
          ${img}
          <div class="card__body">
            <div class="card__cat">${catLabel(a.category)}</div>
            <h3 class="card__title">${title}</h3>
            <p class="card__desc">${desc}</p>
            <div class="card__foot">
              <span class="card__time">${timeAgo(a.timestamp)}</span>
              <span class="card__source">${a.source || 'NewsBuzz'}</span>
            </div>
          </div>
        </article>`;
    }).join('') + '</div>';
  }
}

// ── Reading History (localStorage) ────────────────────────────
const HISTORY_KEY = 'nb_history';

function addToHistory(id) {
  try {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history = [id, ...history.filter(x => x !== id)];
    if (history.length > 100) history = history.slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

// ── User Recognition System ──────────────────────────────────
function setupUserRecognition() {
  let visits = Number(localStorage.getItem('nb_visits') || 0);
  visits++;
  localStorage.setItem('nb_visits', String(visits));
  
  if (!localStorage.getItem('nb_first_visit')) {
    localStorage.setItem('nb_first_visit', String(Date.now()));
  }
  
  // Show welcome back for returning readers
  if (visits > 1) {
    const firstVisit = Number(localStorage.getItem('nb_first_visit'));
    const daysSince = Math.floor((Date.now() - firstVisit) / 86400000);
    
    setTimeout(() => {
      const el = document.getElementById('site-subtitle');
      if (el && daysSince > 0) {
        const lang = window.__lang || 'en';
        const msg = lang === 'bn' 
          ? `👋 স্বাগতম! ${daysSince} দিন ধরে আছেন — ${visits} বার দেখা`
          : `👋 Welcome back! ${daysSince} day reader — ${visits} visits`;
        el.textContent = msg;
        setTimeout(() => {
          const lang2 = window.__lang || 'en';
          el.textContent = lang2 === 'bn' 
            ? 'পশ্চিমবঙ্গ ও ভারতের বিশ্বস্ত সংবাদ উৎস'
            : "West Bengal & India's Trusted News Source";
        }, 5000);
      }
    }, 2000);
  }
  
  // Track category interest via global openArticle wrapper
  trackCategoryInterest();
}

// ── Track category interest from reading history ─────────────
function trackCategoryInterest() {
  // Rebuild interest map from reading history
  const historyIds = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  const interest = {};
  historyIds.forEach(id => {
    const article = allArticles.find(a => a.id === id);
    if (article && article.category) {
      interest[article.category] = (interest[article.category] || 0) + 1;
    }
  });
  localStorage.setItem('nb_interest', JSON.stringify(interest));
}

function reorderByInterest() {
  const $s = document.getElementById('strips');
  if (!$s || currentSection !== 'home') return;
  
  const interest = JSON.parse(localStorage.getItem('nb_interest') || '{}');
  
  // Get sorted categories by interest (most read first)
  const sorted = Object.keys(SECTIONS)
    .sort((a, b) => (interest[b] || 0) - (interest[a] || 0))
    .slice(0, 4); // Top 4 interest categories
  
  // Rearrange the DOM strips
  let prevSibling = $s.firstChild;
  sorted.forEach(cat => {
    const strip = document.getElementById(`strip-${cat}`);
    if (strip && strip !== prevSibling) {
      $s.insertBefore(strip, prevSibling.nextSibling);
      prevSibling = strip;
    }
  });
}

// ── Smart Redirect & Recommendation System ───────────────────
function setupSmartRedirects() {
  // Track last read article for related recommendations
  window.__lastReadArticle = null;
  
  // Redirect to related article after modal close
  const origClose = closeArticle;
  closeArticle = function() {
    const lastId = window.__lastReadArticle;
    origClose();
    if (lastId) {
      const recommended = getRecommendedArticle(lastId);
      if (recommended) {
        // Show recommendation prompt after a short delay
        setTimeout(() => {
          const lang = window.__lang || 'en';
          if (confirm(lang === 'bn' 
            ? `পরবর্তী পড়ুন: ${recommended.title?.slice(0, 60)}?` 
            : `Read next: ${recommended.title?.slice(0, 60)}?`)) {
            window.__openArticle(recommended.id);
          }
        }, 800);
      }
    }
  };
}

function getRecommendedArticle(currentId) {
  const interest = JSON.parse(localStorage.getItem('nb_interest') || '{}');
  const current = allArticles.find(a => a.id === currentId);
  
  if (!current) return null;
  
  // Score articles by relevance
  const scored = allArticles
    .filter(a => a.id !== currentId)
    .map(a => {
      let score = 0;
      // Same category = +10
      if (a.category === current.category) score += 10;
      // Interest category = +5 per read
      score += (interest[a.category] || 0) * 5;
      // Shared tags = +2 per tag
      const sharedTags = (a.tags || []).filter(t => (current.tags || []).includes(t)).length;
      score += sharedTags * 2;
      // Freshness = +1 per hour recency (up to 24)
      const age = Date.now() - (a.timestamp || 0);
      score += Math.max(0, 24 - Math.floor(age / 3600000));
      return { article: a, score };
    })
    .sort((a, b) => b.score - a.score);
  
  return scored.length > 0 ? scored[0].article : null;
}

// ── Reader Persona Badges ─────────────────────────────────────
function setupReaderPersonas() {
  // Calculate and display reader persona
  const badge = calculatePersona();
  if (badge) {
    const container = document.createElement('div');
    container.className = 'reader-badge';
    container.innerHTML = badge;
    
    const masthead = document.querySelector('.masthead__top');
    if (masthead) {
      masthead.appendChild(container);
    }
  }
}

function calculatePersona() {
  const interest = JSON.parse(localStorage.getItem('nb_interest') || '{}');
  const visits = Number(localStorage.getItem('nb_visits') || 0);
  
  if (visits < 2) return null;
  
  const topCat = Object.entries(interest).sort((a, b) => b[1] - a[1])[0];
  if (!topCat) return null;
  
  const [cat, count] = topCat;
  const lang = window.__lang || 'en';
  
  const personas = {
    wb: { en: '🏛️ Bengal Watcher', bn: '🏛️ বাংলা পর্যবেক্ষক' },
    national: { en: '🇮🇳 India Track', bn: '🇮🇳 ভারত ট্র্যাক' },
    politics: { en: '🗳️ Politics Deep Dive', bn: '🗳️ রাজনীতি বিশ্লেষক' },
    crime: { en: '⚖️ Justice Follower', bn: '⚖️ ন্যায় অনুসারী' },
    education: { en: '🎓 Education Enthusiast', bn: '🎓 শিক্ষা উৎসাহী' },
    sports: { en: '🏆 Sports Fanatic', bn: '🏆 খেলাপ্রেমী' },
    weather: { en: '🌤️ Weather Tracker', bn: '🌤️ আবহাওয়া পর্যবেক্ষক' },
    govt: { en: '📋 Scheme Analyst', bn: '📋 প্রকল্প বিশ্লেষক' },
  };
  
  const persona = personas[cat];
  if (!persona) return null;
  
  const label = lang === 'bn' ? persona.bn : persona.en;
  
  return `<span class="reader-badge__text" style="font-size:9px;color:var(--accent);letter-spacing:0.5px;margin-left:8px;">${label} · ${count} reads</span>`;
}

// ── Push Notifications ────────────────────────────────────────
function setupPushNotifications() {
  const banner = document.getElementById('notif-banner');
  const enableBtn = document.getElementById('notif-enable-btn');
  const dismissBtn = document.getElementById('notif-dismiss-btn');
  
  if (!banner || !enableBtn || !dismissBtn) return;
  
  // Check if already denied or granted
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return;
  }
  
  // Show banner if not dismissed before
  if (!localStorage.getItem('nb_notif_dismissed')) {
    setTimeout(() => banner.classList.add('show'), 3000);
  }
  
  enableBtn.addEventListener('click', async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        banner.classList.remove('show');
        localStorage.setItem('nb_notif_dismissed', 'true');
        
        // Send test notification
        new Notification('🔔 NewsBuzz Alerts Enabled', {
          body: 'You will now receive breaking news notifications from West Bengal.',
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📰</text></svg>'
        });
      }
    } catch (e) {
      console.warn('[Notifications] Permission error:', e.message);
    }
  });
  
  dismissBtn.addEventListener('click', () => {
    banner.classList.remove('show');
    localStorage.setItem('nb_notif_dismissed', 'true');
  });
}

// ── Government Page Monitoring ────────────────────────────────
function setupGovtMonitor() {
  // Monitor PIB India press releases
  const GOVT_FEEDS = [
    { name: 'PIB India', url: 'https://pib.gov.in/Rss2.aspx', category: 'govt' },
    { name: 'MyGov India', url: 'https://www.mygov.in/feeds/', category: 'govt' },
    { name: 'DG Shipping', url: 'https://www.dgshipping.gov.in/rss.xml', category: 'national' },
  ];
  
  // Store last check timestamp
  const lastCheck = Number(localStorage.getItem('nb_govt_last_check') || 0);
  
  // Check every 30 minutes
  setInterval(() => {
    checkGovtFeeds(GOVT_FEEDS);
  }, 1800000);
  
  // Also check on init if enough time passed
  if (Date.now() - lastCheck > 1800000) {
    checkGovtFeeds(GOVT_FEEDS);
  }
}

async function checkGovtFeeds(feeds) {
  for (const feed of feeds) {
    try {
      // Use OpenRouter to fetch and parse government updates
      const prompt = `You are a government news monitor for NewsBuzz. 
Today's date: ${new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.
The current year is 2026.

Check if there are any recent official government announcements, schemes, or notices from ${feed.name} relevant to West Bengal and India.

If there is a notable recent government announcement, return a JSON object with the details. Otherwise return null.

Return ONLY valid JSON:
{
  "title": "Official announcement headline",
  "description": "3-4 paragraph detailed notice",
  "descriptionBn": "বাংলায় বিবরণ",
  "titleBn": "বাংলায় শিরোনাম",
  "tags": ["tag1", "tag2"],
  "source": "${feed.name}",
  "category": "${feed.category}",
  "seoTitle": "SEO title",
  "seoDesc": "SEO description",
  "officialUrl": "https://..."
}`;
      
      const { generateArticle } = await import('./openrouter.js');
      // Use generateArticle with govt-specific prompt
      const article = await generateArticle(`Recent ${feed.name} announcement`, feed.category);
      
      if (article && article.title) {
        article.source = feed.name;
        article.timestamp = Date.now();
        article.autoPosted = true;
        article.isOfficialNotice = true;
        article.officialUrl = `https://pib.gov.in`;
        
        const id = await saveArticle(article);
        injectArticle({ ...article, id });
        
        // Show notification for official notice
        sendPushNotification({
          title: `📢 Official: ${article.title}`,
          id: id
        });
      }
      
      localStorage.setItem('nb_govt_last_check', String(Date.now()));
    } catch (e) {
      console.warn('[GovtMonitor] Check failed:', feed.name, e.message);
    }
  }
}

// ── RSS Feed Integration ──────────────────────────────────────
function setupRSSFeeds() {
  const RSS_FEEDS = [
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', category: 'national' },
    { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news', category: 'national' },
    { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/feed/', category: 'national' },
    { name: 'Indian Express', url: 'https://indianexpress.com/feed/', category: 'national' },
    { name: 'Times of India Kolkata', url: 'https://timesofindia.indiatimes.com/rssfeeds/2951478.cms', category: 'wb' },
    { name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', category: 'national' },
  ];
  
  // Store last RSS check
  const lastCheck = Number(localStorage.getItem('nb_rss_last_check') || 0);
  
  // Check every 10 minutes
  setInterval(() => {
    fetchRSSFeeds(RSS_FEEDS);
  }, 600000);
  
  // Check on init if enough time passed
  if (Date.now() - lastCheck > 600000) {
    fetchRSSFeeds(RSS_FEEDS);
  }
}

async function fetchRSSFeeds(feeds) {
  for (const feed of feeds) {
    try {
      // Use OpenRouter to generate news article from RSS topic
      const prompt = `You are a news journalist for NewsBuzz. 
Today is ${new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.
The current year is 2026.

Generate a fresh, realistic news article for the category "${feed.category}" from ${feed.name}.

The article should be about a recent real event in India/West Bengal relevant to ${feed.category}.

Return ONLY valid JSON:
{
  "title": "News headline",
  "titleBn": "বাংলায় শিরোনাম",
  "description": "3-4 paragraph article with specific details, numbers, places, dates (relative to 2026)",
  "descriptionBn": "বাংলায় পূর্ণ বিবরণ",
  "seoTitle": "SEO title under 60 chars",
  "seoDesc": "Meta description under 160 chars",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "imageQuery": "specific image search term",
  "viralScore": 75,
  "category": "${feed.category}",
  "sources": [
    { "name": "${feed.name}", "url": "${feed.url}" }
  ]
}`;
      
      const { generateArticle } = await import('./openrouter.js');
      const article = await generateArticle(`Latest ${feed.category} news from ${feed.name}`, feed.category);
      
      if (article && article.title) {
        article.source = feed.name;
        article.timestamp = Date.now();
        article.autoPosted = true;
        
        const id = await saveArticle(article);
        injectArticle({ ...article, id });
      }
      
      localStorage.setItem('nb_rss_last_check', String(Date.now()));
    } catch (e) {
      console.warn('[RSS] Feed failed:', feed.name, e.message);
    }
  }
}

// ── Weather Alert Push Notifications ─────────────────────────
function checkWeatherAlerts() {
  // Check weather data and send push notification for severe weather
  const weatherCache = localStorage.getItem('nb_weather_cache');
  if (!weatherCache) return;
  
  try {
    const data = JSON.parse(weatherCache);
    const current = data.current_condition?.[0];
    if (!current) return;
    
    const temp = Number(current.temp_C);
    const code = Number(current.weatherCode);
    const wind = Number(current.windspeedKmph);
    
    let alertMsg = null;
    let alertType = '';
    
    if (temp > 40) {
      alertMsg = `🌡️ Extreme Heat Alert: Kolkata at ${temp}°C. Stay hydrated and avoid going out during peak hours.`;
      alertType = 'heat';
    } else if (temp < 8) {
      alertMsg = `❄️ Cold Wave Alert: Kolkata at ${temp}°C. Keep warm and check on elderly neighbors.`;
      alertType = 'cold';
    } else if (code >= 200 && code < 300) {
      alertMsg = '⛈️ Thunderstorm Alert: Severe thunderstorms expected in Kolkata. Stay indoors and avoid open areas.';
      alertType = 'storm';
    } else if (code >= 500 && code < 600) {
      alertMsg = '🌧️ Heavy Rain Alert: Heavy rainfall expected in Kolkata. Watch for waterlogging and traffic delays.';
      alertType = 'rain';
    } else if (wind > 60) {
      alertMsg = `💨 Strong Wind Alert: Kolkata winds at ${wind} km/h. Secure loose objects and be cautious traveling.`;
      alertType = 'wind';
    } else if (code >= 700 && code < 800) {
      alertMsg = '🌫️ Fog Alert: Reduced visibility in Kolkata. Drive carefully with headlights on low beam.';
      alertType = 'fog';
    }
    
    if (alertMsg && Notification.permission === 'granted') {
      const lastWeatherAlert = Number(localStorage.getItem('nb_weather_alert_time') || 0);
      // Don't repeat same alert type within 3 hours
      const alertKey = `nb_weather_alert_${alertType}`;
      const lastTypeAlert = Number(localStorage.getItem(alertKey) || 0);
      
      if (Date.now() - lastTypeAlert > 10800000) { // 3 hours
        new Notification('🌤️ NewsBuzz Weather Alert', {
          body: alertMsg,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌤️</text></svg>',
          tag: `weather-${alertType}-${Date.now()}`,
        });
        localStorage.setItem(alertKey, String(Date.now()));
        localStorage.setItem('nb_weather_alert_time', String(Date.now()));
      }
    }
  } catch (e) {
    // Silent fail
  }
}

function sendPushNotification(article) {
  if (Notification.permission !== 'granted') return;
  
  // Don't notify if user hasn't interacted recently
  const lastNotif = Number(localStorage.getItem('nb_last_notif') || 0);
  if (Date.now() - lastNotif < 120000) return; // Min 2 min between notifications
  
  try {
    const lang = window.__lang || 'en';
    const title = (lang === 'bn' && article.titleBn) ? article.titleBn : (article.title || 'Breaking News');
    
    new Notification('📰 NewsBuzz Breaking', {
      body: title.length > 100 ? title.slice(0, 100) + '…' : title,
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📰</text></svg>',
      tag: article.id,
    });
    
    localStorage.setItem('nb_last_notif', String(Date.now()));
  } catch (e) {
    console.warn('[Notification] Error:', e.message);
  }
}

// ── Weather Widget with 10-Day Forecast ──────────────────────
function setupWeatherWidget() {
  const widget = document.getElementById('weather-widget');
  if (!widget) return;
  
  // Use wttr.in for weather data (free, no API key needed)
  fetch('https://wttr.in/Kolkata?format=j1')
    .then(res => res.json())
    .then(data => {
      const current = data.current_condition?.[0];
      const forecast = data.weather || [];
      if (!current) {
        widget.style.display = 'none';
        return;
      }
      
      // Today's conditions
      document.getElementById('weather-temp').textContent = `${current.temp_C}°C`;
      document.getElementById('weather-desc').textContent = current.weatherDesc?.[0]?.value || 'Clear';
      document.getElementById('weather-city').textContent = 'Kolkata, India';
      
      // Wind speed & humidity
      const windEl = document.getElementById('weather-wind');
      if (windEl) windEl.textContent = `${current.windspeedKmph || 0} km/h`;
      const humidEl = document.getElementById('weather-humidity');
      if (humidEl) humidEl.textContent = `${current.humidity || 0}%`;
      
      // Set icon based on conditions
      const code = Number(current.weatherCode);
      let icon = '☀️';
      if (code >= 200 && code < 300) icon = '⛈️';
      else if (code >= 300 && code < 400) icon = '🌦️';
      else if (code >= 500 && code < 600) icon = '🌧️';
      else if (code >= 600 && code < 700) icon = '❄️';
      else if (code >= 700 && code < 800) icon = '🌫️';
      else if (code === 800) icon = '☀️';
      else if (code > 800) icon = '☁️';
      document.getElementById('weather-icon').textContent = icon;
      
      // 10-day forecast with click interactions
      const forecastEl = document.getElementById('weather-forecast');
      if (forecastEl && forecast.length) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const lang = window.__lang || 'en';
        
        forecastEl.innerHTML = forecast.slice(0, 10).map((day, i) => {
          const date = new Date(day.date);
          const dayName = i === 0 
            ? (lang === 'bn' ? 'আজ' : 'Today')
            : i === 1 
              ? (lang === 'bn' ? 'আগামীকাল' : 'Tomorrow')
              : days[date.getDay()];
          const maxTemp = day.maxtempC || '--';
          const minTemp = day.mintempC || '--';
          const dayCode = Number(day.hourly?.[0]?.weatherCode || 113);
          const sunrise = day.astronomy?.[0]?.sunrise || '--';
          const sunset = day.astronomy?.[0]?.sunset || '--';
          const uvIndex = day.hourly?.[0]?.uvIndex || 0;
          let dayIcon = '☀️';
          if (dayCode >= 200 && dayCode < 300) dayIcon = '⛈️';
          else if (dayCode >= 300 && dayCode < 500) dayIcon = '🌧️';
          else if (dayCode >= 500 && dayCode < 700) dayIcon = '🌧️';
          else if (dayCode === 800 || dayCode === 113) dayIcon = '☀️';
          else if (dayCode > 800) dayIcon = '☁️';
          
          const dateStr = date.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
          
          return `
            <div class="forecast-day" onclick="window.__showWeatherDetail('${dateStr}', '${dayName}', '${maxTemp}°C', '${minTemp}°C', '${dayIcon}', '${sunrise}', '${sunset}', '${uvIndex}')" title="${lang === 'bn' ? 'বিস্তারিত দেখুন' : 'Click for details'}">
              <span class="forecast-day__name">${dayName}</span>
              <span class="forecast-day__icon">${dayIcon}</span>
              <span class="forecast-day__temps">
                <span class="forecast-day__high">${maxTemp}°</span>
                <span class="forecast-day__low">${minTemp}°</span>
              </span>
            </div>`;
        }).join('');
      }
      
      widget.style.display = 'block';
      
      // Cache weather data for alert checks
      localStorage.setItem('nb_weather_cache', JSON.stringify(data));
      
      // Check for severe weather alerts
      setTimeout(checkWeatherAlerts, 2000);
    })
    .catch(() => {
      widget.style.display = 'none';
    });
    
  // Also check weather alerts on a timer (every 30 min)
  setInterval(() => {
    fetch('https://wttr.in/Kolkata?format=j1')
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('nb_weather_cache', JSON.stringify(data));
        checkWeatherAlerts();
      })
      .catch(() => {});
  }, 1800000);
}

// ── Trending Chips ────────────────────────────────────────────
function setupTrendingChips() {
  const $chips = document.getElementById('trending-chips');
  if (!$chips) return;
  
  // Collect all unique tags from trending articles
  const trending = [...allArticles]
    .sort((a, b) => (b.viralScore || 0) - (a.viralScore || 0))
    .slice(0, 15);
  
  const tagCount = new Map();
  trending.forEach(a => {
    (a.tags || []).forEach(t => {
      tagCount.set(t, (tagCount.get(t) || 0) + 1);
    });
  });
  
  // Pick top 8 tags
  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  
  if (!topTags.length) {
    // Fallback default topics
    const defaults = [
      { tag: '#Kolkata', count: 5 },
      { tag: '#WestBengal', count: 4 },
      { tag: '#Politics', count: 3 },
      { tag: '#Weather', count: 3 },
      { tag: '#Education', count: 2 },
      { tag: '#Sports', count: 2 },
      { tag: '#Crime', count: 2 },
      { tag: '#GovtSchemes', count: 2 }
    ];
    $chips.innerHTML = defaults.map(d => 
      `<span class="trending-chip" onclick="window.__searchTag('${d.tag.replace('#', '')}')">${d.tag} <span class="trending-chip__count">${d.count}</span></span>`
    ).join('');
    return;
  }
  
  $chips.innerHTML = topTags.map(([tag, count]) => 
    `<span class="trending-chip" onclick="window.__searchTag('${tag}')">#${tag} <span class="trending-chip__count">${count}</span></span>`
  ).join('');
}

// ── Survey Banner (shown to all readers when active) ────────────
function showSurveyBanner() {
  const survey = JSON.parse(localStorage.getItem('nb_survey') || '{}');
  if (!survey.active || !survey.question) return;
  
  // Check if user already voted
  if (localStorage.getItem('nb_survey_voted')) return;
  
  // Remove existing banner if any
  const existing = document.getElementById('survey-banner');
  if (existing) existing.remove();
  
  const banner = document.createElement('div');
  banner.id = 'survey-banner';
  banner.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;z-index:1000;
    background:linear-gradient(135deg, var(--accent), var(--accent-dk));
    color:#fff;padding:16px 20px;font-family:var(--font-body);
    box-shadow:0 -4px 20px rgba(0,0,0,0.3);
    animation:fadeInUp 0.4s ease;
  `;
  
  banner.innerHTML = `
    <div style="max-width:740px;margin:0 auto;">
      <div style="font-size:13px;font-weight:bold;margin-bottom:8px;">📊 ${survey.question}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${survey.options.map(opt => `
          <button class="survey-opt-btn" data-opt="${opt}" style="
            background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);
            color:#fff;padding:6px 14px;font-size:12px;cursor:pointer;
            font-family:var(--font-body);transition:all 0.2s;
            border-radius:2px;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
            ${opt}
          </button>
        `).join('')}
        <button class="survey-dismiss-btn" style="
          background:transparent;border:none;color:rgba(255,255,255,0.6);
          font-size:18px;cursor:pointer;padding:4px 8px;line-height:1;
        " title="Dismiss">✕</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(banner);
  
  // Handle option clicks
  banner.querySelectorAll('.survey-opt-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const opt = this.dataset.opt;
      const responses = JSON.parse(localStorage.getItem('nb_survey_responses') || '[]');
      responses.push(opt);
      localStorage.setItem('nb_survey_responses', JSON.stringify(responses));
      localStorage.setItem('nb_survey_voted', 'true');
      
      // Show thank you
      banner.innerHTML = `
        <div style="max-width:740px;margin:0 auto;text-align:center;">
          <div style="font-size:14px;">✅ Thanks for your feedback!</div>
          <div style="font-size:11px;opacity:0.8;margin-top:4px;">"${opt}" — great choice!</div>
        </div>
      `;
      setTimeout(() => { banner.remove(); }, 3000);
    });
  });
  
  // Handle dismiss
  const dismissBtn = banner.querySelector('.survey-dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      localStorage.setItem('nb_survey_voted', 'true');
      banner.remove();
    });
  }
}

// ── SEO Initialization ────────────────────────────────────────
function initSEO() {
  // Update canonical URL based on language
  const lang = window.__lang || 'en';
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    const url = lang === 'bn' ? 'https://newsbuzz.in/?lang=bn' : 'https://newsbuzz.in/';
    canonical.setAttribute('href', url);
  }
}

function updateArticleSEO(a) {
  // Update JSON-LD article schema
  const ldArticle = document.getElementById('ld-article');
  if (ldArticle && a) {
    const lang = window.__lang || 'en';
    const title = (lang === 'bn' && a.titleBn) ? a.titleBn : a.title;
    const desc = (lang === 'bn' && a.descriptionBn) ? a.descriptionBn : (a.description || '');
    const descSnip = desc.slice(0, 155);
    
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `https://newsbuzz.in/?article=${a.id}`
      },
      'headline': title,
      'description': descSnip,
      'image': getArticleImage(a),
      'datePublished': new Date(a.timestamp).toISOString(),
      'dateModified': new Date(a.timestamp).toISOString(),
      'author': {
        '@type': 'Organization',
        'name': 'NewsBuzz'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'NewsBuzz',
        'url': 'https://newsbuzz.in'
      },
      'inLanguage': lang === 'bn' ? 'bn-IN' : 'en-IN',
      'articleSection': catLabel(a.category),
      'keywords': (a.tags || []).join(', ')
    };
    ldArticle.textContent = JSON.stringify(articleSchema);
  }
  
  // Update breadcrumb for article
  updateBreadcrumbsForArticle(a);
}

function updateBreadcrumbsForArticle(a) {
  const ldBC = document.getElementById('ld-breadcrumb');
  if (!ldBC || !a) return;
  
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': 'https://newsbuzz.in/'
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': catLabel(a.category),
        'item': `https://newsbuzz.in/${a.category}`
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': (a.title || '').slice(0, 60),
        'item': `https://newsbuzz.in/?article=${a.id}`
      }
    ]
  };
  ldBC.textContent = JSON.stringify(breadcrumbSchema);
}

function updateBreadcrumbs(section) {
  const ldBC = document.getElementById('ld-breadcrumb');
  if (!ldBC) return;
  
  let items = [
    { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://newsbuzz.in/' }
  ];
  
  if (section !== 'home' && section !== 'bookmarks' && SECTIONS[section]) {
    items.push({
      '@type': 'ListItem',
      'position': 2,
      'name': catLabel(section),
      'item': `https://newsbuzz.in/${section}`
    });
  } else if (section === 'bookmarks') {
    items.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'Saved Articles',
      'item': 'https://newsbuzz.in/bookmarks'
    });
  }
  
  ldBC.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items
  });
}

// ── Search by tag ─────────────────────────────────────────────
export function searchTag(tag) {
  const input = document.getElementById('search-input');
  if (input) {
    input.value = tag;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  }
}

// ── Toggle bookmark from card ─────────────────────────────────
export function toggleCardBookmark(id, btn) {
  const now = toggleBookmark(id);
  if (btn) {
    btn.textContent = now ? '⭐' : '☆';
    btn.classList.toggle('bookmarked', now);
  }
  
  // If bookmarks page is open, re-render
  if (currentSection === 'bookmarks') {
    renderBookmarksPage();
  }
}

// ── A/B Test Frontend Tracking ───────────────────────────────
function initABTestTracking() {
  // Checks for active A/B test and handles variant assignment + tracking
  const abTest = JSON.parse(localStorage.getItem('nb_active_abtest') || 'null');
  if (!abTest) return;
  
  // If test ID changed, reset variant for new test
  const storedTestId = localStorage.getItem('nb_ab_test_id');
  if (storedTestId !== abTest.testId) {
    localStorage.removeItem('nb_ab_variant');
    localStorage.setItem('nb_ab_test_id', abTest.testId);
  }
  
  // Prevent impression double-counting
  const impressionKey = `nb_ab_impression_${abTest.testId}`;
  if (localStorage.getItem(impressionKey)) return; // Already counted
  
  // Determine which variant this visitor gets (50/50 split based on localStorage persistence)
  let variant = localStorage.getItem('nb_ab_variant');
  if (!variant) {
    variant = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem('nb_ab_variant', variant);
  }
  
  // Mark impression as counted
  localStorage.setItem(impressionKey, 'true');
  
  // If variant is B, swap the article's headline in the allArticles array
  if (variant === 'B') {
    const testArticle = allArticles.find(a => a.id === abTest.articleId);
    if (testArticle) {
      // Store original title to restore later
      if (!testArticle._originalTitle) {
        testArticle._originalTitle = testArticle.title;
      }
      testArticle.title = abTest.headlineB;
    }
  }
  
  // Track impression per variant (runs once per test per visitor)
  const tests = JSON.parse(localStorage.getItem('nb_abtests') || '{}');
  if (tests[abTest.testId]) {
    if (variant === 'B') {
      tests[abTest.testId].impressionsB = (tests[abTest.testId].impressionsB || 0) + 1;
    } else {
      tests[abTest.testId].impressionsA = (tests[abTest.testId].impressionsA || 0) + 1;
    }
    localStorage.setItem('nb_abtests', JSON.stringify(tests));
  }
}

// ── Track A/B test click when article opened ─────────────────
function trackABTestClick(articleId) {
  const abTest = JSON.parse(localStorage.getItem('nb_active_abtest') || 'null');
  if (!abTest || abTest.articleId !== articleId) return;
  
  const variant = localStorage.getItem('nb_ab_variant') || 'A';
  const tests = JSON.parse(localStorage.getItem('nb_abtests') || '{}');
  
  if (tests[abTest.testId]) {
    if (variant === 'B') {
      tests[abTest.testId].clicksB = (tests[abTest.testId].clicksB || 0) + 1;
    } else {
      tests[abTest.testId].clicksA = (tests[abTest.testId].clicksA || 0) + 1;
    }
    localStorage.setItem('nb_abtests', JSON.stringify(tests));
  }
}

// ── Expose to window (called from inline onclick) ─────────────
// ── Weather Detail Popup ─────────────────────────────────────
window.__showWeatherDetail = function(dateStr, dayName, high, low, icon, sunrise, sunset, uvIndex) {
  const lang = window.__lang || 'en';
  const title = lang === 'bn' 
    ? `${dayName} (${dateStr}) - আবহাওয়ার বিবরণ`
    : `${dayName} (${dateStr}) - Weather Details`;
  const sunriseLabel = lang === 'bn' ? 'সূর্যোদয়' : 'Sunrise';
  const sunsetLabel = lang === 'bn' ? 'সূর্যাস্ত' : 'Sunset';
  const uvLabel = lang === 'bn' ? 'UV সূচক' : 'UV Index';
  const highLabel = lang === 'bn' ? 'সর্বোচ্চ' : 'High';
  const lowLabel = lang === 'bn' ? 'সর্বনিম্ন' : 'Low';
  const msg = `${title}\n\n${icon} ${highLabel}: ${high}\n${icon} ${lowLabel}: ${low}\n🌅 ${sunriseLabel}: ${sunrise}\n🌇 ${sunsetLabel}: ${sunset}\n☀️ ${uvLabel}: ${uvIndex}`;
  alert(msg);
};

window.__openArticle = openArticle;
window.__showSection = showSection;
window.__searchTag = searchTag;
window.__toggleCardBookmark = toggleCardBookmark;

// ── Sample fallback data ─────────────────────────────────────
function getSampleArticles() {
  const now = Date.now();
  return [
    { id:'s1', category:'wb', title:'Kolkata Metro Expands: 3 New Stations Open This Month', titleBn:'কলকাতা মেট্রো সম্প্রসারণ: এই মাসে ৩টি নতুন স্টেশন খুলছে', description:'The Kolkata Metro Rail Corporation confirmed that three new stations — Joka, Majerhat and Taratala — will be inaugurated this month, significantly improving connectivity for over two lakh daily commuters in the southern suburbs.\n\nThe expansion is part of a ₹8,500 crore project that has been in the works for six years. Chief Minister Mamata Banerjee is expected to attend the inauguration ceremony.\n\nResidents of Behala and surrounding areas have welcomed the news, saying it will drastically reduce travel time to the city centre during peak hours.', descriptionBn:'কলকাতা মেট্রো রেল কর্পোরেশন নিশ্চিত করেছে যে এই মাসে তিনটি নতুন স্টেশন - জোকা, মাঝেরহাট এবং তারাতলা - উদ্বোধন করা হবে, যা দক্ষিণ শহরতলির দুই লক্ষেরও বেশি দৈনিক যাত্রীদের জন্য সংযোগের উল্লেখযোগ্য উন্নতি ঘটাবে।\n\nএই সম্প্রসারণটি ৮,৫০০ কোটি টাকার প্রকল্পের অংশ যা ছয় বছর ধরে কাজ চলছে। উদ্বোধনী অনুষ্ঠানে মুখ্যমন্ত্রী মমতা বন্দ্যোপাধ্যায় উপস্থিত থাকবেন বলে আশা করা হচ্ছে।\n\nবেহালা ও পার্শ্ববর্তী এলাকার বাসিন্দারা এই খবরকে স্বাগত জানিয়েছেন এবং বলেছেন যে এটি ব্যস্ত সময়ে শহরের কেন্দ্রে যাতায়াতের সময় অনেকাংশে কমিয়ে দেবে।', image:'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800', tags:['Kolkata Metro','West Bengal transport','metro expansion','Kolkata news'], seoTitle:'Kolkata Metro 3 New Stations Open — NewsBuzz', seoDesc:'Kolkata Metro inaugurates 3 new stations connecting southern suburbs, benefiting 2 lakh daily commuters.', viralScore:82, source:'PTI', timestamp:now - 1800000 },
    { id:'s2', category:'national', title:'Parliament Passes Landmark Infrastructure Bill Worth ₹12 Lakh Crore', titleBn:'সংসদে পাস হলো ১২ লক্ষ কোটি টাকার ঐতিহাসিক পরিকাঠামো বিল', description:'Both houses of Parliament on Thursday passed the National Infrastructure Development Act, allocating ₹12 lakh crore over the next decade for roads, railways, ports and digital connectivity.\n\nThe bill received bipartisan support with 312 votes in favour. Finance Minister Nirmala Sitharaman called it the "most ambitious infrastructure programme since Independence."\n\nThe allocation includes ₹4.2 lakh crore for National Highways, ₹3.1 lakh crore for Railways, and ₹2.8 lakh crore for broadband connectivity in rural India.', descriptionBn:'সংসদের উভয় কক্ষ বৃহস্পতিবার জাতীয় পরিকাঠামো উন্নয়ন আইন পাস করেছে, যার মাধ্যমে রাস্তা, রেলপথ, বন্দর এবং ডিজিটাল সংযোগের জন্য আগামী দশকে ১২ লক্ষ কোটি টাকা বরাদ্দ করা হয়েছে।\n\nবিলটি ৩১২টি ভোটের সমর্থনে দ্বিপক্ষীয় সমর্থন পেয়েছে। অর্থমন্ত্রী নির্মলা সীতারামন এটিকে "স্বাধীনতার পর সবচেয়ে উচ্চাভিলাষী পরিকাঠামো কর্মসূচি" বলে অভিহিত করেছেন।\n\nবরাদ্দকৃত অর্থের মধ্যে রয়েছে জাতীয় সড়কগুলির জন্য ৪.২ লক্ষ কোটি টাকা, রেলওয়ের জন্য ৩.১ লক্ষ কোটি টাকা এবং গ্রামীণ ভারতে ব্রডব্যান্ড সংযোগের জন্য ২.৮ লক্ষ কোটি টাকা।', image:'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800', tags:['India Parliament','infrastructure bill','Modi government','Indian economy'], seoTitle:'India ₹12 Lakh Crore Infrastructure Bill Passed', seoDesc:'Parliament passes historic infrastructure development act worth ₹12 lakh crore for roads, rail and digital India.', viralScore:76, source:'ANI', timestamp:now - 3600000 },
    { id:'s3', category:'govt', title:'PM Awas Yojana: 10 Lakh Bengal Families Get Pucca Homes', titleBn:'প্রধানমন্ত্রী আবাস যোজনা: বাংলার ১০ লক্ষ পরিবার পেল পাকা বাড়ি', description:'The West Bengal government confirmed that over 10 lakh families across the state have received pucca houses under the Pradhan Mantri Awas Yojana (PMAY) scheme, with construction of another 3.2 lakh homes currently underway.\n\nDistricts including Murshidabad, Malda and South 24 Parganas have seen the highest beneficiary counts. Each beneficiary receives ₹1.2 lakh for rural construction.\n\nState Housing Minister Firhad Hakim said the government aims to complete all pending applications by December 2026.', descriptionBn:'পশ্চিমবঙ্গ সরকার নিশ্চিত করেছে যে রাজ্যের ১০ লক্ষেরও বেশি পরিবার প্রধানমন্ত্রী আবাস যোজনা (PMAY) প্রকল্পের অধীনে পাকা বাড়ি পেয়েছে এবং আরও ৩.২ লক্ষ বাড়ি তৈরির কাজ চলছে।\n\nমুর্শিদাবাদ, মালদা এবং দক্ষিণ ২৪ পরগনা সহ জেলাগুলিতে সবচেয়ে বেশি সুবিধাভোগী দেখা গেছে। গ্রামীণ এলাকায় বাড়ি নির্মাণের জন্য প্রতিটি সুবিধাভোগী ১.২ লক্ষ টাকা করে পান।\n\nরাজ্যের আবাসন মন্ত্রী ফিরহাদ হাকিম বলেছেন, ২০২৬ সালের ডিসেম্বরের মধ্যে সমস্ত অমীমাংসিত আবেদন সম্পন্ন করার লক্ষ্য রয়েছে সরকারের।', image:'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800', tags:['PM Awas Yojana','West Bengal housing','PMAY','government scheme Bengal'], seoTitle:'10 Lakh Bengal Families Get Homes Under PMAY', seoDesc:'West Bengal confirms 10 lakh families received homes under PM Awas Yojana. 3.2 lakh more under construction.', viralScore:88, source:'PIB', timestamp:now - 7200000 },
    { id:'s4', category:'politics', title:'TMC-BJP War of Words Intensifies Ahead of Panchayat Polls', titleBn:'পঞ্চায়েত নির্বাচনের আগে তৃণমূল-বিজেপি বাকযুদ্ধ তীব্রতর', description:'Political tensions in West Bengal escalated sharply on Friday as TMC and BJP traded accusations over alleged booth capture preparations ahead of the upcoming rural panchayat elections.\n\nTMC national general secretary Abhishek Banerjee accused the BJP of "importing goons from UP and Bihar" while BJP state president Sukanta Majumdar alleged that TMC was "building an army of criminals."\n\nElection Commission officials held an emergency meeting and announced deployment of central forces across 12 sensitive districts.', descriptionBn:'আসন্ন গ্রামীণ পঞ্চায়েত নির্বাচনের আগে বুথ দখল প্রস্তুতির অভিযোগে তৃণমূল ও বিজেপি একে অপরের বিরুদ্ধে অভিযোগ আদান-প্রদান করায় শুক্রবার পশ্চিমবঙ্গে রাজনৈতিক উত্তেজনা তীব্র আকার ধারণ করেছে।\n\nতৃণমূলের জাতীয় সাধারণ সম্পাদক অভিষেক বন্দ্যোপাধ্যায় বিজেপির বিরুদ্ধে "ইউপি এবং বিহার থেকে গুন্ডা আমদানির" অভিযোগ তুলেছেন, যখন বিজেপির রাজ্য সভাপতি সুকান্ত মজুমদার অভিযোগ করেছেন যে তৃণমূল "অপরাধীদের বাহিনী তৈরি করছে।"\n\nনির্বাচন কমিশনের কর্মকর্তারা একটি জরুরি বৈঠক করেছেন এবং ১২টি সংবেদনশীল জেলায় কেন্দ্রীয় বাহিনী মোতায়েন করার ঘোষণা দিয়েছেন।', image:'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', tags:['West Bengal politics','TMC BJP','panchayat election','Bengal election news'], seoTitle:'TMC BJP Clash Ahead of Bengal Panchayat Polls', seoDesc:'Political tension rises in West Bengal as TMC and BJP clash ahead of panchayat elections. EC deploys central forces.', viralScore:91, source:'Self', timestamp:now - 10800000 },
    { id:'s5', category:'crime', title:'CBI Arrests 5 in ₹200 Crore Ration Scam; More Arrests Expected', titleBn:'২০০ কোটি টাকার রেশনের দুর্নীতি মামলায় ৫ জনকে গ্রেপ্তার করল সিবিআই', description:'The Central Bureau of Investigation on Thursday arrested five individuals, including two former state government officials, in connection with the ₹200 crore ration distribution scam that rocked West Bengal last year.\n\nThe arrested include Tapan Das (former District Supply Officer, Birbhum), Ratan Mondal (rice mill owner) and three alleged middlemen. CBI sources said more arrests are imminent as the chargesheet names 23 individuals.\n\nThe scam involved systematic diversion of PDS rice and wheat meant for BPL families over a period of four years.', descriptionBn:'গত বছর পশ্চিমবঙ্গকে কাঁপিয়ে দেওয়া ২০০ কোটি টাকার রেশন বণ্টন কেলেঙ্কারির ঘটনায় বৃহস্পতিবার কেন্দ্রীয় তদন্ত ব্যুরো (সিবিআই) দুই প্রাক্তন রাজ্য সরকারি কর্মকর্তাসহ পাঁচজনকে গ্রেপ্তার করেছে।\n\nগ্রেপ্তারকৃতদের মধ্যে রয়েছেন তপন দাস (বীরভূমের প্রাক্তন জেলা সরবরাহ কর্মকর্তা), রতন মন্ডল (রাইস মিলের মালিক) এবং তিন মধ্যস্থতাকারী। সিবিআই সূত্র জানিয়েছে যে চার্জশিটে ২৩ জনের নাম থাকায় আরও গ্রেপ্তার আসন্ন।\n\nএই কেলেঙ্কারিতে চার বছর ধরে বিপিএল পরিবারের জন্য নির্ধারিত পিডিএস চাল ও গম পরিকল্পিতভাবে সরিয়ে নেওয়া জড়িত ছিল।', image:'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800', tags:['CBI arrest Bengal','ration scam West Bengal','Bengal corruption','PDS scam'], seoTitle:'CBI Arrests 5 in ₹200 Crore Bengal Ration Scam', seoDesc:'CBI arrests 5 including ex-officials in West Bengal ₹200 crore ration scam. More arrests likely.', viralScore:87, source:'PTI', timestamp:now - 14400000 },
    { id:'s6', category:'education', title:'WBCHSE Results: Record 91.2% Girls Pass Rate in Higher Secondary', titleBn:'উচ্চ মাধ্যমিকে রেকর্ড গড়ে ছাত্রীদের পাশের হার ৯১.২%', description:'The West Bengal Council of Higher Secondary Education (WBCHSE) declared results for Class 12 examinations, recording an overall pass rate of 89.3% — the highest in five years.\n\nGirls outperformed boys significantly, with a 91.2% pass rate compared to 87.1% for boys. The Hooghly district recorded the highest pass percentage among all districts at 93.4%.\n\nBoard president Chiranjib Bhattacharya announced that topper lists will be released tomorrow and all results are available on the official website wbresults.nic.in.', descriptionBn:'পশ্চিমবঙ্গ উচ্চ মাধ্যমিক শিক্ষা সংসদ (WBCHSE) দ্বাদশ শ্রেণীর পরীক্ষার ফলাফল ঘোষণা করেছে, যা গত পাঁচ বছরে সর্বোচ্চ পাশের হার ৮৯.৩% রেকর্ড করেছে।\n\nছাত্রীরা ছাত্রদের তুলনায় উল্লেখযোগ্যভাবে ভালো ফল করেছে, যেখানে ছাত্রদের ৮৭.১% এর তুলনায় ছাত্রীদের পাশের হার ৯১.২%। হুগলি জেলা সমস্ত জেলার মধ্যে সর্বোচ্চ ৯৩.৪% পাশের হার রেকর্ড করেছে।\n\nসংসদের সভাপতি চিরঞ্জীব ভট্টাচার্য ঘোষণা করেছেন যে আগামীকাল মেধা তালিকা প্রকাশ করা হবে এবং সমস্ত ফলাফল অফিসিয়াল ওয়েবসাইট wbresults.nic.in এ পাওয়া যাচ্ছে।', image:'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800', tags:['WBCHSE result','West Bengal board result','class 12 result Bengal','HS result'], seoTitle:'WBCHSE HS Result 2026 — 89.3% Pass, Girls Lead', seoDesc:'WBCHSE Class 12 result 2026 declared. 89.3% pass rate. Girls lead at 91.2%. Check results at wbresults.nic.in.', viralScore:95, source:'WBCHSE', timestamp:now - 18000000 },
    { id:'s7', category:'sports', title:'East Bengal FC Signs Brazilian Striker Ahead of ISL Season', titleBn:'আইএসএল মরশুমের আগে ব্রাজিলিয়ান স্ট্রাইকার সই করাল ইস্টবেঙ্গল এফসি', description:'East Bengal FC completed the signing of Brazilian forward Clayson Henrique on a two-year deal, marking the club\'s most high-profile overseas acquisition in recent memory.\n\nThe 29-year-old, who played for Corinthians in the Brazilian Serie A, will bring pace and finishing ability to an East Bengal attack that struggled last ISL season.\n\nClub president Debabrata Sarkar said: "Clayson is a world-class addition. We are building a team that will challenge for the ISL title this season." The player is expected to arrive in Kolkata next week.', descriptionBn:'ইস্টবেঙ্গল এফসি ব্রাজিলিয়ান ফরোয়ার্ড ক্লেয়সন হেনরিকের সাথে দুই বছরের চুক্তি স্বাক্ষর সম্পন্ন করেছে, যা সাম্প্রতিক স্মৃতিতে ক্লাবের সবচেয়ে হাই-প্রোফাইল বিদেশী খেলোয়াড় অর্জন।\n\n২৯ বছর বয়সী এই খেলোয়াড়, যিনি ব্রাজিলের সেরি এ-তে করিন্থিয়ান্সের হয়ে খেলেছিলেন, ইস্টবেঙ্গল আক্রমণে গতি এবং ফিনিশিং দক্ষতা আনবেন যা গত আইএসএল মরশুমে লড়াই করতে হয়েছিল।\n\nক্লাবের সভাপতি দেবব্রত সরকার বলেছেন: "ক্লেয়সন একটি বিশ্বমানের সংযোজন। আমরা এমন একটি দল তৈরি করছি যা এই মরশুমে আইএসএল শিরোপার জন্য লড়বে।" খেলোয়াড়টি আগামী সপ্তাহে কলকাতায় পৌঁছাবেন বলে আশা করা হচ্ছে।', image:'https://images.unsplash.com/photo-1589987607627-616cca7bfaaa?w=800', tags:['East Bengal FC','ISL','East Bengal signing','Indian Super League'], seoTitle:'East Bengal Signs Brazilian Striker for ISL 2026', seoDesc:'East Bengal FC signs Brazilian forward Clayson Henrique ahead of ISL 2026-27 season.', viralScore:79, source:'Self', timestamp:now - 21600000 },
    { id:'s8', category:'weather', title:'IMD Issues Red Alert: Heavy Rain to Lash South Bengal for 3 Days', titleBn:'আলিপুর আবহাওয়া দপ্তরের লাল সতর্কতা: দক্ষিণবঙ্গে ৩ দিন ভারী বৃষ্টি', description:'The India Meteorological Department issued a red alert on Friday for eight South Bengal districts, warning of extremely heavy rainfall over the next 72 hours due to a deep depression in the Bay of Bengal.\n\nDistricts under red alert include South 24 Parganas, North 24 Parganas, Howrah, Hooghly, East Medinipur, West Medinipur, Jhargram and Kolkata. The IMD warned of flooding in low-lying areas and strong winds up to 60 kmph.\n\nNDRF teams have been pre-positioned across the affected districts. Residents are advised to remain indoors and avoid coastal and riverside areas.', descriptionBn:'ভারত আবহাওয়া অধিদপ্তর শুক্রবার দক্ষিণবঙ্গের আটটি জেলার জন্য লাল সতর্কতা জারি করেছে এবং বঙ্গোপসাগরে গভীর নিম্নচাপের কারণে আগামী ৭২ ঘণ্টায় অত্যন্ত ভারী বৃষ্টিপাতের সতর্কতা জানিয়েছে।\n\nলাল সতর্কতার অধীনে থাকা জেলাগুলির মধ্যে রয়েছে দক্ষিণ ২৪ পরগনা, উত্তর ২৪ পরগনা, হাওড়া, হুগলি, পূর্ব মেদিনীপুর, পশ্চিম মেদিনীপুর, ঝাড়গ্রাম এবং কলকাতা। আইএমডি নিচু এলাকায় বন্যা এবং ৬০ কিমি প্রতি ঘণ্টা বেগে ঝোড়ো হাওয়ার সতর্কতা দিয়েছে।\n\nআক্রান্ত জেলাগুলিতে এনডিআরএফ দলগুলি মোতায়েন করা হয়েছে। বাসিন্দাদের বাড়ির ভেতরে থাকার এবং উপকূলীয় ও নদী তীরবর্তী এলাকা এড়িয়ে চলার পরামর্শ দেওয়া হয়েছে।', image:'https://images.unsplash.com/photo-1504608524841-42584120d832?w=800', tags:['Bengal rain alert','IMD red alert West Bengal','South Bengal flood','cyclone Bengal'], seoTitle:'IMD Red Alert: Heavy Rain in South Bengal 3 Days', seoDesc:'IMD issues red alert for 8 South Bengal districts. Heavy rain, flooding expected for 72 hours. NDRF deployed.', viralScore:93, source:'IMD', timestamp:now - 25200000 },
  ];
}
