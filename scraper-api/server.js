const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Add stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.SCRAPER_API_KEY || "";

// Chrome executable path
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

// Browser instance (reused for performance)
let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: CHROME_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1920,1080",
      ],
    });
  }
  return browser;
}

// Random delay to appear more human
function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Rotate user agents
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main scraping endpoint
app.post("/scrape", async (req, res) => {
  if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { url, waitFor = 3000, timeout = 30000 } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let page = null;

  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(getRandomUserAgent());

    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    });

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resourceType = request.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to URL
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: timeout,
    });

    // Random delay to appear more human
    await new Promise((resolve) => setTimeout(resolve, randomDelay(1000, 2000)));

    // Wait additional time for dynamic content
    if (waitFor > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitFor));
    }

    // Get the HTML content
    const html = await page.content();

    res.json({
      success: true,
      html: html,
      url: url,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scraping error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      url: url,
    });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Scraper API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
