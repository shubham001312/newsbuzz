import admin from 'firebase-admin';
import config from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('FirebaseAdmin');

let db = null;

export function initFirebaseAdmin() {
  if (db) return db;

  try {
    admin.initializeApp({
      credential: admin.credential.cert(config.firebase.serviceAccount),
      databaseURL: config.firebase.databaseURL
    });
    db = admin.database();
    log.success('Firebase Admin initialized');
    return db;
  } catch (err) {
    log.error('Failed to initialize Firebase Admin', err);
    throw err;
  }
}

export function getDb() {
  if (!db) throw new Error('Firebase not initialized. Call initFirebaseAdmin() first.');
  return db;
}

export async function saveArticle(article) {
  const dbRef = getDb().ref('articles');
  const newRef = dbRef.push();
  const id = newRef.key;
  
  const articleData = {
    ...article,
    id,
    timestamp: Date.now(),
    views: 0,
    status: 'published'
  };
  
  await newRef.set(articleData);
  return articleData;
}

export async function loadArticles({ category, max = 50 } = {}) {
  const dbRef = getDb().ref('articles');
  let query = dbRef.orderByChild('timestamp').limitToLast(max);
  
  const snapshot = await query.once('value');
  const articles = [];
  
  snapshot.forEach((child) => {
    articles.push(child.val());
  });
  
  // Reverse to get newest first
  articles.reverse();
  
  if (category) {
    return articles.filter(a => a.category === category);
  }
  return articles;
}

export async function articleExists(title) {
  // Simple fuzzy title check
  const articles = await loadArticles({ max: 100 });
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const article of articles) {
    const articleTitle = (article.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    // Check for high similarity
    if (articleTitle.includes(normalized) || normalized.includes(articleTitle)) {
      return true;
    }
    // Check seed key for AI-generated articles
    if (article._seedKey && normalized.includes(article._seedKey)) {
      return true;
    }
  }
  return false;
}

export async function getArticleCount() {
  const snapshot = await getDb().ref('articles').once('value');
  let count = 0;
  snapshot.forEach(() => count++);
  return count;
}

export async function getArticleCountByCategory() {
  const articles = await loadArticles({ max: 1000 });
  const counts = {};
  for (const a of articles) {
    const cat = a.category || 'uncategorized';
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}
