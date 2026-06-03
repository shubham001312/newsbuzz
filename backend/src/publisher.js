import { getCategories, detectHotTopics, generateArticle, seedCategory } from './openrouter.js';
import { saveArticle, articleExists, getArticleCount, getArticleCountByCategory } from './firebase-admin.js';
import config from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('Publisher');

let publishStats = {
  totalCycles: 0,
  totalArticlesPublished: 0,
  lastRun: null,
  lastRunDuration: null,
  lastError: null,
  articlesByCategory: {},
  isRunning: false
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runPublishCycle() {
  if (publishStats.isRunning) {
    log.warn('Publish cycle already in progress, skipping');
    return { skipped: true, message: 'Already running' };
  }

  publishStats.isRunning = true;
  const startTime = Date.now();
  const results = { categoriesScanned: 0, articlesPublished: 0, errors: [] };

  log.info('=== Starting auto-publish cycle ===');

  try {
    const categories = getCategories();
    
    for (const category of categories) {
      try {
        log.info(`Scanning category: ${category.en} (${category.id})`);
        
        // Detect hot topics for this category
        const hotTopics = await detectHotTopics(category.id);
        log.info(`Found ${hotTopics.length} hot topics for ${category.id}`);
        
        for (const topic of hotTopics) {
          try {
            // Check if article already exists (dedup)
            const exists = await articleExists(topic.topic);
            if (exists) {
              log.info(`Skipping existing topic: ${topic.topic}`);
              continue;
            }

            log.info(`Generating article for: ${topic.topic}`);
            const article = await generateArticle(topic.topic, category.id);
            
            // Save to Firebase
            const saved = await saveArticle(article);
            results.articlesPublished++;
            publishStats.totalArticlesPublished++;
            
            // Track by category
            publishStats.articlesByCategory[category.id] = (publishStats.articlesByCategory[category.id] || 0) + 1;
            
            log.success(`Published: ${article.title?.slice(0, 80)}...`, {
              category: category.id,
              viralScore: topic.viralScore
            });
            
            // Rate limiting between articles
            await sleep(2000);
          } catch (err) {
            log.error(`Failed to process hot topic: ${topic.topic}`, err);
            results.errors.push({ topic: topic.topic, error: err.message });
          }
        }
        
        results.categoriesScanned++;
      } catch (err) {
        log.error(`Failed to scan category: ${category.id}`, err);
        results.errors.push({ category: category.id, error: err.message });
      }
    }

    const duration = Date.now() - startTime;
    publishStats.totalCycles++;
    publishStats.lastRun = new Date().toISOString();
    publishStats.lastRunDuration = duration;
    publishStats.isRunning = false;

    log.success(`=== Cycle complete: ${results.articlesPublished} articles published in ${(duration / 1000).toFixed(1)}s ===`);
    
    return {
      skipped: false,
      categoriesScanned: results.categoriesScanned,
      articlesPublished: results.articlesPublished,
      errors: results.errors.length,
      durationMs: duration
    };
  } catch (err) {
    publishStats.lastError = err.message;
    publishStats.isRunning = false;
    log.error('Fatal publish cycle error', err);
    throw err;
  }
}

export async function runSeedCycle() {
  if (publishStats.isRunning) {
    return { skipped: true, message: 'Publisher busy' };
  }

  publishStats.isRunning = true;
  const startTime = Date.now();
  const results = { categoriesSeeded: 0, articlesSeeded: 0, errors: [] };

  log.info('=== Starting seed cycle ===');

  try {
    const categories = getCategories();
    
    var allCounts = await getArticleCountByCategory();
    for (const category of categories) {
      try {
        // Check current article count for this category
        const counts = allCounts;
        const currentCount = counts[category.id] || 0;
        
        if (currentCount >= config.publishing.seedPerCategory) {
          log.info(`Category ${category.id} already has ${currentCount} articles, skipping seed`);
          continue;
        }
        
        const needed = config.publishing.seedPerCategory - currentCount;
        log.info(`Seeding ${needed} articles for ${category.id} (has ${currentCount})`);
        
        const articles = await seedCategory(category.id, needed);
        
        for (const article of articles) {
          try {
            await saveArticle(article);
            results.articlesSeeded++;
            publishStats.totalArticlesPublished++;
            await sleep(1000);
          } catch (err) {
            log.error(`Failed to save seeded article for ${category.id}`, err);
            results.errors.push({ category: category.id, error: err.message });
          }
        }
        
        results.categoriesSeeded++;
      } catch (err) {
        log.error(`Failed to seed category: ${category.id}`, err);
        results.errors.push({ category: category.id, error: err.message });
      }
    }

    publishStats.isRunning = false;
    log.success(`=== Seed complete: ${results.articlesSeeded} articles seeded ===`);
    
    return results;
  } catch (err) {
    publishStats.lastError = err.message;
    publishStats.isRunning = false;
    log.error('Fatal seed cycle error', err);
    throw err;
  }
}

export function getStats() {
  return { ...publishStats };
}
