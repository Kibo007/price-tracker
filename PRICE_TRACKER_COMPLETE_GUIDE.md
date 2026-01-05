# Price Tracker - Complete Tech Stack & n8n Workflow

Thanks for your interest! Here's everything you need to understand and replicate this price tracking system.

---

## The Problem I Solved

I wanted to buy products at specific prices but:
- Manually checking daily was tedious
- Price tracking services were expensive or limited
- Most tools don't work on all e-commerce sites

So I built a system that works with **any website** and notifies me automatically.

**Live Demo:** https://n8n-kappa-henna.vercel.app/

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User adds product URL + target price                          │
│                    ↓                                             │
│   Next.js App (Vercel) → PostgreSQL (Railway)                   │
│                    ↓                                             │
│   Webhook triggers n8n workflow                                  │
│                    ↓                                             │
│   n8n fetches page HTML:                                        │
│   ├── Amazon → Browserless.io (cloud browser)                   │
│   └── Other sites → Custom Scraper API (Railway)                │
│                    ↓                                             │
│   GPT-4o-mini extracts price from HTML                          │
│                    ↓                                             │
│   Price ≤ Target? → Send email notification                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 15 + React 19 | App Router, Server Components |
| Styling | Tailwind CSS v4 + shadcn/ui | Rapid development, accessible |
| Auth | NextAuth.js v5 | Google OAuth + credentials |
| Database | PostgreSQL + Prisma | Type-safe, reliable |
| Automation | n8n (self-hosted) | Visual workflows, easy debugging |
| Scraping | Puppeteer + Stealth | Anti-bot detection bypass |
| AI | GPT-4o-mini | Accurate price extraction |
| Email | Resend | Developer-friendly API |
| Hosting | Vercel + Railway | Cost-effective, scalable |

---

## Frontend Stack Details

### Next.js 15 + React 19
- **Server Actions** for form submissions
- **Server Components** reduce client-side JavaScript
- **Built-in API routes** for backend logic

### Tailwind CSS v4
- New CSS-first configuration
- Smaller bundle size than v3

### shadcn/ui + Radix
- Not a component library - actual code you own
- Full control over styling
- Built on Radix primitives (accessibility handled)

### NextAuth.js v5 (Auth.js)
- Google OAuth (one-click signup)
- Email/Password with bcrypt hashing
- JWT sessions
- Prisma adapter for database integration

---

## Backend Stack

### PostgreSQL Schema
```sql
users
├── id, email, name, password (hashed)
└── OAuth tokens via accounts table

tracked_products
├── userId (who owns this)
├── url (product link)
├── targetPrice (user's desired price)
├── currentPrice (last checked)
├── notified (prevents spam - one alert per drop)
└── isActive (pause without deleting)

price_history
├── productId, price, checkedAt
└── Enables future price charts
```

**Key Design Decision:** The `notified` boolean flag ensures users get ONE email per price drop, not repeated alerts.

### Prisma ORM
```typescript
// Example: Get user's products
const products = await prisma.trackedProduct.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' }
})
```

---

## The Automation Layer (n8n)

### Why n8n?
- Visual debugging (see exactly where it fails)
- Easy to modify without redeploying
- Built-in integrations (PostgreSQL, HTTP, Email)
- Non-technical people can understand the flow

### Workflow Logic
```
Trigger (every 5 min OR webhook)
       ↓
Get active products from DB
       ↓
For each product:
   ↓
Is it Amazon?
├── Yes: Use Browserless.io
└── No: Use custom scraper API
       ↓
Send HTML to GPT-4o-mini
       ↓
Parse price from AI response
       ↓
If price ≤ target AND not yet notified:
├── Send email via Resend
└── Mark as notified in DB
       ↓
Log price to history table
```

---

## The Scraping Challenge

### Problem: Modern e-commerce sites block bots

**Detection methods:**
- User-agent checking
- JavaScript fingerprinting
- Request pattern analysis
- CAPTCHAs

### Solution 1: Browserless.io (for Amazon)
Amazon is aggressive with bot detection. Browserless provides:
- Real Chrome browsers in the cloud
- Residential IP rotation
- Built-in stealth measures

### Solution 2: Custom Scraper API (for other sites)
Self-hosted Puppeteer-based scraper with anti-detection:

```javascript
// Stealth plugin
puppeteer.use(StealthPlugin())

// Random user agents (5 variations)
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120...',
]

// Block unnecessary resources
await page.setRequestInterception(true)
page.on('request', (req) => {
  if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
    req.abort()
  } else {
    req.continue()
  }
})

// Random delays (1-3 seconds)
await delay(1000 + Math.random() * 2000)
```

---

## AI Price Extraction

