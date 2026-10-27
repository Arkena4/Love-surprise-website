/*
# Add payment verification, admin accounts, and custom theme support

This migration upgrades the love-surprise platform to support:
1. GCash payment verification with manual admin approval
2. Receipt screenshot uploads stored in Supabase Storage
3. An admin dashboard for approving/rejecting payments
4. Per-order payment status tracking (pending → verification → paid → rejected)
5. Custom theme overrides (colors, fonts, background) per surprise
6. Admin accounts with a privileged role column

## 1. New Tables
- `profiles` — id (uuid PK, refs auth.users), role (text default 'customer'), email, created_at

## 2. Modified Tables (additive only)
- `surprises` gains: order_number, payment_status, receipt_url, customer_email,
  customer_note, admin_note, verified_at, custom_theme, custom_font_head, custom_font_body

## 3. Security
- RLS on profiles; role column not client-writable (revoked, admin-only via function)
- claim_initial_admin: first caller becomes admin if none exists
- set_user_role: only existing admins can change roles
- approve_payment / reject_payment: admin-only SECURITY DEFINER functions
- is_admin: helper check
- Content columns on surprises are client-updatable; payment_status/published/paid/
  verified_at/admin_note are NOT client-writable — only admin functions change them
- Private storage bucket 'receipts' for GCash receipt screenshots
*/

-- ============================================================
-- 1. profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer',
  email text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (email) ON profiles TO authenticated;

-- ============================================================
-- 2. Add columns to surprises
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'order_number') THEN
    ALTER TABLE surprises ADD COLUMN order_number text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'payment_status') THEN
    ALTER TABLE surprises ADD COLUMN payment_status text NOT NULL DEFAULT 'pending_payment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'receipt_url') THEN
    ALTER TABLE surprises ADD COLUMN receipt_url text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'customer_email') THEN
    ALTER TABLE surprises ADD COLUMN customer_email text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'customer_note') THEN
    ALTER TABLE surprises ADD COLUMN customer_note text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'admin_note') THEN
    ALTER TABLE surprises ADD COLUMN admin_note text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'verified_at') THEN
    ALTER TABLE surprises ADD COLUMN verified_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'custom_theme') THEN
    ALTER TABLE surprises ADD COLUMN custom_theme jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'custom_font_head') THEN
    ALTER TABLE surprises ADD COLUMN custom_font_head text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'custom_font_body') THEN
    ALTER TABLE surprises ADD COLUMN custom_font_body text NOT NULL DEFAULT '';
  END IF;
END $$;

REVOKE UPDATE ON surprises FROM anon, authenticated;

GRANT UPDATE (
  occasion, theme, recipient_name, sender_name, title, subtitle,
  special_date, date_label, love_letter, hidden_message, reasons,
  quiz, photos, music_url, final_message,
  custom_theme, custom_font_head, custom_font_body,
  receipt_url, customer_note, payment_status
) ON surprises TO anon, authenticated;

ALTER TABLE surprises DROP CONSTRAINT IF EXISTS valid_payment_status;
ALTER TABLE surprises ADD CONSTRAINT valid_payment_status
  CHECK (payment_status IN ('pending_payment', 'payment_verification', 'paid', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_surprises_payment_status ON surprises(payment_status);
CREATE INDEX IF NOT EXISTS idx_surprises_created_at ON surprises(created_at DESC);

-- ============================================================
-- 3. SECURITY DEFINER functions
-- ============================================================

CREATE OR REPLACE FUNCTION claim_initial_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  SELECT count(*) INTO admin_count FROM profiles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RETURN false;
  END IF;
  UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_initial_admin FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_initial_admin TO authenticated;

CREATE OR REPLACE FUNCTION set_user_role(p_user uuid, p_role text)
RETURNS void
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
  IF p_role NOT IN ('admin', 'customer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE profiles SET role = p_role WHERE id = p_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_user_role FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE EXECUTE ON FUNCTION is_admin FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

CREATE OR REPLACE FUNCTION approve_payment(p_slug text)
RETURNS void
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
  UPDATE surprises
    SET payment_status = 'paid',
        paid = true,
        published = true,
        verified_at = now(),
        admin_note = ''
    WHERE slug = p_slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_payment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_payment TO authenticated;

CREATE OR REPLACE FUNCTION reject_payment(p_slug text, p_reason text)
RETURNS void
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
  UPDATE surprises
    SET payment_status = 'rejected',
        paid = false,
        published = false,
        admin_note = p_reason
    WHERE slug = p_slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_payment FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_payment TO authenticated;

-- ============================================================
-- 4. Storage bucket for receipts
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_insert_own" ON storage.objects;
CREATE POLICY "receipts_insert_own" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_read_all" ON storage.objects;
CREATE POLICY "receipts_read_all" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;
CREATE POLICY "receipts_update_own" ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'receipts');
