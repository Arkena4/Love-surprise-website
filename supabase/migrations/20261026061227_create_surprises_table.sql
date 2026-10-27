/*
# Create surprises table (single-tenant, no auth)

Stores personalized love-surprise websites created by customers. Each row is one
customizable surprise that gets a shareable slug so recipients can view it without
an account.

1. New Tables
- `surprises`
  - `id` (uuid, primary key)
  - `slug` (text, unique) — short shareable id used in the recipient URL
  - `occasion` (text) — birthday | monthsary | anniversary | wedding | valentine | proposal | just_because
  - `theme` (text) — pink | wedding | vintage | midnight | minimal | birthday
  - `recipient_name` (text)
  - `sender_name` (text)
  - `title` (text) — greeting headline
  - `subtitle` (text)
  - `special_date` (date) — meaningful date for the live counter
  - `date_label` (text) — e.g. "The day we met"
  - `love_letter` (text) — main letter body
  - `hidden_message` (text) — secret revealed on tap
  - `reasons` (text[]) — "reasons why I love you" list
  - `quiz` (jsonb) — couple's love quiz questions
  - `photos` (jsonb) — array of {url, caption, date}
  - `music_url` (text) — optional background audio url
  - `final_message` (text)
  - `paid` (boolean, default false) — whether the ₱99 publish fee was paid
  - `published` (boolean, default false)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `surprises`.
- Grant CRUD to anon + authenticated so the no-auth frontend can create and read surprises.
- Drafts (published=false) are readable so creators can preview; the recipient page checks `published` before rendering the full experience.
*/

CREATE TABLE IF NOT EXISTS surprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  occasion text NOT NULL DEFAULT 'just_because',
  theme text NOT NULL DEFAULT 'pink',
  recipient_name text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT 'A Little Surprise for You',
  subtitle text NOT NULL DEFAULT '',
  special_date date,
  date_label text NOT NULL DEFAULT '',
  love_letter text NOT NULL DEFAULT '',
  hidden_message text NOT NULL DEFAULT '',
  reasons text[] NOT NULL DEFAULT '{}',
  quiz jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  music_url text NOT NULL DEFAULT '',
  final_message text NOT NULL DEFAULT '',
  paid boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE surprises ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON surprises TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_surprises" ON surprises;
CREATE POLICY "anon_select_surprises" ON surprises FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_surprises" ON surprises;
CREATE POLICY "anon_insert_surprises" ON surprises FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_surprises" ON surprises;
CREATE POLICY "anon_update_surprises" ON surprises FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_surprises" ON surprises;
CREATE POLICY "anon_delete_surprises" ON surprises FOR DELETE
  TO anon, authenticated USING (true);
