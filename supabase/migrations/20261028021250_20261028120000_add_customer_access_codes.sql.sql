/*
# Add secure customer access code system

This migration adds a complete access-code system where the admin generates
unique, unpredictable codes for customers. Customers verify their code on the
payment page to proceed. All code generation and verification happens on the
server with cryptographic randomness — codes are never generated in the browser.

## 1. New Tables

### `access_codes`
- `id` (uuid PK)
- `code` (text, unique) — 16 character cryptographically random alphanumeric
- `status` (text) — unused | assigned | active | revoked | redeemed
- `customer_name` (text) — customer/order reference, optional at creation time
- `order_ref` (text) — order number or reference, assigned later
- `surprise_id` (uuid, nullable, FK to surprises) — links code to a specific order
- `payment_verified` (boolean, default false) — admin marks payment as verified
- `notes` (text) — admin notes
- `created_by` (uuid, nullable, FK to auth.users) — which admin generated it
- `created_at` (timestamptz)
- `assigned_at` (timestamptz, nullable)
- `activated_at` (timestamptz, nullable)
- `revoked_at` (timestamptz, nullable)
- `redeemed_at` (timestamptz, nullable)

### `site_settings`
- `id` (int PK, always 1 — singleton row)
- `instagram_url` (text) — Instagram link shown on payment page
- `gcash_number` (text) — GCash number shown on payment page
- `gcash_name` (text) — GCash account name shown on payment page
- `updated_at` (timestamptz)

### `code_verify_attempts`
- `id` (uuid PK)
- `identifier` (text) — IP or session fingerprint for rate limiting
- `attempted_at` (timestamptz)
- `succeeded` (boolean)

## 2. Security

- `access_codes`: RLS enabled. Only admins can SELECT/UPDATE. No anon access —
  codes are never exposed to the public. All mutations happen through SECURITY
  DEFINER functions that verify the caller is an admin.
- `site_settings`: RLS enabled. Admin-only read/write. The payment page reads
  display values through a public RPC that only returns non-sensitive fields.
- `code_verify_attempts`: RLS enabled, no direct access to any role. Only written
  to by the verify_access_code SECURITY DEFINER function.
- Rate limiting: the verify_access_code function checks the last 10 minutes of
  attempts from the same identifier and rejects after 5 failed attempts.

## 3. Functions

### Admin-only (SECURITY DEFINER, verify caller is admin):
- `generate_access_code()` → returns the generated code text
- `assign_access_code(p_code, p_customer_name, p_order_ref, p_surprise_id)` → void
- `activate_access_code(p_code)` → marks payment verified + status active
- `revoke_access_code(p_code)` → marks revoked
- `deactivate_access_code(p_code)` → sets back to assigned (undo activate)
- `update_site_settings(p_instagram_url, p_gcash_number, p_gcash_name)` → void

### Public (SECURITY DEFINER, no auth required):
- `verify_access_code(p_code, p_identifier)` → returns json with slug + details
  or raises an error. Never reveals whether a code is close to valid.
- `get_public_settings()` → returns instagram_url, gcash_number, gcash_name only

## 4. Important Notes
- Codes use 16 characters from an unambiguous alphabet (no 0/O/1/l/I).
  Randomness comes from gen_random_uuid() (cryptographically random) combined
  with md5 hashing and substring extraction, producing unpredictable tokens.
- The unique constraint on `code` plus a retry loop guarantees no duplicates.
- Existing surprises, payment flow, and admin dashboard are untouched.
- No existing data is deleted or modified.
*/

-- ============================================================
-- 1. access_codes table
-- ============================================================
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'unused'
    CHECK (status IN ('unused', 'assigned', 'active', 'revoked', 'redeemed')),
  customer_name text NOT NULL DEFAULT '',
  order_ref text NOT NULL DEFAULT '',
  surprise_id uuid REFERENCES surprises(id) ON DELETE SET NULL,
  payment_verified boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  assigned_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  redeemed_at timestamptz
);

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON access_codes TO authenticated;

DROP POLICY IF EXISTS "access_codes_admin_all" ON access_codes;
CREATE POLICY "access_codes_admin_all" ON access_codes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "access_codes_admin_update" ON access_codes;
CREATE POLICY "access_codes_admin_update" ON access_codes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);
CREATE INDEX IF NOT EXISTS idx_access_codes_created_at ON access_codes(created_at DESC);