### Why AI instead of regex?

E-commerce HTML is chaotic:
- Unit prices vs total prices
- Shipping costs mixed in
- "Was $99, now $79" formatting
- Different currencies
- Bundle deals

**Regex approach:** Breaks constantly, needs maintenance per site.
**AI approach:** Reads HTML like a human would.

### GPT-4o-mini Implementation
```javascript
// First: Extract price hint from HTML patterns
const priceHint = extractPriceFromHTML(html) // "79.99"

// Then: Send to GPT with context
const prompt = `
Extract the main product price from this HTML.
HINT: The price appears to be around ${priceHint}.

Return JSON: {
  "price": number,
  "currency": "EUR" | "USD" | etc,
  "productName": string,
  "inStock": boolean
}
`
```

**Why GPT-4o-mini?**
- 10x cheaper than GPT-4
- Fast enough for real-time use
- ~$0.001 per price check

---

## Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     VERCEL      │     │    RAILWAY      │     │  BROWSERLESS    │
│                 │     │                 │     │                 │
│  Next.js App    │────▶│  PostgreSQL     │     │  Cloud Chrome   │
│  (Frontend +    │     │  n8n Instance   │────▶│  (Amazon only)  │
│   API Routes)   │     │  Scraper API    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Vercel:** Perfect for Next.js, free tier generous
**Railway:** Persistent services, Docker support, ~$5/month
**Browserless.io:** Pay-per-use, handles Amazon complexity

---

## Cost Breakdown (Monthly)

| Service | Cost |
|---------|------|
| Vercel | $0 (free tier) |
| Railway (Postgres + n8n + Scraper) | ~$5 |
| Browserless.io | ~$2-5 (usage based) |
| OpenAI API | ~$1-2 |
| Resend | $0 (free tier) |
| **Total** | **~$8-12/month** |

---

## n8n Workflow (Import Ready)

Copy the JSON below and import it into your n8n instance:
**Settings → Import from File → Paste JSON**

### Required Environment Variables
Before using this workflow, set these in n8n:
- `BROWSERLESS_TOKEN` - Your Browserless.io API token
- `SCRAPER_API_URL` - URL of your Railway scraper (e.g., `https://your-scraper.railway.app`)
- `SCRAPER_API_KEY` - API key for your scraper (optional)

### Required Credentials in n8n
- PostgreSQL connection (for your Railway database)
- HTTP Header Auth for OpenAI (with your API key)
- HTTP Header Auth for Resend (with your API key)

