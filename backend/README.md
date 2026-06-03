# NewsBuzz AutoPilot — Autonomous Backend

A self-running backend server that automatically discovers trending topics, generates AI-powered news articles, and publishes them to your NewsBuzz Firebase database — 24/7, without any supervision.

## Architecture

```
backend/
├── src/
│   ├── index.js         # Express server + cron scheduler
│   ├── config.js        # Environment configuration
│   ├── logger.js        # Structured logging
│   ├── firebase-admin.js # Firebase Admin SDK operations
│   ├── openrouter.js    # OpenRouter AI client
│   └── publisher.js     # Auto-publish engine
├── Dockerfile           # For Cloud Run deployment
├── package.json
├── .env.example         # Template for credentials
└── README.md
```

## How It Works

1. **On startup** — Connects to Firebase and the OpenRouter API
2. **Every 2 hours (configurable)** — Runs a publish cycle:
   - Scans all 8 news categories (WB, National, Politics, Crime, etc.)
   - Uses AI to detect trending hot topics per category
   - Checks for duplicates against existing articles
   - Generates full bilingual (English/Bengali) articles
   - Saves them to Firebase with SEO metadata
3. **Auto-publishes** — Articles appear instantly on your NewsBuzz frontend

## Deployment Options

### Option 1: GCP Cloud Run (Recommended)

1. Get a Firebase service account key:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate New Private Key" → save as `service-account.json`

2. Build and deploy:

```bash
# Set your project
export PROJECT_ID=newsbuzz-80ed3
export SERVICE_NAME=newsbuzz-autopilot

# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region asia-southeast1 \
  --memory 512Mi \
  --min-instances 1 \
  --max-instances 1 \
  --concurrency 1 \
  --timeout 3600 \
  --set-env-vars "OPENROUTER_API_KEY=sk-or-v1-..." \
  --set-env-vars "FIREBASE_DATABASE_URL=https://newsbuzz-80ed3-default-rtdb.asia-southeast1.firebasedatabase.app" \
  --set-secrets "FIREBASE_SERVICE_ACCOUNT_JSON=firebase-service-account:latest"
```

### Option 2: Docker (Any VPS)

```bash
# Build
docker build -t newsbuzz-autopilot .

# Run with .env file
docker run -d \
  --name newsbuzz-autopilot \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env \
  newsbuzz-autopilot
```

### Option 3: Railway / Fly.io

Deploy directly from the `backend/` directory. Set the environment variables from `.env.example` in the platform dashboard.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `FIREBASE_DATABASE_URL` | Yes | Firebase Realtime Database URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes* | Firebase Admin private key JSON |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | No | Path to service-account.json file |
| `PUBLISH_INTERVAL_MINUTES` | No | Cycle interval (default: 120) |
| `MIN_VIRAL_SCORE` | No | Min score to publish (default: 65) |
| `SEED_PER_CATEGORY` | No | Articles per category on seed (default: 20) |
| `PORT` | No | Server port (default: 8080) |
| `SITE_URL` | No | Your site URL for OpenRouter headers |

*Either `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH` must be set.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info and available endpoints |
| `GET` | `/health` | Health check for Cloud Run |
| `GET` | `/status` | Full status: uptime, schedule, stats, database counts |
| `POST` | `/trigger/publish` | Manually trigger a publish cycle |
| `POST` | `/trigger/seed` | Seed categories with initial articles |

## Local Development

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev    # Auto-restarts on changes
```

Visit `http://localhost:8080` to see the API.
