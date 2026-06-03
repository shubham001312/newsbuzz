# 🧠 NewsBuzz — AI Memory File

> **Purpose:** This file serves as the persistent memory and knowledge base for AI agents working on the NewsBuzz project.
> **Mandate:** EVERY AI agent MUST read this file at the start of every session and MUST update it after making ANY changes to the codebase.

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 🔄 Agent Instructions — YOU MUST FOLLOW THESE

### Before making any changes:
1. **READ this file** — Understand the project structure, conventions, and recent history.

### After making any changes:
1. **UPDATE this file** — Add your changes to the `## 📋 Changelog` section with date, description, and files touched.
2. **UPDATE `## 🏗️ Code Structure`** if you added/removed/renamed any files.
3. **UPDATE `## 🔧 Configuration Reference`** if you changed any config values.

### Update format:
```markdown
### YYYY-MM-DD: [Brief title of change]
- **What:** [Description of what was done]
- **Files:** [comma-separated list of files changed]
- **Why:** [Reason for the change]
```

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 📋 Changelog

### 2026-06-03: Netlify deployment preparation
- **What:** Cleaned up project folder for drag-and-drop Netlify deployment. Removed node_modules/, documentation files, PDF plan, and empty artifact directories. Created .gitignore and _redirects for SPA routing. Created AI_MEMORY.md as persistent agent memory.
- **Files:** .gitignore (new), _redirects (new), AI_MEMORY.md (new), removed node_modules/, {css,js,assets}/, README.md, README-AI.md, implementation_plan.md, gcp-engine-plan PDF, package-lock.json, vitest.config.js
- **Why:** Make the site deployable by simply dragging the folder to Netlify Drop.

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 🏗️ Project Overview

**NewsBuzz** — AI-powered news platform covering West Bengal & India, with bilingual (English/Bengali) support.

### Architecture

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | Vanilla JS (ES Modules) + CSS | Static PWA hosted on Netlify |
| **Backend** | Firebase Realtime Database | No traditional server; client-side reads/writes |
| **AI Engine** | OpenRouter API (Gemini 2.5 Flash Lite) | Content generation, hot topics, chatbot |
| **Weather** | wttr.in API | 10-day forecasts, weather alerts |
| **Deployment** | Netlify (static, drag-and-drop) | Served from root directory |

### File Tree

```
newsbuzz/
├── .gitignore              # Git exclusions (node_modules, .env, etc.)
├── _redirects              # Netlify SPA redirect: /* -> /index.html 200
├── AI_MEMORY.md            # <- THIS FILE — AI agent persistent memory
├── manifest.json           # PWA manifest (standalone, icons, shortcuts)
├── netlify.toml            # Netlify config (headers, caching, redirects)
├── package.json            # ES module config, vitest dev dependency
├── robots.txt              # SEO — allows all crawlers
├── sitemap.xml             # SEO sitemap
├── sw.js                   # Service Worker (cache-first static, network-first API)
│
├── index.html              # Main app shell (742 lines)
├── about.html              # About Us page (69 lines)
├── privacy.html            # Privacy Policy page (95 lines)
├── offline.html            # Offline fallback page (154 lines)
│
├── css/
│   ├── theme.css           # Design tokens, fonts, colors, dark mode (79 lines)
│   ├── main.css            # Core layout, nav, widgets, skeleton loaders (1613 lines)
│   ├── cards.css           # Article card components & variants (169 lines)
│   └── modal.css           # Article modal + Admin panel styles (468 lines)
│
└── js/
    ├── config.js           # CENTRAL CONFIG — API keys, Firebase, admin code (55 lines)
    ├── firebase.js         # Firebase init, CRUD, visitor counter (138 lines)
    ├── news.js             # CORE ENGINE — loading, rendering, state, SEO, modal (1828 lines)
    ├── openrouter.js       # AI content generation, hot topics, auto-publish (386 lines)
    ├── deepseek.js         # Legacy wrapper — re-exports openrouter.js (3 lines)
    ├── search.js           # Search with AI fallback, pagination (313 lines)
    ├── lang.js             # English/Bengali language toggle (65 lines)
    ├── chat.js             # Floating AI chatbot (143 lines)
    ├── admin.js            # Hidden admin panel — 22+ management tabs (1087 lines)
    │
    └── __tests__/
        ├── helpers.js      # Test utilities
        ├── admin.test.js   # 92 tests
        ├── articles.test.js # 38 tests
        ├── chat.test.js    # 42 tests
        └── pagination.test.js # 17 tests
        # Total: 189 tests
```

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 🧩 Key Modules — Exports & Responsibilities

### js/config.js — Central Configuration
Loaded as a regular `<script>` (not a module) to make CONFIG globally available.
- CONFIG.OPENROUTER_API_KEY, CONFIG.OPENROUTER_MODEL
- CONFIG.FIREBASE (full Firebase config object)
- CONFIG.ADMIN_CODE ("##admin$$1440")
- CONFIG.AUTO_SCAN_INTERVAL, CONFIG.AUTO_PUBLISH_*
- CONFIG.SEED_PER_CATEGORY, CONFIG.MIN_VIRAL_SCORE

### js/news.js — Core Engine (1828 lines)
- State: allArticles[], currentSection, SECTIONS constant
- Rendering: loadAndRender(), renderAll(), renderHero(), renderStrips(), renderTrending()
- Article Modal: openArticle(id), closeArticle()
- Features: initAllFeatures(), setupInfiniteScroll(), updateTicker(), injectArticle()
- Window exports: __openArticle, __showSection, __searchTag, __toggleCardBookmark, __setLang

### js/firebase.js — Firebase Database (138 lines)
- initFirebase() -> window.__db
- saveArticle(), loadArticles(), getArticle(), updateArticle(), deleteArticle()
- articleExists(title), setupVisitorCounter()

