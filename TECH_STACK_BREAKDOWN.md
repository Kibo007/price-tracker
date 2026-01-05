# Price Tracker - Full Tech Stack Breakdown

Thanks for your interest! Here's the complete architecture behind the price tracking app.

---

## The Problem I Solved

I wanted to buy products at specific prices but:
- Manually checking daily was tedious
- Price tracking services were expensive or limited
- Most tools don't work on all e-commerce sites

So I built a system that works with **any website** and notifies me automatically.

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

## Frontend Stack

### Next.js 15 + React 19
**Why:** App Router, Server Components, and the latest React features.

- **Server Actions** for form submissions
- **Server Components** reduce client-side JavaScript
- **Built-in API routes** for backend logic

### Tailwind CSS v4
**Why:** Rapid styling without leaving the component.

- New CSS-first configuration
- Smaller bundle size than v3

### shadcn/ui + Radix
**Why:** Accessible, customizable components.

- Not a component library - actual code you own
- Full control over styling
- Built on Radix primitives (accessibility handled)

### NextAuth.js v5 (Auth.js)
**Why:** Authentication that just works.

- Google OAuth (one-click signup)
- Email/Password with bcrypt hashing
- JWT sessions
- Prisma adapter for database integration

---

## Backend Stack

### PostgreSQL
**Why:** Reliable, powerful, free tier on Railway.

**Schema Design (4 tables):**
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
**Why:** Type-safe database queries.

```typescript
// Example: Get user's products
const products = await prisma.trackedProduct.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' }
})
```

- Auto-generated TypeScript types
- Migrations handled automatically
- Works perfectly with Next.js

---

## Automation Layer

### n8n (Self-hosted on Railway)
**Why:** Visual workflow automation I control.

**The workflow runs:**
1. Every 5 minutes (scheduled)
2. Instantly when new product added (webhook)

**Workflow Logic:**
```
Trigger → Get active products from DB
       → For each product:
          → Is it Amazon?
             → Yes: Use Browserless.io
             → No: Use custom scraper API
          → Send HTML to GPT-4o-mini
          → Parse price from AI response
          → If price ≤ target AND not yet notified:
             → Send email via Resend
             → Mark as notified in DB
          → Log price to history table
```

**Why n8n over code?**
- Visual debugging (see exactly where it fails)
- Easy to modify without redeploying
- Built-in integrations (PostgreSQL, HTTP, Email)
- Non-technical people can understand the flow

---

## The Scraping Challenge

### Problem: Modern e-commerce sites block bots

**Detection methods sites use:**
- User-agent checking
- JavaScript fingerprinting
- Request pattern analysis
- CAPTCHAs

### Solution 1: Browserless.io (for Amazon)

Amazon is aggressive with bot detection. Browserless provides:
- Real Chrome browsers in the cloud
- Residential IP rotation
- Built-in stealth measures

```javascript
// n8n calls Browserless API
POST https://chrome.browserless.io/content
{
  "url": "https://amazon.com/dp/...",
  "waitFor": 3000
}
```

### Solution 2: Custom Scraper API (for other sites)

I built a Puppeteer-based scraper deployed on Railway:

**Anti-detection measures:**
```javascript
// Stealth plugin
puppeteer.use(StealthPlugin())

// Random user agents
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120...',
  // ... 5 variations
]

// Block unnecessary resources (faster + stealthier)
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

**Why self-hosted?**
- Free (just Railway hosting cost)
- Full control over the code
- No rate limits from third-party APIs

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

HTML:
${cleanedHTML}
`
```

**Why GPT-4o-mini?**
- 10x cheaper than GPT-4
- Fast enough for real-time use
- Accurate for structured extraction tasks

**Cost:** ~$0.001 per price check (practically free)

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

### Why this split?

**Vercel:**
- Perfect for Next.js (they made it)
- Edge functions for fast API responses
- Automatic deployments from Git
- Free tier is generous

**Railway:**
- Persistent services (n8n needs to run 24/7)
- Docker support for custom scraper
- PostgreSQL with automatic backups
- $5/month covers everything

**Browserless.io:**
- Only used for Amazon (hardest to scrape)
- Pay-per-use model
- Handles the complexity I don't want to manage

---

## Email Notifications

### Resend
**Why:** Developer-friendly email API.

```javascript
// n8n sends via Resend API
POST https://api.resend.com/emails
{
  "from": "Price Tracker <alerts@domain.com>",
  "to": user.email,
  "subject": "Price Drop Alert: ${productName}",
  "html": `
    <h2>Good news!</h2>
    <p>${productName} dropped to ${currentPrice}!</p>
    <p>Your target was: ${targetPrice}</p>
    <a href="${productUrl}">Buy Now</a>
  `
}
```

---

## Key Technical Decisions

| Decision | Why |
|----------|-----|
| n8n over custom cron jobs | Visual debugging, easy modifications |
| GPT over regex | Handles any site without maintenance |
| Separate scraper service | Isolates the risky/complex part |
| `notified` flag | One alert per price drop, no spam |
| Price history table | Future feature: price charts |
| Railway over AWS | Simpler, cheaper for this scale |

---

## What I'd Add Next

1. **Price history charts** - Data is already being collected
2. **Browser extension** - One-click "track this product"
3. **WhatsApp notifications** - Already have the field in DB
4. **Multiple users per product** - Share tracking with friends

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

## The n8n Workflow (Import Ready)

I've included the complete n8n workflow JSON that you can import directly into your n8n instance.

**Download:** [price-checker-workflow.json](./price-checker-workflow.json)

### How to Import:
1. Open your n8n instance
2. Go to **Settings → Import from File**
3. Paste the JSON from the workflow file
4. Configure your credentials (see below)

### Required Environment Variables:
Set these in your n8n environment:
- `BROWSERLESS_TOKEN` - Your Browserless.io API token
- `SCRAPER_API_URL` - URL of your Railway scraper
- `SCRAPER_API_KEY` - API key for your scraper (optional)

### Required Credentials in n8n:
- PostgreSQL connection (for your Railway database)
- HTTP Header Auth for OpenAI (Authorization: Bearer YOUR_KEY)
- HTTP Header Auth for Resend (Authorization: Bearer YOUR_KEY)

---

## Want to Build Something Similar?

The core stack that makes this work:
1. **Next.js** - Your frontend and API
2. **n8n** - Automation without code
3. **Puppeteer + Stealth** - Web scraping that works
4. **GPT-4o-mini** - Cheap AI for data extraction

Happy to answer questions - just reply to this message!

---

**Connect with me:**
[Lindkedin](https://www.linkedin.com/in/bojandragojevic/)

