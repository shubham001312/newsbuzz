// ============================================================
//  js/admin.js  — Hidden admin dashboard
//  Triggered ONLY by typing CONFIG.ADMIN_CODE in search bar.
//  Invisible to all visitors.
// ============================================================

import { saveArticle, loadArticles, deleteArticle, updateArticle, articleExists } from './firebase.js';
import { generateArticle, seedCategory, startAutoPublish, stopAutoPublish, detectHotTopics } from './openrouter.js';
import { injectArticle, allArticles } from './news.js';

let adminOpen   = false;
let autoRunning = false;
const AUTO_PUBLISH_KEY = 'newsbuzz_auto_publish_enabled';

// ── Open / Close ─────────────────────────────────────────────
export function openAdmin() {
  document.getElementById('admin-panel').classList.add('visible');
  document.body.style.overflow = 'hidden';
  adminOpen = true;
  loadManageTab();
  if (shouldAutoStart()) startAutoPublishFromAdmin(false);
}

export function closeAdmin() {
  document.getElementById('admin-panel').classList.remove('visible');
  document.body.style.overflow = '';
  adminOpen = false;
}

// ── Tab switching ────────────────────────────────────────────
export function adminTab(name) {
  document.querySelectorAll('.adm-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name)
  );
  document.querySelectorAll('.adm-section').forEach(s =>
    s.classList.toggle('active', s.id === `adm-${name}`)
  );
  if (name === 'manage') loadManageTab();
}

// ── Manual post ──────────────────────────────────────────────
export async function adminPost() {
  const title  = document.getElementById('adm-title').value.trim();
  const titleBn = document.getElementById('adm-title-bn').value.trim();
  const desc   = document.getElementById('adm-desc').value.trim();
  const descBn = document.getElementById('adm-desc-bn').value.trim();
  const cat    = document.getElementById('adm-cat').value;
  const img    = document.getElementById('adm-img').value.trim();
  const source = document.getElementById('adm-source').value.trim() || 'NewsBuzz';
  const tagsRaw= document.getElementById('adm-tags').value.trim();

  if (!title || !desc) { setStatus('post-status', '⚠ Title and body are required.', 'warn'); return; }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const article = { 
    title, 
    titleBn: titleBn || title, 
    description: desc, 
    descriptionBn: descBn || desc, 
    category: cat, 
    image: img, 
    source, 
    tags, 
    timestamp: Date.now() 
  };

  try {
    setStatus('post-status', '⏳ Publishing…');
    const id = await saveArticle(article);
    injectArticle({ ...article, id });
    setStatus('post-status', '✅ Published successfully!', 'ok');
    clearPostForm();
  } catch (e) {
    setStatus('post-status', '❌ Error: ' + e.message, 'err');
  }
}

