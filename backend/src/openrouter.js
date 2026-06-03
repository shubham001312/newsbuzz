import config from "./config.js";
import { createLogger } from "./logger.js";

const log = createLogger("OpenRouter");

const CATEGORIES = [
  { id: "wb", en: "West Bengal", bn: "পশ্চিমবঙ্গ" },
  { id: "national", en: "National", bn: "জাতীয়" },
  { id: "politics", en: "Politics", bn: "রাজনীতি" },
  { id: "crime", en: "Crime", bn: "অপরাধ" },
  { id: "education", en: "Education", bn: "শিক্ষা" },
  { id: "sports", en: "Sports", bn: "ক্রীড়া" },
  { id: "weather", en: "Weather", bn: "আবহাওয়া" },
  { id: "govt", en: "Government Schemes", bn: "সরকারি প্রকল্প" }
];

const CATEGORY_TOPICS = {
  wb: "West Bengal politics, Kolkata news, Bengal economy",
  national: "Indian politics, Central government schemes",
  politics: "Bengal political drama, TMC vs BJP vs Left",
  crime: "Kolkata crime, Bengal crime statistics",
  education: "WB education news, School reforms",
  sports: "Bengal cricket, Indian football, Kolkata sports",
  weather: "Bengal weather, Kolkata temperature",
  govt: "Central schemes Bengal, PM Modi schemes"
};

export function getCategories() {
  return CATEGORIES;
}
async function callOpenRouter(messages, temperature) {
  if (!temperature) temperature = 0.7;
  var maxRetries = 3;
  var lastError = null;
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var controller = new AbortController();
      setTimeout(function() { controller.abort(); }, 60000);
      var response = await fetch(config.openrouter.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + config.openrouter.apiKey,
          "HTTP-Referer": config.openrouter.siteUrl,
          "X-Title": config.openrouter.appName
        },
        body: JSON.stringify({ model: config.openrouter.model, messages: messages, temperature: temperature }),
        signal: controller.signal
      });
      if (response.status === 429) {
        var retryAfter = parseInt(response.headers.get("Retry-After") || "10", 10);
        log.warn("Rate limited (429), retrying after " + retryAfter + "s");
        await sleep(retryAfter * 1000);
        continue;
      }
      if (!response.ok) {
        var errText = await response.text();
        throw new Error("API error " + response.status + ": " + errText);
      }
      var data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(Math.min(1000 * Math.pow(2, attempt), 30000));
      }
    }
  }
  throw new Error("API failed after " + maxRetries + " retries: " + (lastError ? lastError.message : "unknown"));
}
function parseJSON(text) {
  var code = String.fromCharCode(96,96,96);
  var r1 = new RegExp(code + "(?:json)?s*", "gi");
  var r2 = new RegExp("s*" + code, "g");
  var cleaned = text.replace(r1, "").replace(r2, "").trim();
  var start = cleaned.indexOf("{");
  var end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  try { return JSON.parse(cleaned); }
  catch (e) {
    log.error("JSON parse failed", text);
    throw new Error("Failed to parse AI response");
  }
}

async function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}
export async function detectHotTopics(categoryId) {
  var category = CATEGORIES.find(function(c) { return c.id === categoryId; });
  if (!category) throw new Error("Unknown category: " + categoryId);
  var minScore = config.publishing.minViralScore;
  var seedQuery = CATEGORY_TOPICS[categoryId];
  var prompt = "You are a news editor. Current date: June 2026.";
  prompt += " Find 5 trending news for category " + category.en;
  prompt += " based on: " + seedQuery;
  prompt += " Return JSON {topics: [{topic, viralScore}]}.";
  prompt += " Only viralScore >= " + minScore + ". Return exactly 5.";
  var msg = [{ role: "system", content: prompt },
    { role: "user", content: "Find 5 trending for " + category.en }];
  var res = await callOpenRouter(msg, 0.8);
  var parsed = parseJSON(res);
  if (Array.isArray(parsed)) return parsed.filter(function(t) { return t.viralScore >= minScore; });
  if (parsed && Array.isArray(parsed.topics)) return parsed.topics.filter(function(t) { return t.viralScore >= minScore; });
  if (parsed && Array.isArray(parsed.results)) return parsed.results.filter(function(t) { return t.viralScore >= minScore; });
  log.warn("Unexpected format", parsed);
  return [];
}
export async function generateArticle(topic, categoryId) {
  var category = CATEGORIES.find(function(c) { return c.id === categoryId; });
  if (!category) throw new Error("Unknown category: " + categoryId);
  var p = "You are a journalist for NewsBuzz. CURRENT YEAR IS 2026.";
  p += " Write in PTI/ANI style. Return ONLY JSON with: title, titleBn, description,";
  p += " descriptionBn, content, contentBn, tags, imagePrompt, viralScore, sources.";
  p += " Content: 500-800 words, bilingual EN/BN. Include source citations.";
  var msg = [{ role: "system", content: p },
    { role: "user", content: "Write article about: " + topic + " for category: " + category.en }];
  var res = await callOpenRouter(msg, 0.7);
  var article = parseJSON(res);
  return {
    ...article,
    _seedKey: topic.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50),
    category: categoryId,
    categoryLabel: category.en,
    categoryLabelBn: category.bn,
    source: "NewsBuzz AutoPilot"
  };
}

export async function seedCategory(categoryId, count) {
  if (!count) count = 20;
  var results = [];
  for (var i = 0; i < count; i++) {
    try {
      log.info("Seeding " + (i+1) + "/" + count + " for " + categoryId);
      var article = await generateArticle(categoryId + " update " + (i+1), categoryId);
      results.push(article);
      await sleep(1500);
    } catch (err) { log.error("Seed failed", err); }
  }
  return results;
}