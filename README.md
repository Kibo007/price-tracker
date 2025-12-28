# Price Tracker

Track product prices and get notified when they drop to your target price.

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Automation**: n8n (self-hosted)
- **AI**: OpenAI GPT-4o-mini for price extraction

## Quick Start

### 1. Start Docker Containers

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- n8n on port 5678

### 2. Set Up the Database

```bash
npx prisma db push
```

### 3. Run the Next.js App

```bash
npm run dev
```

Visit http://localhost:3000

### 4. Configure n8n

1. Open http://localhost:5678
2. Create an account
3. Set environment variable `OPENAI_API_KEY` in your n8n container
4. Go to **Credentials** and add:
   - **PostgreSQL**:
     - Host: `postgres` (or `localhost` if connecting from host)
     - Port: `5432`
     - Database: `pricetracker`
     - User: `postgres`
     - Password: `postgres`
   - **HTTP Header Auth** (for Resend email):
     - Name: `Authorization`
     - Value: `Bearer <your-resend-api-key>`
5. Import the workflow from `n8n-workflows/price-checker.json`
6. Update credential references in the workflow
7. Activate the workflow

## Project Structure

```
price-tracker/
├── docker-compose.yml    # PostgreSQL + n8n containers
├── n8n-workflows/        # Exportable n8n workflows
├── app/                  # Next.js app router pages & API
├── components/           # React components
├── lib/                  # Utilities (Prisma client)
└── prisma/               # Database schema
```

## How It Works

1. User adds a product URL with target price via the web UI
2. n8n workflow runs every hour
3. For each tracked product:
   - Fetches the product page
   - Uses GPT-4o-mini to extract the current price (ignoring unit prices)
   - If price <= target, sends email notification via Resend
   - Logs price history

## Environment Variables

Create `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pricetracker"
```

For n8n, set:
```env
OPENAI_API_KEY="your-openai-api-key"
```

## Supported Sites

The AI-powered price extractor works with most e-commerce sites:
- Amazon (extracts main price, ignores unit prices)
- eBay
- Most other sites with visible prices

The GPT prompt specifically targets the main purchase price and ignores per-unit, per-kg, or shipping prices.