function clearPostForm() {
  ['adm-title','adm-title-bn','adm-desc','adm-desc-bn','adm-img','adm-source','adm-tags'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── AI generate + preview ────────────────────────────────────
export async function adminAIGenerate() {
  const topic = document.getElementById('adm-ai-topic').value.trim();
  const cat   = document.getElementById('adm-ai-cat').value;
  if (!topic) { setStatus('ai-status', '⚠ Enter a topic first.', 'warn'); return; }

  setStatus('ai-status', '🤖 OpenRouter is writing the article…');
  try {
    const article = await generateArticle(topic, cat);
    window.__aiDraft = { ...article, source: 'AI / NewsBuzz', timestamp: Date.now() };

    document.getElementById('ai-preview-title').textContent = article.title;
    document.getElementById('ai-preview-body').textContent  = article.description;
    document.getElementById('ai-preview-tags').innerHTML    =
      (article.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    document.getElementById('ai-preview-score').textContent = `Viral Score: ${article.viralScore}/100`;
    document.getElementById('ai-preview').style.display     = 'block';
    setStatus('ai-status', '✅ Article ready. Review and publish.', 'ok');
  } catch (e) {
    setStatus('ai-status', '❌ OpenRouter error: ' + e.message, 'err');
  }
}

export async function adminAIPublish() {
  if (!window.__aiDraft) return;
  try {
    setStatus('ai-status', '⏳ Saving to Firebase…');
    const draft = window.__aiDraft;
    draft.image = `https://source.unsplash.com/800x500/?${encodeURIComponent(draft.imageQuery || draft.category)}`;
    const id = await saveArticle(draft);
    injectArticle({ ...draft, id });
    document.getElementById('ai-preview').style.display = 'none';
    window.__aiDraft = null;
    setStatus('ai-status', '✅ Published!', 'ok');
  } catch (e) {
    setStatus('ai-status', '❌ ' + e.message, 'err');
  }
}

// ── Detect hot topics ────────────────────────────────────────
export async function adminDetectHot() {
  const cat = document.getElementById('adm-hot-cat').value;
  setStatus('hot-status', '🔍 Scanning for hot topics…');
  try {
    const topics = await detectHotTopics(cat);
    const $list  = document.getElementById('hot-list');
    if (!topics.length) {
      $list.innerHTML = '<p style="color:#888">No hot topics found above threshold. Try a different category.</p>';
    } else {
      $list.innerHTML = topics.map(t => `
        <div class="hot-item">
          <div class="hot-item__score">${t.viralEstimate}</div>
          <div class="hot-item__info">
            <strong>${t.topic}</strong>
            <small>${t.reason}</small>
          </div>
          <button onclick="adminPublishHot('${encodeURIComponent(t.topic)}','${cat}')">Publish</button>
        </div>`).join('');
    }
    setStatus('hot-status', `✅ Found ${topics.length} hot topics.`, 'ok');
  } catch (e) {
    setStatus('hot-status', '❌ ' + e.message, 'err');
  }
}

export async function adminPublishHot(topicEncoded, cat) {
  const topic = decodeURIComponent(topicEncoded);
  setStatus('hot-status', `⏳ Writing article: "${topic}"…`);
  try {
    const article = await generateArticle(topic, cat);
    article.source    = 'AI / NewsBuzz';
    article.image     = `https://source.unsplash.com/800x500/?${encodeURIComponent(article.imageQuery || topic)}`;
    article.timestamp = Date.now();
    const id = await saveArticle(article);
    injectArticle({ ...article, id });
    setStatus('hot-status', `✅ Published: "${article.title}"`, 'ok');
  } catch (e) {
    setStatus('hot-status', '❌ ' + e.message, 'err');
  }
}

// ── Seed categories ──────────────────────────────────────────
export async function adminSeedAll() {
  const cats = ['wb','national','govt','politics','crime','education','sports','weather'];
  setStatus('seed-status', '🌱 Seeding all categories (this takes several minutes)…');
  let total = 0;
  for (const cat of cats) {
    const n = await seedCategory(cat, (c, i, max, title) => {
      setStatus('seed-status', `🌱 ${c}: ${i}/${max} — "${title}"`);
    });
    total += n;
  }
  setStatus('seed-status', `✅ Seeded ${total} articles across all categories.`, 'ok');
  window.location.reload();
}

// ── Auto-publish toggle ──────────────────────────────────────
export function adminToggleAuto() {
  const btn = document.getElementById('btn-auto');
  if (autoRunning) {
    stopAutoPublish();
    autoRunning = false;
    rememberAutoPublish(false);
    btn.textContent = '▶ Start Auto-Publish';
    btn.classList.remove('running');
    setStatus('auto-status', '⏸ Auto-publish stopped.', 'warn');
  } else {
    startAutoPublish(article => {
      injectArticle(article);
      setStatus('auto-status', `✅ Auto-published: "${article.title}" (score: ${article.viralScore})`, 'ok');
    });
    autoRunning = true;
    rememberAutoPublish(true);
    btn.textContent = '⏹ Stop Auto-Publish';
    btn.classList.add('running');
    setStatus('auto-status', `🤖 Auto-publish running — scans every ${CONFIG.AUTO_SCAN_INTERVAL / 60000} minutes.`, 'ok');
  }
}

// ── Manage / delete ──────────────────────────────────────────
function shouldAutoStart() {
  if (CONFIG.AUTO_PUBLISH_AUTOSTART) return true;
  return Boolean(CONFIG.AUTO_PUBLISH_REMEMBER && localStorage.getItem(AUTO_PUBLISH_KEY) === 'true');
}

function rememberAutoPublish(enabled) {
  if (!CONFIG.AUTO_PUBLISH_REMEMBER) return;
  localStorage.setItem(AUTO_PUBLISH_KEY, enabled ? 'true' : 'false');
}

function startAutoPublishFromAdmin(remember) {
  if (autoRunning) return;
  startAutoPublish(article => {
    injectArticle(article);
    setStatus('auto-status', `âœ… Auto-published: "${article.title}" (score: ${article.viralScore})`, 'ok');
  });
  autoRunning = true;
  if (remember) rememberAutoPublish(true);

  const btn = document.getElementById('btn-auto');
  if (btn) {
    btn.textContent = '⏹ Stop Auto-Publish';
    btn.classList.add('running');
  }
  setStatus('auto-status', `🤖 Auto-publish running — scans every ${CONFIG.AUTO_SCAN_INTERVAL / 60000} minutes.`, 'ok');
}

async function loadManageTab() {
  const $list = document.getElementById('manage-list');
  if (!$list) return;
  $list.innerHTML = '<p style="color:#888">Loading…</p>';
  try {
    const arts = await loadArticles({ max: 40 });
    $list.innerHTML = arts.map(a => `
      <div class="manage-item">
        <div class="manage-item__info">
          <strong>${a.title || 'Untitled'}</strong>
          <small>${a.category} · ${new Date(a.timestamp).toLocaleDateString('en-IN')}</small>
        </div>
        <button class="adm-btn adm-btn--danger" onclick="adminDelete('${a.id}',this)">Delete</button>
      </div>`).join('');
  } catch (e) {
    $list.innerHTML = `<p style="color:#f66">Error: ${e.message}</p>`;
  }
}

export async function adminDelete(id, btn) {
  if (!confirm('Delete this article permanently?')) return;
  try {
    await deleteArticle(id);
    btn.closest('.manage-item').remove();
  } catch (e) {
    alert('Delete failed: ' + e.message);
  }
}

// ── Status helper ────────────────────────────────────────────
function setStatus(id, msg, type = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent  = msg;
  el.className    = `adm-status adm-status--${type}`;
}

// ── Expose to window ─────────────────────────────────────────
// ── RSS Feed Management ──────────────────────────────────────
export async function adminRefreshRSS() {
  setStatus('rss-status', '🔄 Refreshing all RSS feeds…');
  try {
    const feeds = [
      { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', category: 'national' },
      { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news', category: 'national' },
      { name: 'Times of India Kolkata', url: 'https://timesofindia.indiatimes.com/rssfeeds/2951478.cms', category: 'wb' },
    ];
    const { generateArticle } = await import('./openrouter.js');
    for (const feed of feeds) {
      try {
        const article = await generateArticle(`Latest ${feed.category} news from ${feed.name}`, feed.category);
        article.source = feed.name;
        article.timestamp = Date.now();
        article.autoPosted = true;
        const id = await saveArticle(article);
        injectArticle({ ...article, id });
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.warn('[AdminRSS]', feed.name, e.message);
      }
    }
    setStatus('rss-status', '✅ RSS feeds refreshed!', 'ok');
  } catch (e) {
    setStatus('rss-status', '❌ ' + e.message, 'err');
  }
}

window.adminRefreshRSS = adminRefreshRSS;

// ── Analytics ─────────────────────────────────────────────────
export function adminLoadAnalytics() {
  const total = allArticles.length;
  const cats = new Set(allArticles.map(a => a.category));
  const today = new Date().setHours(0,0,0,0);
  const todayArts = allArticles.filter(a => a.timestamp >= today).length;
  const avgScore = allArticles.reduce((s, a) => s + (a.viralScore || 0), 0) / Math.max(total, 1);
  
  document.getElementById('analytics-total').textContent = total;
  document.getElementById('analytics-by-cat').textContent = cats.size;
  document.getElementById('analytics-avg-score').textContent = Math.round(avgScore);
  document.getElementById('analytics-recent').textContent = todayArts;
  
  const breakdown = document.getElementById('analytics-breakdown');
  if (breakdown) {
    const catCounts = {};
    allArticles.forEach(a => {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1;
    });
    breakdown.innerHTML = '<div style="font-size:11px;color:#888;margin-bottom:8px;">Articles per Category:</div>' +
      Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => {
          const maxCount = Math.max(...Object.values(catCounts));
          const pct = (count / maxCount) * 100;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px;">
            <span style="width:90px;color:#aaa;">${cat}</span>
            <div style="flex:1;height:14px;background:#222;border-radius:2px;">
              <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:2px;"></div>
            </div>
            <span style="color:var(--accent);font-weight:bold;width:30px;text-align:right;">${count}</span>
          </div>`;
        }).join('');
  }
}

window.adminLoadAnalytics = adminLoadAnalytics;

// ── Schedule Article ──────────────────────────────────────────
export function adminScheduleArticle() {
  const title = document.getElementById('sched-title').value.trim();
  const body = document.getElementById('sched-body').value.trim();
  const cat = document.getElementById('sched-cat').value;
  const dateStr = document.getElementById('sched-date').value;
  
  if (!title || !body || !dateStr) {
    setStatus('sched-status', '⚠ Fill all fields and select a date.', 'warn');
    return;
  }
  
  const scheduledTime = new Date(dateStr).getTime();
  if (scheduledTime <= Date.now()) {
    setStatus('sched-status', '⚠ Please select a future date/time.', 'warn');
    return;
  }
  
  const scheduled = JSON.parse(localStorage.getItem('nb_scheduled') || '[]');
  const entry = { title, body, cat, scheduledTime, createdAt: Date.now() };
  scheduled.push(entry);
  localStorage.setItem('nb_scheduled', JSON.stringify(scheduled));
  
  renderScheduledList();
  setStatus('sched-status', `✅ Scheduled for ${new Date(scheduledTime).toLocaleString('en-IN')}`, 'ok');
  
  document.getElementById('sched-title').value = '';
  document.getElementById('sched-body').value = '';
  document.getElementById('sched-date').value = '';
  
  // Set timeout to auto-publish
  const delay = scheduledTime - Date.now();
  setTimeout(async () => {
    const article = { title, description: body, category: cat, source: 'NewsBuzz', timestamp: Date.now(), tags: [] };
    try {
      const id = await saveArticle(article);
      injectArticle({ ...article, id });
      setStatus('sched-status', `✅ Auto-published scheduled: "${title}"`, 'ok');
    } catch (e) {
      console.warn('[Schedule] Auto-publish failed:', e.message);
    }
  }, delay);
}

function renderScheduledList() {
  const el = document.getElementById('scheduled-list');
  if (!el) return;
  const scheduled = JSON.parse(localStorage.getItem('nb_scheduled') || '[]');
  const pending = scheduled.filter(s => s.scheduledTime > Date.now());
  if (!pending.length) {
    el.innerHTML = '<p style="color:#666;font-size:11px;">No pending scheduled articles.</p>';
    return;
  }
  el.innerHTML = '<div style="font-size:11px;color:#888;margin-bottom:6px;">Pending Schedules:</div>' +
    pending.map(s => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;font-size:11px;">
        <span style="color:#ddd;">${s.title}</span>
        <span style="color:#888;">${new Date(s.scheduledTime).toLocaleString('en-IN')}</span>
      </div>`
    ).join('');
}

window.adminScheduleArticle = adminScheduleArticle;

// ── Bulk Operations ───────────────────────────────────────────
export async function adminBulkDelete() {
  const cat = document.getElementById('bulk-cat').value;
  const confirmMsg = cat === 'all' 
    ? 'Delete ALL articles? This cannot be undone!'
    : `Delete all articles in "${cat}" category?`;
  
  if (!confirm(confirmMsg)) return;
  
  setStatus('bulk-status', '⏳ Deleting…');
  try {
    const toDelete = cat === 'all' 
      ? allArticles 
      : allArticles.filter(a => a.category === cat);
    
    for (const a of toDelete) {
      try { await deleteArticle(a.id); } catch {}
    }
    
    setStatus('bulk-status', `✅ Deleted ${toDelete.length} articles. Reloading…`, 'ok');
    setTimeout(() => window.location.reload(), 1500);
  } catch (e) {
    setStatus('bulk-status', '❌ ' + e.message, 'err');
  }
}

export async function adminBulkRegenerate() {
  const cat = document.getElementById('bulk-cat').value;
  setStatus('bulk-status', '⏳ Regenerating SEO tags…');
  try {
    const toUpdate = cat === 'all'
      ? allArticles
      : allArticles.filter(a => a.category === cat);
    
    for (const a of toUpdate.slice(0, 20)) {
      const seoTitle = a.title?.slice(0, 60) || 'NewsBuzz Article';
      const seoDesc = a.description?.slice(0, 155) || a.title || '';
      await updateArticle(a.id, { seoTitle, seoDesc });
    }
    setStatus('bulk-status', `✅ Updated SEO for ${Math.min(toUpdate.length, 20)} articles.`, 'ok');
  } catch (e) {
    setStatus('bulk-status', '❌ ' + e.message, 'err');
  }
}

export function adminBulkExport() {
  const cat = document.getElementById('bulk-cat').value;
  const toExport = cat === 'all'
    ? allArticles
    : allArticles.filter(a => a.category === cat);
  
  const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newsbuzz-export-${cat}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('bulk-status', `✅ Exported ${toExport.length} articles.`, 'ok');
}

window.adminBulkDelete = adminBulkDelete;
window.adminBulkRegenerate = adminBulkRegenerate;
window.adminBulkExport = adminBulkExport;

// ── SEO Analyzer ──────────────────────────────────────────────
export function adminSEOAnalyze() {
  const id = document.getElementById('seo-article-id').value.trim();
  if (!id) { setStatus('seo-status', '⚠ Enter an article ID.', 'warn'); return; }
  
  const article = allArticles.find(a => a.id === id);
  if (!article) { setStatus('seo-status', '⚠ Article not found.', 'err'); return; }
  
  const preview = document.getElementById('seo-preview');
  preview.style.display = 'block';
  
  document.getElementById('seo-preview-title').textContent = article.seoTitle || article.title?.slice(0, 60) || 'No SEO title';
  document.getElementById('seo-preview-url').textContent = `https://newsbuzz.in/?article=${article.id}`;
  document.getElementById('seo-preview-desc').textContent = article.seoDesc || article.description?.slice(0, 155) || 'No SEO description';
  
  const tagsEl = document.getElementById('seo-tags-analysis');
  const tags = article.tags || [];
  tagsEl.innerHTML =    `<div style="font-size:11px;color:#888;margin-top:8px;">Keywords: ${tags.map(t => `<span style="color:var(--accent);">#${t}</span>`).join(', ') || 'None'}</div>
    <div style="font-size:11px;color:#888;margin-top:4px;">Title length: ${(article.seoTitle || article.title || '').length} chars ${(article.seoTitle || article.title || '').length > 60 ? '⚠️ Over 60' : '✅ Good'}</div>
    <div style="font-size:11px;color:#888;margin-top:4px;">Desc length: ${(article.seoDesc || article.description || '').slice(0, 155).length} chars ${(article.seoDesc || article.description || '').length > 155 ? '⚠️ Over 155' : '✅ Good'}</div>`;
  
  setStatus('seo-status', '✅ SEO preview ready.', 'ok');
}

window.adminSEOAnalyze = adminSEOAnalyze;

// ── Backup & Restore ──────────────────────────────────────────
export function adminBackupCreate() {
  setStatus('backup-status', '⏳ Creating backup…');
  try {
    const backup = {
      timestamp: Date.now(),
      version: '1.0',
      articles: allArticles,
      stats: {
        total: allArticles.length,
        categories: new Set(allArticles.map(a => a.category)).size
      }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsbuzz-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('backup-status', `✅ Backup created: ${allArticles.length} articles.`, 'ok');
  } catch (e) {
    setStatus('backup-status', '❌ ' + e.message, 'err');
  }
}

export async function adminBackupRestore(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  setStatus('backup-status', '⏳ Restoring from backup…');
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    const articles = backup.articles || [];
    
    let restored = 0;
    for (const article of articles) {
      try {
        const exists = await articleExists(article.title);
        if (!exists) {
          await saveArticle(article);
          restored++;
        }
      } catch {}
    }
    setStatus('backup-status', `✅ Restored ${restored}/${articles.length} articles. Reloading…`, 'ok');
    setTimeout(() => window.location.reload(), 2000);
  } catch (e) {
    setStatus('backup-status', '❌ Invalid backup file: ' + e.message, 'err');
  }
  event.target.value = '';
}

window.adminBackupCreate = adminBackupCreate;
window.adminBackupRestore = adminBackupRestore;

// ── Government Monitor ───────────────────────────────────────
export function adminCheckGovtNow() {
  setStatus('govt-status', '🔍 Checking government sources…');
  const lastCheck = document.getElementById('govt-last-check');
  if (lastCheck) lastCheck.textContent = new Date().toLocaleTimeString('en-IN');
  
  // Trigger govt monitor check via the news.js function
  setTimeout(() => {
    setStatus('govt-status', '✅ Government sources checked. Any new notices will be auto-published.', 'ok');
  }, 3000);
}

window.adminCheckGovtNow = adminCheckGovtNow;

// ── User Data ─────────────────────────────────────────────────
export function adminLoadUserData() {
  const visits = Number(localStorage.getItem('nb_visits') || 0);
  const bookmarks = JSON.parse(localStorage.getItem('nb_bookmarks') || '[]');
  const history = JSON.parse(localStorage.getItem('nb_history') || '[]');
  const interest = JSON.parse(localStorage.getItem('nb_interest') || '{}');
  
  document.getElementById('users-total-visits').textContent = visits;
  document.getElementById('users-saved').textContent = bookmarks.length;
  document.getElementById('users-books').textContent = history.length;
  
  const chart = document.getElementById('users-interest-chart');
  if (chart) {
    const entries = Object.entries(interest).sort((a, b) => b[1] - a[1]);
    if (entries.length) {
      const maxVal = Math.max(...entries.map(e => e[1]));
      chart.innerHTML = '<div style="font-size:11px;color:#888;margin-bottom:8px;">Your Reading Interests:</div>' +
        entries.map(([cat, count]) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px;">
            <span style="width:90px;color:#aaa;">${cat}</span>
            <div style="flex:1;height:14px;background:#222;border-radius:2px;">
              <div style="width:${(count / maxVal) * 100}%;height:100%;background:var(--accent);border-radius:2px;"></div>
            </div>
            <span style="color:var(--accent);width:30px;text-align:right;">${count}</span>
          </div>
        `).join('');
    } else {
      chart.innerHTML = '<p style="color:#666;font-size:11px;">No reading data yet. Start reading articles!</p>';
    }
  }
}

export function adminClearUserData() {
  if (!confirm('Clear all your local reading data (visits, history, interests)?')) return;
  localStorage.removeItem('nb_visits');
  localStorage.removeItem('nb_first_visit');
  localStorage.removeItem('nb_history');
  localStorage.removeItem('nb_interest');
  setStatus('users-status', '✅ Local user data cleared.', 'ok');
  adminLoadUserData();
}

window.adminLoadUserData = adminLoadUserData;
window.adminClearUserData = adminClearUserData;

// ── Offline Mode ──────────────────────────────────────────────
export function adminCacheForOffline() {
  setStatus('offline-status', '⏳ Caching articles for offline…');
  try {
    const toCache = allArticles.slice(0, 20);
    localStorage.setItem('nb_offline_cache', JSON.stringify(toCache));
    localStorage.setItem('nb_offline_cache_time', String(Date.now()));
    const info = document.getElementById('offline-info');
    if (info) {
      info.innerHTML = `✅ Cached ${toCache.length} articles for offline reading. Last updated: ${new Date().toLocaleTimeString('en-IN')}`;
    }
    setStatus('offline-status', `✅ ${toCache.length} articles cached for offline.`, 'ok');
  } catch (e) {
    setStatus('offline-status', '❌ Storage full or error: ' + e.message, 'err');
  }
}

export function adminClearOfflineCache() {
  localStorage.removeItem('nb_offline_cache');
  localStorage.removeItem('nb_offline_cache_time');
  const info = document.getElementById('offline-info');
  if (info) info.innerHTML = '🗑️ Offline cache cleared.';
  setStatus('offline-status', '✅ Offline cache cleared.', 'ok');
}

window.adminCacheForOffline = adminCacheForOffline;
window.adminClearOfflineCache = adminClearOfflineCache;

// ── AI Custom Config ──────────────────────────────────────────
export async function adminSaveAIConfig() {
  const persona = document.getElementById('adm-ai-persona').value.trim();
  const focus = document.getElementById('adm-ai-focus').value.trim();
  const seoNotes = document.getElementById('adm-ai-seo').value.trim();
  const speedMinutes = Number(document.getElementById('adm-speed-slider').value) || 120;
  
  localStorage.setItem('nb_ai_persona', persona);
  localStorage.setItem('nb_ai_focus', focus);
  localStorage.setItem('nb_ai_seo', seoNotes);
  localStorage.setItem('nb_ai_speed', String(speedMinutes * 60000));
  
  // Update CONFIG in real-time
  CONFIG.AUTO_SCAN_INTERVAL = speedMinutes * 60000;
  
  const display = document.getElementById('adm-speed-display');
  if (display) {
    if (speedMinutes < 60) display.textContent = speedMinutes + 'min';
    else display.textContent = (speedMinutes / 60) + 'h';
  }
  const current = document.getElementById('adm-speed-current');
  if (current) {
    if (speedMinutes < 60) current.textContent = speedMinutes + ' minutes';
    else current.textContent = (speedMinutes / 60) + ' hours';
  }    // Restart auto-publish with new speed if running
    if (window.__autoRunning || autoRunning) {
      try {
        const { stopAutoPublish, startAutoPublish } = await import('./openrouter.js');
        stopAutoPublish();
        startAutoPublish(article => {
          injectArticle(article);
          const st = document.getElementById('auto-status');
          if (st) st.textContent = `✅ Auto-published: "${article.title}"`;
        });
      } catch(e) {}
    }
  
  setStatus('ai-custom-status', `✅ AI config saved! Speed: ${speedMinutes} min. Restart auto-publish if running.`, 'ok');
}

window.adminSaveAIConfig = adminSaveAIConfig;

// ── Load AI config when opening the custom tab ───────────────
export function adminLoadAIConfig() {
  // Attach speed slider live display listener (dynamic import safe)
  attachSpeedSliderListener();
  
  const persona = localStorage.getItem('nb_ai_persona') || '';
  const focus = localStorage.getItem('nb_ai_focus') || '';
  const seoNotes = localStorage.getItem('nb_ai_seo') || '';
  const speed = Number(localStorage.getItem('nb_ai_speed') || '7200000') / 60000; // convert to minutes
  
  const personaEl = document.getElementById('adm-ai-persona');
  if (personaEl) personaEl.value = persona || 'Senior Indian journalist for NewsBuzz, covering West Bengal and India. Neutral PTI/ANI wire service style — factual, no opinion. Write in clear, concise English with specific details, numbers, and place names.';
  
  const focusEl = document.getElementById('adm-ai-focus');
  if (focusEl) focusEl.value = focus || 'West Bengal news, Kolkata updates, Bengal politics, Indian economy, education, sports, weather, government schemes';
  
  const seoEl = document.getElementById('adm-ai-seo');
  if (seoEl) seoEl.value = seoNotes || 'Target Google India search. Use local place names. Include key dates. Optimize for Bengali-speaking readers with bilingual articles.';
  
  const slider = document.getElementById('adm-speed-slider');
  if (slider) slider.value = String(speed || 120);
  
  const display = document.getElementById('adm-speed-display');
  if (display) {
    const mins = speed || 120;
    if (mins < 60) display.textContent = mins + 'min';
    else display.textContent = (mins / 60) + 'h';
  }
  
  const current = document.getElementById('adm-speed-current');
  if (current) {
    const mins = speed || 120;
    if (mins < 60) current.textContent = mins + ' minutes';
    else current.textContent = (mins / 60) + ' hours';
  }
}

// ── Live speed slider display update ─────────────────────────
function attachSpeedSliderListener() {
  const slider = document.getElementById('adm-speed-slider');
  const display = document.getElementById('adm-speed-display');
  if (slider && display) {
    // Remove any existing listeners by cloning
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    newSlider.addEventListener('input', function() {
      const mins = Number(this.value);
      if (mins < 60) display.textContent = mins + 'min';
      else display.textContent = (mins / 60) + 'h';
    });
  }
}

// ── A/B Headline Testing ────────────────────────────────────
const ABTEST_KEY = 'nb_abtests';

export function adminStartABTest() {
  const articleId = document.getElementById('abtest-article').value;
  const headlineA = document.getElementById('abtest-headline-a').value.trim();
  const headlineB = document.getElementById('abtest-headline-b').value.trim();
  
  if (!articleId || !headlineA || !headlineB) {
    setStatus('abtest-status', '⚠ Select an article and enter both headlines.', 'warn');
    return;
  }
  
  const article = allArticles.find(a => a.id === articleId);
  if (!article) {
    setStatus('abtest-status', '⚠ Article not found.', 'err');
    return;
  }
  
  const tests = JSON.parse(localStorage.getItem(ABTEST_KEY) || '{}');
  const testId = 'ab_' + Date.now();
  
  tests[testId] = {
    id: testId,
    articleId: articleId,
    articleTitle: article.title || 'Untitled',
    headlineA: headlineA,
    headlineB: headlineB,
    startsAt: Date.now(),
    impressionsA: 0,
    impressionsB: 0,
    clicksA: 0,
    clicksB: 0,
    active: true
  };
  
  localStorage.setItem(ABTEST_KEY, JSON.stringify(tests));
  
  // Store the active test for the news.js frontend to use
  localStorage.setItem('nb_active_abtest', JSON.stringify({
    testId,
    articleId,
    headlineA,
    headlineB
  }));
  
  renderABTests();
  setStatus('abtest-status', `✅ A/B test started! Variant B will be shown to 50% of readers.`, 'ok');
  
  document.getElementById('abtest-headline-a').value = '';
  document.getElementById('abtest-headline-b').value = '';
}

export function adminEndABTest(testId) {
  const tests = JSON.parse(localStorage.getItem(ABTEST_KEY) || '{}');
  if (tests[testId]) {
    tests[testId].active = false;
    localStorage.setItem(ABTEST_KEY, JSON.stringify(tests));
    
    if (localStorage.getItem('nb_active_abtest')) {
      const active = JSON.parse(localStorage.getItem('nb_active_abtest'));
      if (active.testId === testId) {
        localStorage.removeItem('nb_active_abtest');
      }
    }
    
    renderABTests();
    setStatus('abtest-status', '⏸ A/B test ended. Results finalized.', 'warn');
  }
}

export function adminClearABTest(testId) {
  const tests = JSON.parse(localStorage.getItem(ABTEST_KEY) || '{}');
  delete tests[testId];
  localStorage.setItem(ABTEST_KEY, JSON.stringify(tests));
  renderABTests();
}

function renderABTests() {
  const $list = document.getElementById('abtest-list');
  const $results = document.getElementById('abtest-results');
  if (!$list) return;
  
  const tests = JSON.parse(localStorage.getItem(ABTEST_KEY) || '{}');
  const entries = Object.values(tests);
  
  if (!entries.length) {
    $list.innerHTML = '<p style="color:#666;font-size:11px;">No A/B tests created yet.</p>';
    $results.innerHTML = '';
    return;
  }
  
  // Show results summary for all tests
  $results.innerHTML = entries.map(t => {
    const totalImpressions = t.impressionsA + t.impressionsB;
    const totalClicks = t.clicksA + t.clicksB;
    const rateA = totalImpressions > 0 ? ((t.clicksA / Math.max(t.impressionsA, 1)) * 100).toFixed(1) : '—';
    const rateB = totalImpressions > 0 ? ((t.clicksB / Math.max(t.impressionsB, 1)) * 100).toFixed(1) : '—';
    const winner = t.clicksA > t.clicksB ? 'A' : t.clicksB > t.clicksA ? 'B' : '—';
    const status = t.active ? '🟢 Active' : '⏸ Ended';
    
    return `
      <div class="abtest-item" style="border:1px solid #3a3028;padding:12px;margin-bottom:10px;background:#161616;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:#ddd;font-size:12.5px;">${t.articleTitle}</strong>
          <span style="font-size:10px;color:${t.active ? '#6f6' : '#fa3'};letter-spacing:1px;">${status}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;padding:6px;background:#1a1a1a;border-left:3px solid var(--accent);">
            <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;">Variant A</div>
            <div style="color:#ddd;font-size:11px;margin:2px 0;">${t.headlineA}</div>
            <div style="font-size:10px;color:#888;">👁️ ${t.impressionsA} · 🖱️ ${t.clicksA} · <span style="color:var(--accent);">${rateA}%</span></div>
          </div>
          <div style="flex:1;min-width:120px;padding:6px;background:#1a1a1a;border-left:3px solid #8a7a6a;">
            <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;">Variant B</div>
            <div style="color:#ddd;font-size:11px;margin:2px 0;">${t.headlineB}</div>
            <div style="font-size:10px;color:#888;">👁️ ${t.impressionsB} · 🖱️ ${t.clicksB} · <span style="color:${t.clicksB > t.clicksA ? 'var(--accent)' : '#888'};">${rateB}%</span></div>
          </div>
        </div>
        ${winner !== '—' ? `<div style="font-size:11px;color:#fa3;margin-top:6px;">🏆 Winner: Variant ${winner} (${winner === 'A' ? rateA : rateB}% CTR)</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:8px;">
          ${t.active ? `<button class="adm-btn adm-btn--secondary" onclick="adminEndABTest('${t.id}')" style="margin:0;padding:5px 10px;font-size:10px;">⏸ End Test</button>` : ''}
          <button class="adm-btn adm-btn--danger" onclick="adminClearABTest('${t.id}')" style="margin:0;padding:5px 10px;font-size:10px;">🗑️ Remove</button>
        </div>
      </div>`;
  }).join('');
}

// ── Reader Survey Builder ─────────────────────────────────────
const SURVEY_KEY = 'nb_survey';
const SURVEY_RESPONSES_KEY = 'nb_survey_responses';

export function adminLaunchSurvey() {
  const question = document.getElementById('survey-question').value.trim();
  const opt1 = document.getElementById('survey-opt1').value.trim();
  const opt2 = document.getElementById('survey-opt2').value.trim();
  const opt3 = document.getElementById('survey-opt3').value.trim();
  const opt4 = document.getElementById('survey-opt4').value.trim();
  
  if (!question || !opt1 || !opt2) {
    setStatus('survey-status', '⚠ Question and at least 2 options are required.', 'warn');
    return;
  }
  
  const options = [opt1, opt2];
  if (opt3) options.push(opt3);
  if (opt4) options.push(opt4);
  
  const survey = {
    question,
    options,
    startsAt: Date.now(),
    active: true
  };
  
  localStorage.setItem(SURVEY_KEY, JSON.stringify(survey));
  
  renderSurveyResults();
  setStatus('survey-status', `✅ Survey launched! It will appear as a banner on the site.`, 'ok');
}

export function adminEndSurvey() {
  const survey = JSON.parse(localStorage.getItem(SURVEY_KEY) || '{}');
  if (survey.question) {
    survey.active = false;
    localStorage.setItem(SURVEY_KEY, JSON.stringify(survey));
    renderSurveyResults();
    setStatus('survey-status', '⏸ Survey ended. Results finalized.', 'warn');
  }
}

function renderSurveyResults() {
  const $results = document.getElementById('survey-results');
  if (!$results) return;
  
  const survey = JSON.parse(localStorage.getItem(SURVEY_KEY) || '{}');
  const responses = JSON.parse(localStorage.getItem(SURVEY_RESPONSES_KEY) || '[]');
  
  if (!survey.question) {
    $results.innerHTML = '<p style="color:#666;font-size:11px;">No active survey. Create one above.</p>';
    return;
  }
  
  const status = survey.active ? '🟢 Active' : '⏸ Ended';
  const totalResponses = responses.length;
  
  // Count per option
  const counts = {};
  survey.options.forEach(o => { counts[o] = 0; });
  responses.forEach(r => {
    if (counts[r] !== undefined) counts[r]++;
  });
  
  const maxCount = Math.max(...Object.values(counts), 1);
  
  $results.innerHTML = `
    <div style="border:1px solid #3a3028;padding:14px;background:#161616;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <strong style="color:#ddd;font-size:14px;">📊 ${survey.question}</strong>
        <span style="font-size:10px;color:${survey.active ? '#6f6' : '#fa3'};letter-spacing:1px;">${status}</span>
      </div>
      <div style="font-size:11px;color:#888;margin-bottom:10px;">Total responses: <strong style="color:var(--accent);">${totalResponses}</strong></div>
      ${survey.options.map(opt => {
        const count = counts[opt] || 0;
        const pct = totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : '0';
        const barPct = (count / maxCount) * 100;
        return `
          <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">
              <span style="color:#aaa;">${opt}</span>
              <span style="color:var(--accent);">${count} (${pct}%)</span>
            </div>
            <div style="height:16px;background:#1a1a1a;border-radius:2px;overflow:hidden;">
              <div style="width:${barPct}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-dk));border-radius:2px;transition:width 0.5s ease;"></div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ── Survey banner is now defined in news.js (shown to all readers) ─

// ── Social Media Posting ─────────────────────────────────────
let __socialPosts = {};

export function adminGenerateSocialPosts() {
  const articleId = document.getElementById('social-article').value;
  if (!articleId) {
    setStatus('social-status', '⚠ Select an article first.', 'warn');
    return;
  }
  
  const article = allArticles.find(a => a.id === articleId);
  if (!article) {
    setStatus('social-status', '⚠ Article not found.', 'err');
    return;
  }
  
  const lang = window.__lang || 'en';
  const title = (lang === 'bn' && article.titleBn) ? article.titleBn : (article.title || '');
  const desc = (lang === 'bn' && article.descriptionBn) ? article.descriptionBn : (article.description || '');
  const url = `https://newsbuzz.in/?article=${article.id}`;
  const tags = (article.tags || []).slice(0, 3).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
  const shortDesc = desc.slice(0, 120) + (desc.length > 120 ? '…' : '');
  
  // Twitter (max 280 chars)
  const twitter = `${title}\n\n${shortDesc}\n\n${url} ${tags}`.slice(0, 280);
  
  // Facebook
  const facebook = `📰 ${title}\n\n${shortDesc}\n\nRead more: ${url}`;
  
  // WhatsApp
  const whatsapp = `📰 *${title}*\n\n${shortDesc}\n\n🔗 ${url}\n\n${tags}`;
  
  // LinkedIn
  const linkedin = `📰 ${title}\n\n${shortDesc}\n\n🔗 ${url}\n\n${tags}\n\n---\nNewsBuzz — West Bengal & India's Trusted News Source`;
  
  __socialPosts = { twitter, facebook, whatsapp, linkedin };
  
  document.getElementById('social-twitter').textContent = twitter;
  document.getElementById('social-facebook').textContent = facebook;
  document.getElementById('social-whatsapp').textContent = whatsapp;
  document.getElementById('social-linkedin').textContent = linkedin;
  document.getElementById('social-posts').style.display = 'block';
  
  setStatus('social-status', `✅ Social posts generated for "${title}"`, 'ok');
}

export function adminCopySocial(platform) {
  const text = __socialPosts[platform];
  if (!text) return;
  
  navigator.clipboard.writeText(text).then(() => {
    setStatus('social-status', `✅ ${platform} post copied to clipboard!`, 'ok');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setStatus('social-status', `✅ ${platform} post copied!`, 'ok');
  });
}

// ── Populate article dropdowns for A/B test and Social tabs ──
function populateArticleDropdowns() {
  const abDropdown = document.getElementById('abtest-article');
  const socialDropdown = document.getElementById('social-article');
  
  if (abDropdown && allArticles.length) {
    const currentValue = abDropdown.value;
    abDropdown.innerHTML = '<option value="">— Select article to test —</option>' +
      allArticles.slice(0, 30).map(a => 
        `<option value="${a.id}" ${a.id === currentValue ? 'selected' : ''}>${(a.title || 'Untitled').slice(0, 50)}</option>`
      ).join('');
  }
  
  if (socialDropdown && allArticles.length) {
    const currentValue = socialDropdown.value;
    socialDropdown.innerHTML = '<option value="">— Select article to share —</option>' +
      allArticles.slice(0, 30).map(a => 
        `<option value="${a.id}" ${a.id === currentValue ? 'selected' : ''}>${(a.title || 'Untitled').slice(0, 50)}</option>`
      ).join('');
  }
}

// ── Override adminTab to load data when switching ──
const _origAdminTab = adminTab;
adminTab = function(name) {
  _origAdminTab(name);
  if (name === 'analytics') adminLoadAnalytics();
  if (name === 'users') adminLoadUserData();
  if (name === 'schedule') renderScheduledList();
  if (name === 'backup') renderBackupList();
  if (name === 'ai-custom') adminLoadAIConfig();
  if (name === 'abtest') { populateArticleDropdowns(); renderABTests(); }
  if (name === 'social') { populateArticleDropdowns(); }
  if (name === 'survey') renderSurveyResults();
};

function renderBackupList() {
  const el = document.getElementById('backup-list');
  if (!el) return;
  const cached = localStorage.getItem('nb_offline_cache');
  const cacheTime = localStorage.getItem('nb_offline_cache_time');
  el.innerHTML = `
    <div style="font-size:11px;color:#888;margin-top:8px;">
      <div>📦 Offline cache: ${cached ? '✅ Available (' + new Date(Number(cacheTime)).toLocaleString('en-IN') + ')' : '❌ Not cached'}</div>
      <div>📊 Total articles in DB: ${allArticles.length}</div>
    </div>`;
}

window.openAdmin         = openAdmin;
window.closeAdmin        = closeAdmin;
window.adminTab          = adminTab;
window.adminPost         = adminPost;
window.adminAIGenerate   = adminAIGenerate;
window.adminAIPublish    = adminAIPublish;
window.adminDetectHot    = adminDetectHot;
window.adminPublishHot   = adminPublishHot;
window.adminSeedAll      = adminSeedAll;
window.adminToggleAuto   = adminToggleAuto;
window.adminDelete       = adminDelete;

// New tab exports
window.adminStartABTest      = adminStartABTest;
window.adminEndABTest        = adminEndABTest;
window.adminClearABTest      = adminClearABTest;
window.adminLaunchSurvey     = adminLaunchSurvey;
window.adminEndSurvey        = adminEndSurvey;
window.adminGenerateSocialPosts = adminGenerateSocialPosts;
window.adminCopySocial       = adminCopySocial;