```json
{
  "name": "Price Tracker - Check Prices",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "id": "schedule-trigger",
      "name": "Schedule Trigger (5min)",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, -100]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "check-price",
        "responseMode": "onReceived",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Webhook (New Product)",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 100],
      "webhookId": "check-price-webhook"
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT id, url, \"productName\", \"currentPrice\", \"targetPrice\", email, whatsapp FROM tracked_products WHERE \"isActive\" = true AND notified = false",
        "options": {}
      },
      "id": "get-products",
      "name": "Get Active Products",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [220, 0]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": false,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-amazon",
              "leftValue": "={{ $json.url }}",
              "rightValue": "amazon",
              "operator": {
                "type": "string",
                "operation": "contains"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "check-amazon",
      "name": "Is Amazon URL?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [440, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://chrome.browserless.io/content?token={{ $env.BROWSERLESS_TOKEN }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"url\": \"{{ $json.url }}\",\n  \"gotoOptions\": {\n    \"waitUntil\": \"networkidle2\",\n    \"timeout\": 30000\n  },\n  \"waitFor\": 5000\n}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "text"
            }
          },
          "timeout": 60000
        }
      },
      "id": "fetch-amazon",
      "name": "Fetch Amazon (Browserless)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [660, -100]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.SCRAPER_API_URL }}/scrape",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "x-api-key",
              "value": "={{ $env.SCRAPER_API_KEY }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"url\": \"{{ $json.url }}\",\n  \"waitFor\": 3000,\n  \"timeout\": 30000\n}",
        "options": {
          "timeout": 60000
        }
      },
      "id": "fetch-other",
      "name": "Fetch Other (Railway)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [660, 100]
    },
    {
      "parameters": {
        "jsCode": "const productData = $('Get Active Products').item.json;\nconst response = $input.item.json;\nconst html = typeof response === 'string' ? response : (response.html || response.data || response.body || '');\n\nlet extractedPrice = null;\n\nconst offscreenPrices = html.match(/a-offscreen[\"'][^>]*>([€$£])?\\s*([\\d,.]+)/gi);\nif (offscreenPrices && offscreenPrices.length > 0) {\n  const firstPrice = offscreenPrices[0];\n  const priceNum = firstPrice.match(/([\\d]+[,.]\\d{2})/);\n  if (priceNum) {\n    extractedPrice = parseFloat(priceNum[1].replace(',', '.'));\n  }\n}\n\nif (!extractedPrice) {\n  const corePriceSection = html.match(/corePrice[\\s\\S]{0,500}?([\\d]+[,.]\\d{2})\\s*€/i);\n  if (corePriceSection) {\n    extractedPrice = parseFloat(corePriceSection[1].replace(',', '.'));\n  }\n}\n\nif (!extractedPrice) {\n  const euroPrice = html.match(/€\\s*([\\d]+[,.]\\d{2})/i);\n  if (euroPrice) {\n    extractedPrice = parseFloat(euroPrice[1].replace(',', '.'));\n  }\n}\n\nlet cleanHtml = html;\nconst featuredIndex = html.indexOf('Featured items you may like');\nconst customersIndex = html.indexOf('Customers also');\nconst similarIndex = html.indexOf('Similar items');\n\nlet cutIndex = html.length;\nif (featuredIndex > 5000 && featuredIndex < cutIndex) cutIndex = featuredIndex;\nif (customersIndex > 5000 && customersIndex < cutIndex) cutIndex = customersIndex;\nif (similarIndex > 5000 && similarIndex < cutIndex) cutIndex = similarIndex;\n\ncleanHtml = html.substring(0, cutIndex)\n  .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '')\n  .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')\n  .replace(/<[^>]+>/g, ' ')\n  .replace(/&[a-z]+;/gi, ' ')\n  .replace(/\\s+/g, ' ')\n  .trim();\n\nif (cleanHtml.length > 8000) {\n  cleanHtml = cleanHtml.substring(0, 8000);\n}\n\nlet priceHint = '';\nif (extractedPrice) {\n  priceHint = `IMPORTANT: The main product price is ${extractedPrice} EUR. Use this exact price.\\n\\n`;\n}\n\nconst prompt = `${priceHint}Extract product info and return JSON only:\n{\"price\": ${extractedPrice || '<number>'}, \"currency\": \"EUR\", \"productName\": \"<name>\", \"inStock\": <true/false/null>}\n\nRules: Use the price shown above if provided. Return ONLY valid JSON.\n\nText: ${cleanHtml}`;\n\nreturn {\n  productData: productData,\n  prompt: prompt,\n  extractedPrice: extractedPrice\n};"
      },
      "id": "prepare-prompt",
      "name": "Prepare GPT Prompt",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [880, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.openai.com/v1/chat/completions",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"model\": \"gpt-4o-mini\",\n  \"max_tokens\": 200,\n  \"messages\": [\n    {\n      \"role\": \"user\",\n      \"content\": {{ JSON.stringify($json.prompt) }}\n    }\n  ]\n}",
        "options": {}
      },
      "id": "openai-request",
      "name": "Call OpenAI API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1100, 0]
    },
    {
      "parameters": {
        "jsCode": "const productData = $('Prepare GPT Prompt').item.json.productData;\nconst extractedPrice = $('Prepare GPT Prompt').item.json.extractedPrice;\nconst openaiResponse = $input.item.json;\n\nlet extracted = { price: null, currency: 'EUR', productName: null, inStock: null };\n\ntry {\n  let gptText = openaiResponse.choices[0].message.content.trim();\n  gptText = gptText.replace(/```json\\n?/g, '').replace(/```\\n?/g, '');\n  const jsonMatch = gptText.match(/\\{[\\s\\S]*\\}/);\n  if (jsonMatch) {\n    extracted = JSON.parse(jsonMatch[0]);\n  }\n} catch (e) {}\n\nlet currentPrice = typeof extracted.price === 'number' ? extracted.price : null;\nif (extractedPrice && currentPrice !== extractedPrice) {\n  currentPrice = extractedPrice;\n}\n\nconst targetPrice = parseFloat(productData.targetPrice);\nconst shouldNotify = currentPrice !== null && currentPrice <= targetPrice;\n\nreturn {\n  productId: productData.id,\n  url: productData.url,\n  productName: extracted.productName || productData.productName,\n  email: productData.email,\n  targetPrice: targetPrice,\n  currentPrice: currentPrice,\n  currency: extracted.currency || 'EUR',\n  inStock: extracted.inStock,\n  priceFound: currentPrice !== null,\n  shouldNotify: shouldNotify\n};"
      },
      "id": "parse-response",
      "name": "Parse GPT Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1320, 0]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-notify",
              "leftValue": "={{ $json.shouldNotify }}",
              "rightValue": true,
              "operator": {
                "type": "boolean",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "check-price",
      "name": "Price Below Target?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [1540, 0]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "=UPDATE tracked_products SET \"currentPrice\" = {{ $json.currentPrice }}, \"lastChecked\" = NOW(), notified = true WHERE id = {{ $json.productId }}",
        "options": {}
      },
      "id": "mark-notified",
      "name": "Mark as Notified",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [1760, -100]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.resend.com/emails",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"from\": \"Price Tracker <onboarding@resend.dev>\",\n  \"to\": [\"{{ $('Parse GPT Response').item.json.email }}\"],\n  \"subject\": \"Price Alert: {{ $('Parse GPT Response').item.json.productName || 'Your tracked product' }} is now {{ $('Parse GPT Response').item.json.currentPrice }} {{ $('Parse GPT Response').item.json.currency || '' }}!\",\n  \"text\": \"Great news!\\n\\nThe product you're tracking has dropped to your target price.\\n\\nProduct: {{ $('Parse GPT Response').item.json.productName || 'N/A' }}\\nCurrent Price: {{ $('Parse GPT Response').item.json.currentPrice }} {{ $('Parse GPT Response').item.json.currency || '' }}\\nYour Target: {{ $('Parse GPT Response').item.json.targetPrice }}\\nIn Stock: {{ $('Parse GPT Response').item.json.inStock ? 'Yes' : 'Unknown' }}\\n\\nView the product: {{ $('Parse GPT Response').item.json.url }}\\n\\n---\\nPrice Tracker\"\n}",
        "options": {}
      },
      "id": "send-email",
      "name": "Send Email via Resend",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1980, -100]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "=UPDATE tracked_products SET \"currentPrice\" = {{ $json.currentPrice !== null ? $json.currentPrice : 'NULL' }}, \"lastChecked\" = NOW() WHERE id = {{ $json.productId }}",
        "options": {}
      },
      "id": "update-price",
      "name": "Update Price Only",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [1760, 100]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "=INSERT INTO price_history (product_id, price, checked_at) VALUES ({{ $json.productId }}, {{ $json.currentPrice !== null ? $json.currentPrice : 'NULL' }}, NOW())",
        "options": {}
      },
      "id": "log-price-history",
      "name": "Log Price History",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [1980, 100]
    }
  ],
  "connections": {
    "Schedule Trigger (5min)": {
      "main": [[{"node": "Get Active Products", "type": "main", "index": 0}]]
    },
    "Webhook (New Product)": {
      "main": [[{"node": "Get Active Products", "type": "main", "index": 0}]]
    },
    "Get Active Products": {
      "main": [[{"node": "Is Amazon URL?", "type": "main", "index": 0}]]
    },
    "Is Amazon URL?": {
      "main": [
        [{"node": "Fetch Amazon (Browserless)", "type": "main", "index": 0}],
        [{"node": "Fetch Other (Railway)", "type": "main", "index": 0}]
      ]
    },
    "Fetch Amazon (Browserless)": {
      "main": [[{"node": "Prepare GPT Prompt", "type": "main", "index": 0}]]
    },
    "Fetch Other (Railway)": {
      "main": [[{"node": "Prepare GPT Prompt", "type": "main", "index": 0}]]
    },
    "Prepare GPT Prompt": {
      "main": [[{"node": "Call OpenAI API", "type": "main", "index": 0}]]
    },
    "Call OpenAI API": {
      "main": [[{"node": "Parse GPT Response", "type": "main", "index": 0}]]
    },
    "Parse GPT Response": {
      "main": [[{"node": "Price Below Target?", "type": "main", "index": 0}]]
    },
    "Price Below Target?": {
      "main": [
        [{"node": "Mark as Notified", "type": "main", "index": 0}],
        [{"node": "Update Price Only", "type": "main", "index": 0}]
      ]
    },
    "Mark as Notified": {
      "main": [[{"node": "Send Email via Resend", "type": "main", "index": 0}]]
    },
    "Update Price Only": {
      "main": [[{"node": "Log Price History", "type": "main", "index": 0}]]
    }
  },
  "settings": {"executionOrder": "v1"},
  "staticData": null,
  "tags": []
}
```

---

## What I'd Add Next

1. **Price history charts** - Data is already being collected
2. **Browser extension** - One-click "track this product"
3. **WhatsApp notifications** - Already have the field in DB
4. **Multiple users per product** - Share tracking with friends

---

## Want to Build Something Similar?

The core stack:
1. **Next.js** - Your frontend and API
2. **n8n** - Automation without code
3. **Puppeteer + Stealth** - Web scraping that works
4. **GPT-4o-mini** - Cheap AI for data extraction

Happy to answer questions - just reply to this message!

---

**Connect with me:**
[LinkedIn](https://www.linkedin.com/in/bojandragojevic/)
