// ============================================================
// NewsBuzz - Global Configuration
// ============================================================
// Order of precedence:
//   1. Environment variables (system-wide or .env file)
//   2. Hardcoded defaults below
// This way any agent or process can override via env vars.

(function() {
  'use strict';

  function env(key, fallback) {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // Check for global/window env (browser)
    if (typeof window !== 'undefined' && window.__env && window.__env[key]) {
      return window.__env[key];
    }
    return fallback;
  }

  window.CONFIG = {
    // OpenRouter AI
    OPENROUTER_API_KEY: env('OPENROUTER_API_KEY', 'sk-or-v1-your-key-here'),
    OPENROUTER_MODEL: env('OPENROUTER_MODEL', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'),
    OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
    OPENROUTER_SITE_URL: env('SITE_URL', 'https://newsbuzz-independent-one.netlify.app'),
    OPENROUTER_APP_NAME: 'NewsBuzz',

    // Firebase
    FIREBASE: {
      apiKey: env('FIREBASE_API_KEY', 'AIzaSyAS0RsoqWJDLuFpslIjMPG-3cvtevCD11M'),
      authDomain: env('FIREBASE_AUTH_DOMAIN', 'newsbuzz-80ed3.firebaseapp.com'),
      databaseURL: env('FIREBASE_DATABASE_URL', 'https://newsbuzz-80ed3-default-rtdb.asia-southeast1.firebasedatabase.app'),
      projectId: env('FIREBASE_PROJECT_ID', 'newsbuzz-80ed3'),
      storageBucket: env('FIREBASE_STORAGE_BUCKET', 'newsbuzz-80ed3.firebasestorage.app'),
      messagingSenderId: env('FIREBASE_MESSAGING_SENDER_ID', '894047453791'),
      appId: env('FIREBASE_APP_ID', '1:894047453791:web:3fbe960f68fe5d6a1c11ea'),
      measurementId: env('FIREBASE_MEASUREMENT_ID', 'G-9RF7LWXM0Z')
    },

    // Admin
    ADMIN_CODE: env('ADMIN_CODE', '##admin$$1440'),

    // Site
    SITE_NAME: env('SITE_NAME', 'NewsBuzz'),
    SITE_TAGLINE: env('SITE_TAGLINE', 'Truth - Speed - Integrity'),
    SITE_TAGLINE_BN: env('SITE_TAGLINE_BN', '\u09b8\u09a4\u09cd\u09af \u00b7 \u0997\u09a4\u09bf \u00b7 \u09b8\u09a4\u09a4\u09be'),
    SITE_URL: env('SITE_URL', 'https://newsbuzz-independent-one.netlify.app'),

    // Auto-Publish
    AUTO_SCAN_INTERVAL: parseInt(env('AUTO_SCAN_INTERVAL', '7200000'), 10),
    AUTO_PUBLISH_REMEMBER: env('AUTO_PUBLISH_REMEMBER', 'true') === 'true',
    AUTO_PUBLISH_AUTOSTART: env('AUTO_PUBLISH_AUTOSTART', 'true') === 'true',
    SEED_PER_CATEGORY: parseInt(env('SEED_PER_CATEGORY', '20'), 10),
    MIN_VIRAL_SCORE: parseInt(env('MIN_VIRAL_SCORE', '65'), 10)
  };

  // Expose env vars globally so any agent/script can access them
  window.__env = {
    OPENROUTER_API_KEY: window.CONFIG.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: window.CONFIG.OPENROUTER_MODEL,
    FIREBASE_DATABASE_URL: window.CONFIG.FIREBASE.databaseURL,
    FIREBASE_PROJECT_ID: window.CONFIG.FIREBASE.projectId,
    ADMIN_CODE: window.CONFIG.ADMIN_CODE,
    SITE_URL: window.CONFIG.SITE_URL
  };

  console.log('[Config] NewsBuzz configuration loaded');
})();
