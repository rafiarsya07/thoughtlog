// ---------------------------------------------------------------------------
// init-db.js — Create / migrate the schema. Run with: npm run init-db
// Safe to re-run: uses IF NOT EXISTS and backfills old rows.
// ---------------------------------------------------------------------------

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  body       TEXT NOT NULL,
  tags       TEXT[] DEFAULT '{}',
  published  BOOLEAN DEFAULT FALSE,
  views      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image TEXT;

UPDATE posts SET status = CASE WHEN published THEN 'published' ELSE 'draft' END
 WHERE status IS NULL;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;
CREATE INDEX IF NOT EXISTS posts_search_idx ON posts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status, publish_at);

-- Comments: no login required. Author name is free text; email is optional
-- and never shown publicly (kept only so the author could, in principle, be
-- contacted — not used for anything yet). Approved defaults to true so
-- comments show immediately; flip to a moderation queue later by changing
-- the default and adding an admin approve action.
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  email      TEXT,
  body       TEXT NOT NULL,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  approved   BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, created_at);

-- A per-comment secret so an anonymous author can edit or delete their own
-- comment from the same browser (the raw token is handed back once and kept
-- in the visitor's localStorage; only its presence is checked here).
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edit_token TEXT;
-- Admin replies live in the same table: is_admin marks them, parent_id nests
-- them under the comment they answer (one level deep).
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);

-- Whether subscribers have already been emailed about this post, so flipping
-- a post to published only ever fans out one notification.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE;

-- Reactions: one emoji per (post, anonymous visitor). The visitor is
-- identified by a random ID stored in a long-lived cookie (see auth.js /
-- index.js), not by account — so reactions are per-browser, not per-person,
-- same tradeoff as the view counter.
CREATE TABLE IF NOT EXISTS reactions (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, visitor_id, emoji)
);
CREATE INDEX IF NOT EXISTS reactions_post_idx ON reactions (post_id);

-- Newsletter subscribers: just an email + timestamp for now. No sending
-- happens yet — wiring up actual delivery (Resend/SendGrid) is a separate
-- step once there's an API key to configure.
CREATE TABLE IF NOT EXISTS subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

try {
  await pool.query(sql);
  console.log("Schema ready: posts/users/comments/reactions/subscribers created or migrated.");
} catch (err) {
  console.error("Failed to create schema:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