### js/openrouter.js — AI Engine (386 lines)
- generateArticle(topic, category, persona)
- generateSearchArticle(query)
- detectHotTopics(categories), seedCategory(category, count)
- startAutoPublish(), stopAutoPublish()

### js/search.js — Search (313 lines)
- initSearch() — local filter -> AI fallback -> admin code trigger
- Paginated results (8/page), highlight matches, bilingual

### js/lang.js — Language Toggle (65 lines)
- initLang(), setLang(lang) — uses data-en/data-bn attributes

### js/chat.js — AI Chatbot (143 lines)
- initChat() — floating FAB, queries OpenRouter with top 15 articles as context

### js/admin.js — Admin Panel (1087 lines, lazy-loaded)
- 22+ tabs: Post, AI Generate, Hot Topics, Auto-Publish, Seed, Manage, Delete, Bulk Delete, Schedule, A/B Test, Surveys, Analytics, AI Config, RSS, Backup/Restore, SEO, Social Posts, User Data, Cache

### sw.js — Service Worker (166 lines)
- Cache: newsbuzz-v1, cache-first for static, network-first for external
- Offline fallback: /offline.html
- Article caching via CACHE_ARTICLES message -> newsbuzz-articles-v1

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 🎨 Design System

- Paper: #f5f0e8 (light) / #1a1a1a (dark)
- Ink: #2c2c2c (light) / #e0e0e0 (dark)
- Accent: #b22222 (Firebrick red)
- Fonts: UnifrakturMaguntia (masthead), Playfair Display (headings), Libre Baskerville (body), Noto Serif Bengali

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 🔧 Configuration Reference

| Variable | File | Purpose |
|----------|------|---------|
| CONFIG.OPENROUTER_API_KEY | config.js | OpenRouter API key |
| CONFIG.ADMIN_CODE | config.js | Secret code to unlock admin panel |
| CONFIG.AUTO_SCAN_INTERVAL | config.js | Auto-publish frequency (ms) |
| window.__db | firebase.js | Firebase database reference |
| window.__lang | lang.js | Current language: 'en' or 'bn' |
| allArticles[] | news.js | Master article array (source of truth) |

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 🧪 Testing

```bash
npm install
npm test          # Run all 189 tests
npm run test:watch
```

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## 🌐 Deployment

**Netlify drop:** Drag the newsbuzz/ folder to app.netlify.com/drop
- netlify.toml: publish root, security headers, caching
- _redirects: SPA routing (/* -> /index.html 200)
- Everything works out of the box

**Post-deploy:**
1. Set CONFIG.OPENROUTER_API_KEY in config.js
2. Configure Firebase project and paste credentials
3. Visit site -> enter admin code in search bar -> seed articles -> start auto-publish

---

### 2026-06-03: NewsBuzz AutoPilot backend created
- **What:** Created a complete autonomous backend server that runs 24/7, auto-discovers trending topics, generates AI articles via OpenRouter, and publishes them to Firebase without supervision. Includes Express server with health/status endpoints, cron-based scheduling, Firebase Admin SDK integration, Docker support for Cloud Run deployment.
- **Files:** backend/ (new directory with 8 files: package.json, Dockerfile, .dockerignore, .env.example, README.md, src/index.js, src/config.js, src/logger.js, src/firebase-admin.js, src/openrouter.js, src/publisher.js)
- **Why:** Enable fully autonomous news publishing that works while the user is offline.

---

## ⚙️ Backend — NewsBuzz AutoPilot

A Node.js backend that runs 24/7 to automatically publish news articles.

| File | Purpose |
|------|---------|
| `src/index.js` | Express server + cron scheduler, health/status/trigger endpoints |
| `src/config.js` | Environment variable config (OpenRouter, Firebase, publishing settings) |
| `src/logger.js` | Structured logging with timestamps |
| `src/firebase-admin.js` | Firebase Admin SDK — read/write articles, dedup checks, stats |
| `src/openrouter.js` | Server-side AI client — detect hot topics, generate bilingual articles, seed categories |
| `src/publisher.js` | Auto-publish engine — runs publish cycles, tracks stats, deduplication |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/status` | Full status with stats |
| `POST` | `/trigger/publish` | Manual publish cycle |
| `POST` | `/trigger/seed` | Seed categories |

### How It Works
1. On startup → connects to Firebase + OpenRouter
2. Every 120 min (configurable) → scans 8 categories for hot topics via AI
3. Checks for duplicates → generates bilingual articles → saves to Firebase
4. Articles appear instantly on the frontend — no manual steps needed

### Deployment
- **Cloud Run:** `docker build` → `gcloud run deploy` (follows Phantom Engine GCP plan)
- **Docker:** `docker run` with `.env` file
- **Railway/Fly.io:** Direct deploy from `backend/` directory

---

## 🔧 Configuration Reference

## ⚠️ Common Pitfalls

- Service worker caching: After updates, increment cache version in sw.js
- CORS: Firebase + OpenRouter are client-side CORS-compatible
- Paths: Both relative 

---

## 🌍 Global Environment Variables

All secrets and config are available as system-wide environment variables.
Any agent or process can access them without needing the .env file.

| Variable | Description |
|----------|-------------|
| OPENROUTER_API_KEY | OpenRouter API key |
| OPENROUTER_MODEL | AI model name |
| ADMIN_CODE | Admin panel access code |
| SITE_NAME | Site name |
| SITE_URL | Netlify site URL |
| FIREBASE_* | Firebase config (env override) |

### Usage

On this machine, these are set system-wide via setx.
Any terminal/agent can access them as standard env vars.
To set on a new machine: copy .env to project root or run setx manually.