-- ============================================================
-- 2. site_settings table (singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  instagram_url text NOT NULL DEFAULT 'https://instagram.com/arcnnnee',
  gcash_number text NOT NULL DEFAULT '09945579570',
  gcash_name text NOT NULL DEFAULT 'C S',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON site_settings TO authenticated;

DROP POLICY IF EXISTS "site_settings_admin_read" ON site_settings;
CREATE POLICY "site_settings_admin_read" ON site_settings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Insert the singleton row if it doesn't exist
INSERT INTO site_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. code_verify_attempts table (rate limiting)
-- ============================================================
CREATE TABLE IF NOT EXISTS code_verify_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL DEFAULT '',
  attempted_at timestamptz NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL DEFAULT false
);

ALTER TABLE code_verify_attempts ENABLE ROW LEVEL SECURITY;

-- No grants to any role — only written/read by SECURITY DEFINER function
REVOKE ALL ON code_verify_attempts FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_verify_attempts_identifier_time
  ON code_verify_attempts(identifier, attempted_at DESC);

-- ============================================================
-- 4. Admin-only functions
-- ============================================================

-- Generate a cryptographically random access code using gen_random_uuid()
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  v_code text;
  v_exists boolean;
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  v_len int := 16;
  v_uuid text;
  v_hash text;
  i int;
  v_idx int;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Generate with collision check (retry up to 5 times)
  FOR i IN 1..5 LOOP
    -- Use two gen_random_uuid() calls + md5 to get enough random hex characters
    v_uuid := gen_random_uuid()::text || gen_random_uuid()::text;
    v_hash := md5(v_uuid);
    -- Extract 16 characters from the hex hash, mapping each to our alphabet
    v_code := '';
    FOR j IN 0..v_len - 1 LOOP
      v_idx := (('x' || substr(v_hash, ((j % 32) + 1), 1))::bit(8)::int % char_length(v_chars)) + 1;
      v_code := v_code || substr(v_chars, v_idx, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM access_codes WHERE code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      INSERT INTO access_codes (code, created_by)
        VALUES (v_code, auth.uid());
      RETURN v_code;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Could not generate a unique code after 5 attempts';
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_access_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_access_code() TO authenticated;

-- Assign a code to a customer/order
CREATE OR REPLACE FUNCTION assign_access_code(
  p_code text,
  p_customer_name text,
  p_order_ref text,
  p_surprise_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  v_current text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO v_current FROM access_codes WHERE code = p_code;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Code not found';
  END IF;
  IF v_current = 'revoked' THEN
    RAISE EXCEPTION 'Cannot assign a revoked code';
  END IF;
  IF v_current = 'redeemed' THEN
    RAISE EXCEPTION 'Cannot assign a redeemed code';
  END IF;

  UPDATE access_codes
    SET customer_name = COALESCE(NULLIF(p_customer_name, ''), customer_name),
        order_ref = COALESCE(NULLIF(p_order_ref, ''), order_ref),
        surprise_id = COALESCE(p_surprise_id, surprise_id),
        status = CASE WHEN status = 'unused' THEN 'assigned' ELSE status END,
        assigned_at = CASE WHEN assigned_at IS NULL THEN now() ELSE assigned_at END
    WHERE code = p_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION assign_access_code(text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION assign_access_code(text, text, text, uuid) TO authenticated;

-- Activate a code (mark payment as verified)
CREATE OR REPLACE FUNCTION activate_access_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  v_status text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO v_status FROM access_codes WHERE code = p_code;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Code not found';
  END IF;
  IF v_status = 'revoked' THEN
    RAISE EXCEPTION 'Cannot activate a revoked code';
  END IF;
  IF v_status = 'redeemed' THEN
    RAISE EXCEPTION 'Cannot activate a redeemed code';
  END IF;

  UPDATE access_codes
    SET status = 'active',
        payment_verified = true,
        activated_at = CASE WHEN activated_at IS NULL THEN now() ELSE activated_at END
    WHERE code = p_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION activate_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION activate_access_code(text) TO authenticated;

-- Deactivate (undo activation, e.g. payment was wrong)
CREATE OR REPLACE FUNCTION deactivate_access_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  v_status text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO v_status FROM access_codes WHERE code = p_code;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Code not found';
  END IF;

  UPDATE access_codes
    SET status = 'assigned',
        payment_verified = false,
        activated_at = NULL
    WHERE code = p_code AND status = 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION deactivate_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION deactivate_access_code(text) TO authenticated;

-- Revoke a code
CREATE OR REPLACE FUNCTION revoke_access_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  v_status text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO v_status FROM access_codes WHERE code = p_code;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Code not found';
  END IF;

  UPDATE access_codes
    SET status = 'revoked',
        revoked_at = CASE WHEN revoked_at IS NULL THEN now() ELSE revoked_at END
    WHERE code = p_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION revoke_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION revoke_access_code(text) TO authenticated;

-- Update site settings
CREATE OR REPLACE FUNCTION update_site_settings(
  p_instagram_url text,
  p_gcash_number text,
  p_gcash_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE site_settings
    SET instagram_url = p_instagram_url,
        gcash_number = p_gcash_number,
        gcash_name = p_gcash_name,
        updated_at = now()
    WHERE id = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_site_settings(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_site_settings(text, text, text) TO authenticated;

-- ============================================================
-- 5. Public functions (no auth required)
-- ============================================================

-- Verify an access code (customer-facing)
-- Returns json with the linked surprise slug if the code is valid and active.
-- Rate-limited per identifier (IP/session). Never reveals how close a guess is.
CREATE OR REPLACE FUNCTION verify_access_code(
  p_code text,
  p_identifier text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code_row access_codes%ROWTYPE;
  v_recent_count int;
  v_slug text;
  v_surprise_published boolean;
  v_surprise_payment_status text;
BEGIN
  -- Rate limiting: count failed attempts in the last 10 minutes
  SELECT count(*) INTO v_recent_count
    FROM code_verify_attempts
    WHERE identifier = p_identifier
      AND succeeded = false
      AND attempted_at > now() - interval '10 minutes';

  IF v_recent_count >= 5 THEN
    INSERT INTO code_verify_attempts (identifier, succeeded) VALUES (p_identifier, false);
    RAISE EXCEPTION 'Too many attempts. Please wait a few minutes and try again.';
  END IF;

  -- Look up the code
  SELECT * INTO v_code_row
    FROM access_codes
    WHERE code = trim(p_code);

  -- Always log the attempt; use a single generic error for all failure cases
  IF v_code_row.id IS NULL
     OR v_code_row.status = 'revoked'
     OR v_code_row.status = 'unused'
     OR v_code_row.status = 'assigned'
     OR v_code_row.payment_verified = false THEN
    INSERT INTO code_verify_attempts (identifier, succeeded) VALUES (p_identifier, false);
    RAISE EXCEPTION 'This access code is not valid or not yet activated.';
  END IF;

  -- Code is active and payment verified
  IF v_code_row.surprise_id IS NOT NULL THEN
    SELECT slug, published, payment_status
      INTO v_slug, v_surprise_published, v_surprise_payment_status
      FROM surprises WHERE id = v_code_row.surprise_id;

    IF v_surprise_payment_status = 'paid' OR v_surprise_published = true THEN
      UPDATE access_codes
        SET status = 'redeemed', redeemed_at = now()
        WHERE id = v_code_row.id;
      INSERT INTO code_verify_attempts (identifier, succeeded) VALUES (p_identifier, true);
      RETURN json_build_object(
        'slug', v_slug,
        'status', 'redeemed',
        'hasSurprise', true
      );
    END IF;
  END IF;

  -- Code is valid and active but not yet linked to a published surprise
  INSERT INTO code_verify_attempts (identifier, succeeded) VALUES (p_identifier, true);
  RETURN json_build_object(
    'slug', NULL,
    'status', v_code_row.status,
    'hasSurprise', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION verify_access_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_access_code(text, text) TO anon, authenticated;

-- Get public site settings (only display fields, no auth needed)
CREATE OR REPLACE FUNCTION get_public_settings()
RETURNS json
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'instagram_url', instagram_url,
    'gcash_number', gcash_number,
    'gcash_name', gcash_name
  ) FROM site_settings WHERE id = 1;
$$;

REVOKE EXECUTE ON FUNCTION get_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_settings() TO anon, authenticated;

-- Clean up old verify attempts (admin can call)
CREATE OR REPLACE FUNCTION cleanup_old_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM code_verify_attempts WHERE attempted_at < now() - interval '24 hours';
END;
$$;

REVOKE EXECUTE ON FUNCTION cleanup_old_attempts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_attempts() TO authenticated;

-- Grant service_role access for SECURITY DEFINER functions
GRANT INSERT, SELECT, DELETE ON code_verify_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON access_codes TO service_role;
GRANT SELECT, UPDATE ON site_settings TO service_role;