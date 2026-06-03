import express from 'express';
import config from './config.js';
import { initFirebaseAdmin, getArticleCount, getArticleCountByCategory } from './firebase-admin.js';
import { runPublishCycle, runSeedCycle, getStats } from './publisher.js';
import { createLogger } from './logger.js';

const log = createLogger('Server');
const app = express();
app.use(express.json());
// Simple API key auth for trigger endpoints
function requireAuth(req, res, next) {
  var key = req.headers['x-api-key'] || req.query.key;
  if (!key || key !== config.openrouter.apiKey) {
    return res.status(401).json({ error: 'Unauthorized - provide X-API-Key header' });
  }
  next();
}


// Track server start and schedule info
let serverStartTime = Date.now();
let nextRunTime = null;
let cronInterval = null;

// ============================================================
// Initialization
// ============================================================

async function initialize() {
  log.info('=== NewsBuzz AutoPilot Starting ===');
  
  // Initialize Firebase
  initFirebaseAdmin();
  
  // Start cron for auto-publishing
  startCron();
  
  log.success('Server initialized successfully');
  log.info(`Publish interval: ${config.publishing.intervalMinutes} minutes`);
  log.info(`Min viral score: ${config.publishing.minViralScore}`);
  log.info(`Seed per category: ${config.publishing.seedPerCategory}`);
}

function startCron() {
  const intervalMs = config.publishing.intervalMinutes * 60 * 1000;
  
  // Run first cycle after 30 seconds (to let the server warm up)
  const firstRunDelay = 30000;
  
  log.info(`First publish cycle in ${firstRunDelay / 1000}s, then every ${config.publishing.intervalMinutes}min`);
  
  setTimeout(async () => {
    try {
      await runPublishCycle();
    } catch (err) {
      log.error('First publish cycle failed', err);
    }
    
    // Schedule subsequent runs
    nextRunTime = Date.now() + intervalMs;
    cronInterval = setInterval(async () => {
      try {
        nextRunTime = Date.now() + intervalMs;
        await runPublishCycle();
      } catch (err) {
        log.error('Scheduled publish cycle failed', err);
      }
    }, intervalMs);
  }, firstRunDelay);
}

// ============================================================
// API Routes
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    version: '1.0.0'
  });
});

// Status dashboard
app.get('/status', async (req, res) => {
  const stats = getStats();
  const articleCount = await getArticleCount();
  const categoryCounts = await getArticleCountByCategory();
  
  res.json({
    server: {
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      startedAt: new Date(serverStartTime).toISOString()
    },
    schedule: {
      intervalMinutes: config.publishing.intervalMinutes,
      nextRunAt: nextRunTime ? new Date(nextRunTime).toISOString() : null,
      nextRunIn: nextRunTime ? Math.max(0, Math.floor((nextRunTime - Date.now()) / 1000)) : null
    },
    publishing: {
      ...stats,
      isRunning: stats.isRunning
    },
    database: {
      totalArticles: articleCount,
      articlesByCategory: categoryCounts,
      categoriesTracked: Object.keys(categoryCounts).length
    }
  });
});

// Manually trigger a publish cycle
app.post('/trigger/publish', requireAuth, async (req, res) => {
  log.info('Manual publish trigger received');
  
  try {
    const result = await runPublishCycle();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger a seed cycle (fills categories with initial articles)
app.post('/trigger/seed', requireAuth, async (req, res) => {
  log.info('Manual seed trigger received');
  
  try {
    const result = await runSeedCycle();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get logs (last N log entries from stdout)
app.get('/logs', (req, res) => {
  res.json({
    message: 'Logs are written to stdout. Check your Cloud Run logs or docker logs.'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'NewsBuzz AutoPilot',
    version: '1.0.0',
    description: 'Autonomous news publishing engine for NewsBuzz',
    endpoints: {
      health: '/health',
      status: '/status',
      triggerPublish: 'POST /trigger/publish',
      triggerSeed: 'POST /trigger/seed',
      logs: '/logs'
    }
  });
});

// ============================================================
// Start Server
// ============================================================

app.listen(config.port, () => {
  log.success(`NewsBuzz AutoPilot running on port ${config.port}`);
  initialize().catch(err => {
    log.error('Failed to initialize', err);
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down...');
  if (cronInterval) clearInterval(cronInterval);
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down...');
  if (cronInterval) clearInterval(cronInterval);
  process.exit(0);
});
