# WA:AC

WA:AC turns a public Codeforces profile into contest history, an upsolve queue,
rating trends, and solve-coverage charts.

## Features

- Actual and virtual contest history with per-problem solve times
- Difficulty-aware upsolve queue
- Official rating and contest difficulty history
- Rolling solve coverage by Codeforces rating band
- Shareable player URLs such as `/codeforces/tourist#growth`
- Light and dark themes

AtCoder support is under development and is not linked from the public interface.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, then enter an exact Codeforces handle.

Copy `.env.example` to `.env.local` when you need to override the public site
origin used by social metadata.

## Validation

```bash
npm test
npm run lint
```

## Deployment

The application uses vinext and targets Cloudflare Workers because its API routes
need a server runtime. Cloudflare's recommended deployment command is:

```bash
npx @vinext/cloudflare deploy
```

Before the first deployment, authenticate Wrangler with your Cloudflare account
and configure the Worker account ID.

## Data and attribution

WA:AC uses public data from the Codeforces API. Codeforces is a trademark of its
respective owner; this project is independent and is not an official Codeforces
service.
