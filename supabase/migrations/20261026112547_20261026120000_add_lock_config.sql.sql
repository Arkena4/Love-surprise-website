/*
# Add love padlock configuration column

1. New columns
- `surprises.lock_config` (jsonb, NOT NULL, with default) stores the love padlock
  customization: lock color, engraved initials, locked message, and unlock message.

2. Defaults
- Existing surprises receive a default rose-gold padlock with sample initials
  "A ♡ S" and the default romantic messages, so no saved surprise breaks.

3. Security
- No policy or grant changes — the existing single-tenant CRUD policies already
  cover all columns on `surprises`. The new column inherits those policies.
- No existing data is deleted or modified beyond setting the default.

4. Important notes
- The frontend reads this as part of `select('*')` and sends it on insert.
- Old localStorage drafts without this field are merged with defaults in-app.
*/

ALTER TABLE public.surprises
  ADD COLUMN IF NOT EXISTS lock_config jsonb NOT NULL DEFAULT
  '{"color":"rose_gold","initials":"A ♡ S","engraved_message":"Our love is locked here, but my heart will always be yours. ♡","unlock_message":"You found the key to my heart! Here''s a little something made just for you. 💗"}'::jsonb;