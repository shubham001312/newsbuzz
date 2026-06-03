// ============================================================
// js/config.js - THE ONLY FILE YOU NEED TO EDIT
// Change your OpenRouter API key, model, and Firebase config here.
// Everything else in the project reads from this file.
// ============================================================

const CONFIG = {

  // --- OPENROUTER API ---------------------------------------
  // Get your key from: https://openrouter.ai/keys
  OPENROUTER_API_KEY : 'sk-or-v1-your-key-here',
  OPENROUTER_MODEL   : 'google/gemini-2.5-flash-lite',
  OPENROUTER_URL     : 'https://openrouter.ai/api/v1/chat/completions',
  OPENROUTER_SITE_URL: 'https://newsbuzz-independent.netlify.app',
  OPENROUTER_APP_NAME: 'NewsBuzz',

  // --- FIREBASE ---------------------------------------------
  // Get this from: Firebase Console -> Project Settings -> Your Apps
  FIREBASE: {
    apiKey: "AIzaSyAS0RsoqWJDLuFpslIjMPG-3cvtevCD11M",
    authDomain: "newsbuzz-80ed3.firebaseapp.com",
    databaseURL: "https://newsbuzz-80ed3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "newsbuzz-80ed3",
    storageBucket: "newsbuzz-80ed3.firebasestorage.app",
    messagingSenderId: "894047453791",
    appId: "1:894047453791:web:3fbe960f68fe5d6a1c11ea",
    measurementId: "G-9RF7LWXM0Z"
  },

  // --- ADMIN ------------------------------------------------
  // Type this in the search bar and press Enter to open admin panel.
  ADMIN_CODE : '##admin$$1440',

  // --- SITE -------------------------------------------------
  SITE_NAME    : 'NewsBuzz',
  SITE_TAGLINE : 'Truth - Speed - Integrity',
  SITE_TAGLINE_BN: 'সত্য · গতি · সততা',

  // --- AUTO-PUBLISH SETTINGS -------------------------------
  // How often OpenRouter auto-scans for hot news (milliseconds).
  AUTO_SCAN_INTERVAL : 2 * 60 * 60 * 1000, // every 2 hours

  // Auto-publish resumes for the admin browser after you start it once.
  AUTO_PUBLISH_REMEMBER : true,

  // Starts browser-based auto-publish on page load. For true 24/7 background jobs,
  // move this to a Netlify Scheduled Function.
  AUTO_PUBLISH_AUTOSTART : true,

  // Articles to seed per category on first load.
  SEED_PER_CATEGORY  : 20,

  // Minimum "viral score" (0-100) for auto-publish.
  MIN_VIRAL_SCORE    : 65,
};
