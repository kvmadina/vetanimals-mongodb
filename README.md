# VetAnimals

Pet-care platform: shop, veterinary directory, appointments, pet profiles and orders.

- **Frontend** — React + Vite + Tailwind CSS
- **Backend** — Express + Mongoose (MongoDB Atlas)

## Setup

```bash
npm install
cp .env.example .env    # then fill in MONGODB_URI and JWT_SECRET
npm run seed            # products, categories, clinics and veterinarians
npm run dev             # starts the web app and the API together
```

`npm run dev` runs Vite on `http://localhost:5173` and the API on
`http://localhost:3000`. Vite proxies `/api` to the API, so the browser only
ever talks to one origin.

### Environment variables

Everything is server-side — Vite only exposes `VITE_*` variables to the
browser, so nothing here reaches the client bundle.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string. **Include the database name** (`…mongodb.net/vetanimals`), otherwise Mongoose writes to a database called `test`. |
| `JWT_SECRET` | Signs login tokens. Changing it signs every user out. |
| `PORT` | Port the API listens on (default `3000`). |

If Atlas refuses the connection, the usual cause is your IP: **Network Access →
Add Current IP Address**. A new network (home vs office) needs it again.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Web + API together |
| `npm run dev:web` / `npm run dev:api` | Either one alone |
| `npm run seed` | Load the catalogue. Idempotent — existing rows are skipped |
| `npm run role -- <email> <role> ["Vet name"]` | Grant `user` / `veterinarian` / `admin` |
| `npm run build` | Production build of the frontend |
| `npm run start` | Run the API without the watcher |
| `npm run lint` | oxlint |

### Roles

Registration always creates a plain `user` — the role is never read from the
request body, since it decides who can reach the admin panel. Promote an
account from the command line:

```bash
npm run role -- you@example.com admin
npm run role -- vet@example.com veterinarian "Dr. Maya Chen"
```

The third argument links the account to a seeded veterinarian record, which is
what the veterinarian portal (`/vet`) uses to find that vet's schedule.

## Project layout

```
server/
  models/       Mongoose schemas — the validation rules live here
  routes/       One file per resource
  middleware/   requireAuth / requireRole, central error handling
  seed.js       Catalogue data
  set-role.js   Role management
src/
  lib/          Data layer — api.js wraps fetch, one module per resource
  context/      Auth, cart, favorites, toasts
  pages/        Routed screens
  components/   Shared UI
```

### How access control works

There is no row-level security to fall back on, so every route that touches
user-owned data filters by the caller itself: `requireAuth` puts the account on
`req.user`, and the query carries `user_id: req.user.id`. Another user's record
reads as "not found", never as someone else's data.

### Error handling

Schema validation failures return **400** with the field message; anything
unexpected returns **500** with no internal detail. The frontend's
`getXErrorMessage()` helpers map the response `code` to a user-facing sentence.

## Deploying to Vercel

One Vercel project serves both halves: the built frontend is static, and
`api/index.js` runs the same Express app as a serverless function.
`vercel.json` rewrites `/api/*` to it.

Before the first deploy:

1. **Atlas → Network Access → Add IP Address → Allow access from anywhere
   (`0.0.0.0/0`).** Vercel's outbound IPs change per invocation, so an
   allowlist of specific addresses cannot work. Access is still gated by the
   database user and password in the connection string.
2. **Vercel → Project Settings → Environment Variables:** add `MONGODB_URI` and
   `JWT_SECRET`. `.env` is gitignored and never reaches the repository, so
   without this the deployed API has no database. Use a *different*
   `JWT_SECRET` than the local one.
3. `PORT` is not needed — Vercel assigns it.

Then push; Vercel builds on every commit.

Seeding runs against the database, not the deployment, so `npm run seed` and
`npm run role` work from your machine and affect the deployed site too — both
talk to the same Atlas cluster.

### Local development is unaffected

`server/index.js` still starts a normal long-lived Express server for
`npm run dev`. The split is only about who calls `listen()`:

```
server/app.js      routes + middleware (shared)
  ├── server/index.js   local: connect → listen on PORT
  └── api/index.js      Vercel: connect → export handler
```

## Demo payment

Checkout does **not** process payments. "Confirm payment" moves an order from
`pending` to `paid` so the order lifecycle can be walked end to end — no card
details are collected and no money moves.
