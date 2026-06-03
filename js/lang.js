// ============================================================
//  js/lang.js  — English / Bengali language toggle
// ============================================================

import { renderAll, updateTicker } from './news.js';

export function initLang() {
  window.__lang = localStorage.getItem('nb_lang') || 'en';
  applyLang();
}

export function setLang(lang) {
  window.__lang = lang;
  localStorage.setItem('nb_lang', lang);
  applyLang();
  renderAll();
  updateTicker();
}

function applyLang() {
  const isEn = window.__lang === 'en';

  // Toggle buttons
  document.getElementById('btn-en')?.classList.toggle('active', isEn);
  document.getElementById('btn-bn')?.classList.toggle('active', !isEn);

  // Strings
  const strings = {
    '#site-tagline'          : isEn ? 'Truth · Speed · Integrity'                        : 'সত্য · গতি · সততা',
    '#site-subtitle'         : isEn ? "West Bengal & India's Trusted News Source"         : 'পশ্চিমবঙ্গ ও ভারতের বিশ্বস্ত সংবাদ উৎস',
    '#footer-tagline'        : isEn ? 'Bringing you truth from West Bengal and beyond.'   : 'পশ্চিমবঙ্গ থেকে সত্য সংবাদ আপনার কাছে।',
    '#sidebar-trending'      : null,
    '#infinite-header'       : null,
    '#search-input'          : null,
  };

  Object.entries(strings).forEach(([sel, val]) => {
    const el = document.querySelector(sel);
    if (el) {
      if (val) {
        el.textContent = val;
      } else if (el.dataset.en && el.dataset.bn) {
        el.textContent = isEn ? el.dataset.en : el.dataset.bn;
      }
    }
  });

  const si = document.getElementById('search-input');
  if (si) si.placeholder = isEn ? 'Search news…' : 'সংবাদ খুঁজুন…';

  // Nav labels
  document.querySelectorAll('#main-nav a[data-en]').forEach(a => {
    a.textContent = isEn ? a.dataset.en : (a.dataset.bn || a.dataset.en);
  });

  // Translated data attributes
  document.querySelectorAll('[data-en][data-bn]').forEach(el => {
    if (el.id && ['site-tagline','site-subtitle','footer-tagline','sidebar-trending','infinite-header'].includes(el.id)) return;
    if (el.closest('#main-nav')) return;
    el.textContent = isEn ? el.dataset.en : el.dataset.bn;
  });
}

// Expose for inline onclick
window.__setLang = setLang;
