# Greenmood Content Engine

Social media content generator for Greenmood's international marketing team.

## Features

- **Multi-market content generation** — Create posts for 8 markets (HQ, US, UK, FR, UAE, PL, KR, DE) with unique angles per market
- **Multi-platform** — LinkedIn, Instagram, Stories, Pinterest
- **Preview** — See how posts look on LinkedIn and Instagram before publishing
- **Calendar** — Schedule and plan content visually
- **History** — All generations saved, reusable anytime
- **Resources** — Quick access to articles, tech sheets, photo libraries, brand guidelines
- **Pomelli prompts** — Auto-generated image prompts for each campaign
- **Export** — Download all content as Markdown

## Setup

### 1. Clone and install

```bash
git clone https://github.com/jeremieoyabun/greenmood.git
cd greenmood
npm install
```

### 2. Add your Anthropic API key

Create a `.env.local` file:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your key at https://console.anthropic.com/

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

Push to GitHub, then import in Vercel. Add `ANTHROPIC_API_KEY` as an environment variable in Vercel project settings.

## Team access

Share the Vercel URL with team members. No login required. The API key is stored server-side — users never see it.

## Cost

Anthropic API usage for content generation is approximately $3-5/month for typical usage (20-30 generations/month).
