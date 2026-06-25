-- The Cute Map — Supabase Schema
-- Run this once in your Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS.

-- Destinations (cities added by the user via the UI)
CREATE TABLE IF NOT EXISTS cutemap_destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  flag TEXT,
  lng DOUBLE PRECISION NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Places (bucket list items per city/destination)
CREATE TABLE IF NOT EXISTS cutemap_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  city_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checked items (visited / done status)
CREATE TABLE IF NOT EXISTS cutemap_checked_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, item_key)
);

-- User profiles (title, theme, pin — stored remotely for cross-device restore)
CREATE TABLE IF NOT EXISTS cutemap_profiles (
  user_id TEXT PRIMARY KEY,
  title TEXT DEFAULT 'My Cute Map',
  theme TEXT DEFAULT 'aurora',
  pin TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups by user_id
CREATE INDEX IF NOT EXISTS cutemap_destinations_user_id ON cutemap_destinations(user_id);
CREATE INDEX IF NOT EXISTS cutemap_places_user_id ON cutemap_places(user_id);
CREATE INDEX IF NOT EXISTS cutemap_places_city_id ON cutemap_places(city_id);
CREATE INDEX IF NOT EXISTS cutemap_checked_items_user_id ON cutemap_checked_items(user_id);
