-- Schema for "مشكلة وحل" (Problem & Solution)
-- Run automatically by migrate.js / on server start.

CREATE TABLE IF NOT EXISTS rooms (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  code          TEXT UNIQUE NOT NULL,
  is_private    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problems (
  id            SERIAL PRIMARY KEY,
  room_id       INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  author_name   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solutions (
  id            SERIAL PRIMARY KEY,
  problem_id    INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  author_name   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS votes (
  id            SERIAL PRIMARY KEY,
  target_type   TEXT NOT NULL CHECK (target_type IN ('problem', 'solution')),
  target_id     INTEGER NOT NULL,
  voter_token   TEXT NOT NULL,
  vote_type     TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, voter_token)
);

CREATE INDEX IF NOT EXISTS idx_problems_room_id ON problems(room_id);
CREATE INDEX IF NOT EXISTS idx_solutions_problem_id ON solutions(problem_id);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);
