import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const p = resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf-8'));
    }
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {}
  }
  return null;
}

const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    siteUrl: process.env.SITE_URL || 'https://newsbuzz-independent.netlify.app',
    appName: 'NewsBuzz AutoPilot'
  },

  firebase: {
    serviceAccount: loadServiceAccount(),
    databaseURL: process.env.FIREBASE_DATABASE_URL || ''
  },

  publishing: {
    intervalMinutes: parseInt(process.env.PUBLISH_INTERVAL_MINUTES || '120', 10),
    minViralScore: parseInt(process.env.MIN_VIRAL_SCORE || '65', 10),
    seedPerCategory: parseInt(process.env.SEED_PER_CATEGORY || '20', 10)
  }
};

// Validate required config
const missing = [];
if (!config.openrouter.apiKey) missing.push('OPENROUTER_API_KEY');
if (!config.firebase.serviceAccount) missing.push('FIREBASE_SERVICE_ACCOUNT');
if (!config.firebase.databaseURL) missing.push('FIREBASE_DATABASE_URL');

if (missing.length > 0) {
  console.error('Missing required configuration:', missing.join(', '));
  console.error('Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

export default config;
