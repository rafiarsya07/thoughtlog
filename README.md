# ThoughtLog

A full-stack personal blog with a built-from-scratch CMS — no off-the-shelf
platform. Write in Markdown with live preview, save drafts, schedule posts to
publish automatically, edit anytime, and browse by tag. Reading is public;
writing is behind authentication.

## Features

- **Markdown editor with live preview** — rendered output side-by-side as you type
- **Formatting toolbar + shortcuts** — bold/italic/heading/link/quote/code/list buttons, plus Ctrl/Cmd+B/I/K
- **Local autosave + word count** — drafts are saved to the browser as you write, with a restore prompt if you come back; live word/character count and reading-time estimate
- **Three publish modes** — publish now, save as draft, or **schedule** for a future date
- **Scheduled publishing** — a background job flips scheduled posts live when their time comes
- **Full edit flow** — open any post, change content or status, re-publish
- **Admin dashboard** — counts for total / published / scheduled / drafts, total views, comments and subscribers; **filter by status, search, and bulk publish / draft / delete**
- **Reader comfort** — a floating Reading panel (font size, column width, serif/sans, light/dark), table of contents, reading-progress bar, and back-to-top
- **Rich article rendering** — copy-to-clipboard code blocks with syntax highlighting, click-to-zoom image lightbox, GitHub-style callouts (`> [!note]` / `[!tip]` / `[!warn]`), and footnotes (`text[^1]` … `[^1]: …`)
- **Tags** — tag cloud on the home page, click any tag to filter
- **Related posts** — shown under each article based on shared tags
- **Reactions, ratings & comments** — emoji reactions and star ratings (no login), threaded reader comments
- **Cover images**, **full-text search**, **per-post view tracking**, **RSS feed**, **email subscriptions**

## What it demonstrates

- **REST API design** — clean split of public reads vs. authenticated writes
- **Authentication** — bcrypt password hashing, signed JWT in an httpOnly cookie, server-side route guards
- **PostgreSQL** — real schema, parameterized queries, a generated `tsvector` column + GIN index for search, an atomic view counter, array columns for tags
- **A post status state machine** — draft → scheduled → published
- **Background jobs** — an in-process scheduler that publishes due posts every minute
- **A clean data-access layer** — all SQL lives in `server/db.js`

## Stack

Node.js + Express · PostgreSQL (`pg`) · bcryptjs + jsonwebtoken · marked ·
vanilla-JS single-page front-end (no framework, no build step) · dotenv.

## Run it locally

Requires PostgreSQL running.

```bash
npm install
cp .env.example .env        # then edit with your DB details

# create the database (once, in psql):
#   CREATE USER thoughtlog WITH PASSWORD 'changeme';
#   CREATE DATABASE thoughtlog OWNER thoughtlog;

npm run init-db             # create / migrate tables
npm run seed                # admin user + sample posts
npm start                   # http://localhost:3000
```

Sign in at `/login` with the `ADMIN_USER` / `ADMIN_PASS` from your `.env`.
Reading the blog needs no login — that's only for writing.

## Project layout

```
server/
  index.js     Express app + all API routes
  db.js        the ONLY file that runs SQL
  auth.js      bcrypt + JWT helpers, requireAuth middleware
  scheduler.js background job for timed publishing
  init-db.js   schema create / migrate (run once)
  seed.js      admin user + sample posts
public/
  index.html   the entire front-end (reader + dashboard + editor)
```

## How scheduled publishing works

When you schedule a post, it's saved with `status = 'scheduled'` and a
`publish_at` timestamp, and stays hidden from readers. `scheduler.js` runs every
minute and asks the database for any scheduled post whose time has passed, then
flips it to `published`. It also runs once at startup to catch anything that
came due while the server was off.

## Deploying (self-hosted)

Runs anywhere Node + PostgreSQL run. On a mini PC: keep it alive with PM2
(`pm2 start server/index.js --name thoughtlog`), and expose it with a Cloudflare
Tunnel — no inbound ports opened.
# thoughtlog
