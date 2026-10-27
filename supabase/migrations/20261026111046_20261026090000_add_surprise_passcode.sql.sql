/*
# Add six-digit surprise passcodes

1. New columns
- `surprises.passcode` stores the six-digit code required before opening a surprise.
- Existing surprises receive the temporary default `123456` so no saved surprise is broken.

2. Validation
- The passcode must contain exactly six numeric digits.

3. Security
- The existing single-tenant access model and policies remain unchanged.
- The passcode is used by the experience gate before the envelope is shown.

4. Important notes
- Creators can replace the temporary code while editing a surprise.
- No existing rows or user content are deleted.
*/

ALTER TABLE public.surprises
  ADD COLUMN IF NOT EXISTS passcode text NOT NULL DEFAULT '123456';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'surprises_passcode_six_digits'
      AND conrelid = 'public.surprises'::regclass
  ) THEN
    ALTER TABLE public.surprises
      ADD CONSTRAINT surprises_passcode_six_digits CHECK (passcode ~ '^[0-9]{6}$');
  END IF;
END $$;