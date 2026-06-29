# مشكلة وحل (Problem & Solution)

A collaborative platform for teachers to share school problems and propose
solutions — either on a public feed or inside private/public meeting rooms.
People vote problems and solutions up or down, and the highest-voted ones
rise to the top.

This is a full-stack rebuild: a React frontend talking to its own Express +
PostgreSQL backend. No external services, no paid APIs — just Node.js and a
database.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend:** Node.js + Express, plain REST API
- **Database:** PostgreSQL
- **Routing:** wouter (client-side), React Query (data fetching/caching)

## Project structure

```
mushkila-wa-hal/
├── client/          # React frontend (Vite)
├── server/          # Express API + PostgreSQL access layer
│   ├── schema.sql    # table definitions
│   ├── migrate.js    # creates tables (run once)
│   ├── db.js         # all SQL lives here
│   └── index.js      # Express app + routes
└── package.json     # root scripts to run both together
```

---

## 1. Run it on your PC

### Requirements

- [Node.js](https://nodejs.org) 18 or newer
- [PostgreSQL](https://www.postgresql.org/download/) 14 or newer, running locally
  (or any Postgres connection string — see step 3)

### Step 1 — Install dependencies

From the project root:

```bash
npm run install:all
```

This installs both `server/` and `client/` dependencies.

### Step 2 — Create a database

Using `psql` (or any Postgres GUI like pgAdmin/TablePlus):

```sql
CREATE DATABASE mushkila;
```

### Step 3 — Configure the connection string

```bash
cd server
cp .env.example .env
```

Open `server/.env` and set `DATABASE_URL` to match your local Postgres
user/password/database, e.g.:

```
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/mushkila
DATABASE_SSL=false
PORT=5000
```

> If you're not sure of your local Postgres password, it's whatever you set
> when you installed it. On a fresh install with no password set, try
> `postgres://postgres@localhost:5432/mushkila` (no password segment).

### Step 4 — Create the tables

```bash
npm run db:migrate
```

You should see `✅ Database schema is up to date.` This is safe to re-run
any time — it won't delete existing data.

### Step 5 — Run it

From the project root:

```bash
npm run dev
```

This starts the API server on **http://localhost:5000** and the frontend
dev server on **http://localhost:5173** at the same time. Open
**http://localhost:5173** in your browser.

The frontend automatically forwards its `/api/...` calls to the backend —
no extra configuration needed.

---

## 2. Put it online

The app deploys as **one web service + one managed Postgres database**.
Below is the [Render](https://render.com) path (a generous free tier and a
straightforward dashboard), but the same `DATABASE_URL` convention works on
Railway, Fly.io, Heroku, or your own VPS without code changes.

### Step 1 — Push this project to a GitHub repo

Render deploys straight from GitHub.

### Step 2 — Create the database on Render

1. New → PostgreSQL
2. Pick a name (e.g. `mushkila-db`), region, and the free plan
3. Once it's created, copy the **Internal Database URL** shown on its page

### Step 3 — Create the web service

1. New → Web Service → connect your repo
2. **Build command:**
   ```
   npm run install:all && npm run build && npm run db:migrate
   ```
3. **Start command:**
   ```
   npm start
   ```
4. **Environment variables:**
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL from step 2 |
   | `NODE_ENV` | `production` |
   | `DATABASE_SSL` | `true` |

   (Leave `PORT` unset — Render sets it automatically and the server already
   reads `process.env.PORT`.)
5. Deploy.

Render builds the frontend, runs the migration, then starts the Express
server, which serves both the API and the built frontend from one process
and one URL — nothing else to configure.

### Notes for any host

- The backend always reads `DATABASE_URL` from the environment — never hardcode
  credentials in code.
- `DATABASE_SSL=false` is for local Postgres (which usually has no SSL cert
  configured). Hosted Postgres (Render, Railway, etc.) needs SSL, so leave it
  `true` or unset in production.
- `npm run build` builds the frontend into `client/dist`; `npm start` runs
  the server in production mode, which serves that folder directly. There is
  no separate frontend deployment — one service does both.

---

## How the data works

- **Public feed** — problems with no room attached, visible to everyone on
  the home page.
- **Rooms** — a name + a join code. Private rooms require the code; public
  rooms get one auto-generated for sharing anyway. Problems posted inside a
  room are scoped to it.
- **Votes** — each visitor gets a random token stored in their browser
  (`localStorage`). Clicking like/dislike again on the same item retracts
  the vote; clicking the other one switches it. One vote per person per
  item, no login required.
- **Names** — visitors pick a display name once (stored locally) before
  posting; it's not an account, just a label.

## Troubleshooting

- **"Missing DATABASE_URL environment variable"** — you haven't created
  `server/.env` yet (see Step 3 above).
- **Connection refused / password authentication failed** — double check the
  username/password/port in `DATABASE_URL` match your local Postgres setup.
- **Port 5000 or 5173 already in use** — change `PORT` in `server/.env`,
  and/or edit the port in `client/vite.config.ts`.
