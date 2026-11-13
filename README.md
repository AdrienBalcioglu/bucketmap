# BucketMap

A travel bucket list on a world map. Pin the cities you dream of, list what you want to do in each one, and tick places off as you go.

## Features

- Interactive world map with your destinations as pins
- A bucket list per city: add, edit, reorder and check off places
- Place suggestions around a city (restaurants, culture, parks, monuments) from OpenStreetMap
- Themes and a custom title for your map
- An optional PIN to lock the map on a shared device
- Sync across devices through a map ID, with no account to create

## Stack

React 19 · Vite · react-simple-maps · Supabase (Postgres) · Overpass API · Vercel

## Getting started

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

1. Create a project on [supabase.com](https://supabase.com).
2. Run `schema.sql` in the Supabase SQL editor.
3. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.

Google Analytics is off unless you set `VITE_GA4_MEASUREMENT_ID`.

## Deployment

`.github/workflows/deploy.yml` deploys to Vercel on every push to `main`. It needs a `VERCEL_TOKEN` repository secret. Preview deployments only run for pull requests opened from this repository, never from a fork.

## Security notes

BucketMap has no user accounts. A map is identified by a random ID kept in the browser, and the app talks to Supabase with the public anon key.

- Anyone who knows a map ID can read and edit that map. Treat the ID like a password.
- The PIN only locks the screen. It is stored as plain text and is not an access control.
- `schema.sql` does not enable row level security. If you host this for other people, add Supabase Auth and RLS policies first.

## License

[MIT](LICENSE) © 2026 Adrien Balcioglu
