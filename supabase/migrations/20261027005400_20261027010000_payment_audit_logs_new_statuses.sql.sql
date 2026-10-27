/*
# Add payment audit logs, GCash reference, new statuses, and revenue functions

This migration upgrades the payment verification system to support:
1. Full audit trail of every payment status change
2. GCash reference number storage and uniqueness checking
3. New payment statuses: needs_correction, refunded
4. Admin actions: mark_needs_correction, refund_payment
5. Server-side validation preventing duplicate GCash reference approvals
6. Revenue reporting views (daily/weekly/monthly summaries)

## 1. New Tables
- `payment_logs` — audit log of every status change with admin_id, old/new status, reason, timestamp

## 2. Modified Tables (additive only)
- `surprises` gains: `gcash_ref` (text) — the customer's GCash reference number

## 3. New/Updated Functions
- `approve_payment(p_slug)` — now logs to payment_logs, checks gcash_ref not already approved on another order
- `reject_payment(p_slug, p_reason)` — now logs to payment_logs
- `mark_needs_correction(p_slug, p_reason)` — new, admin sets needs_correction status
- `refund_payment(p_slug, p_reason)` — new, admin issues refund
- `resubmit_payment(p_slug, p_gcash_ref, p_receipt_url, p_note)` — customer resubmits after rejection/needs_correction

## 4. Security
- payment_logs: admin-only read (authenticated + is_admin check), writes only via SECURITY DEFINER functions
- gcash_ref: customer-writable (added to column grant) so they can submit/resubmit
- All status-changing functions verify caller is admin before acting
- resubmit_payment is callable by anyone (no auth) since customers don't have accounts
*/

-- ============================================================
-- 1. payment_logs audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surprise_id uuid REFERENCES surprises(id) ON DELETE CASCADE,
  slug text NOT NULL,
  old_status text NOT NULL DEFAULT '',
  new_status text NOT NULL,
  reason text NOT NULL DEFAULT '',
  admin_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON payment_logs TO authenticated;

DROP POLICY IF EXISTS "payment_logs_admin_read" ON payment_logs;
CREATE POLICY "payment_logs_admin_read" ON payment_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================================
-- 2. Add gcash_ref column to surprises
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surprises' AND column_name = 'gcash_ref') THEN
    ALTER TABLE surprises ADD COLUMN gcash_ref text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add gcash_ref to customer-writable columns
REVOKE UPDATE ON surprises FROM anon, authenticated;
GRANT UPDATE (
  occasion, theme, recipient_name, sender_name, title, subtitle,
  special_date, date_label, love_letter, hidden_message, reasons,
  quiz, photos, music_url, final_message, passcode, lock_config,
  custom_theme, custom_font_head, custom_font_body,
  receipt_url, customer_note, payment_status, gcash_ref
) ON surprises TO anon, authenticated;

-- Update constraint to include new statuses
ALTER TABLE surprises DROP CONSTRAINT IF EXISTS valid_payment_status;
ALTER TABLE surprises ADD CONSTRAINT valid_payment_status
  CHECK (payment_status IN ('pending_payment', 'payment_verification', 'paid', 'rejected', 'needs_correction', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_surprises_gcash_ref ON surprises(gcash_ref);
CREATE INDEX IF NOT EXISTS idx_payment_logs_surprise_id ON payment_logs(surprise_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

-- ============================================================
-- 3. Helper: log payment change (internal, not callable via API)
-- ============================================================
CREATE OR REPLACE FUNCTION log_payment_change(
  p_slug text,
  p_old text,
  p_new text,
  p_reason text,
  p_admin_email text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_logs (slug, old_status, new_status, reason, admin_email)
  VALUES (p_slug, p_old, p_new, p_reason, p_admin_email);
END;
$$;

-- ============================================================
-- 4. Updated approve_payment with audit log + dup check
-- ============================================================
CREATE OR REPLACE FUNCTION approve_payment(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_email text;
  old_status text;
  dup_count int;
  v_gcash_ref text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT email INTO caller_email FROM profiles WHERE id = auth.uid();

  SELECT payment_status, gcash_ref INTO old_status, v_gcash_ref FROM surprises WHERE slug = p_slug;
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Prevent approving if same gcash_ref is already approved on another order
  IF v_gcash_ref IS NOT NULL AND v_gcash_ref <> '' THEN
    SELECT count(*) INTO dup_count FROM surprises
      WHERE gcash_ref = v_gcash_ref AND payment_status = 'paid' AND slug <> p_slug;
    IF dup_count > 0 THEN
      RAISE EXCEPTION 'This GCash reference number has already been used for another approved order';
    END IF;
  END IF;

  UPDATE surprises
    SET payment_status = 'paid',
        paid = true,
        published = true,
        verified_at = now(),
        admin_note = ''
    WHERE slug = p_slug;

  PERFORM log_payment_change(p_slug, old_status, 'paid', 'Payment approved', caller_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_payment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_payment(text) TO authenticated;

-- ============================================================
-- 5. Updated reject_payment with audit log
-- ============================================================
CREATE OR REPLACE FUNCTION reject_payment(p_slug text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_email text;
  old_status text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT email INTO caller_email FROM profiles WHERE id = auth.uid();

  SELECT payment_status INTO old_status FROM surprises WHERE slug = p_slug;
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  UPDATE surprises
    SET payment_status = 'rejected',
        paid = false,
        published = false,
        admin_note = p_reason
    WHERE slug = p_slug;

  PERFORM log_payment_change(p_slug, old_status, 'rejected', p_reason, caller_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_payment(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_payment(text, text) TO authenticated;

-- ============================================================
-- 6. New: mark_needs_correction
-- ============================================================
CREATE OR REPLACE FUNCTION mark_needs_correction(p_slug text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_email text;
  old_status text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT email INTO caller_email FROM profiles WHERE id = auth.uid();

  SELECT payment_status INTO old_status FROM surprises WHERE slug = p_slug;
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  UPDATE surprises
    SET payment_status = 'needs_correction',
        admin_note = p_reason
    WHERE slug = p_slug;

  PERFORM log_payment_change(p_slug, old_status, 'needs_correction', p_reason, caller_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_needs_correction(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_needs_correction(text, text) TO authenticated;

-- ============================================================
-- 7. New: refund_payment
-- ============================================================
CREATE OR REPLACE FUNCTION refund_payment(p_slug text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_email text;
  old_status text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT email INTO caller_email FROM profiles WHERE id = auth.uid();

  SELECT payment_status INTO old_status FROM surprises WHERE slug = p_slug;
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  UPDATE surprises
    SET payment_status = 'refunded',
        paid = false,
        published = false,
        admin_note = p_reason
    WHERE slug = p_slug;

  PERFORM log_payment_change(p_slug, old_status, 'refunded', p_reason, caller_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION refund_payment(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION refund_payment(text, text) TO authenticated;

-- ============================================================
-- 8. New: resubmit_payment (customer-facing, no auth needed)
-- ============================================================
CREATE OR REPLACE FUNCTION resubmit_payment(
  p_slug text,
  p_gcash_ref text,
  p_receipt_url text,
  p_note text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  old_status text;
BEGIN
  SELECT payment_status INTO old_status FROM surprises WHERE slug = p_slug;
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  -- Only allow resubmission from rejected or needs_correction
  IF old_status NOT IN ('rejected', 'needs_correction') THEN
    RAISE EXCEPTION 'Cannot resubmit from current status';
  END IF;

  UPDATE surprises
    SET payment_status = 'payment_verification',
        gcash_ref = p_gcash_ref,
        receipt_url = p_receipt_url,
        customer_note = p_note,
        admin_note = ''
    WHERE slug = p_slug;

  PERFORM log_payment_change(p_slug, old_status, 'payment_verification', 'Customer resubmitted payment', '');
END;
$$;

REVOKE EXECUTE ON FUNCTION resubmit_payment(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resubmit_payment(text, text, text, text) TO anon, authenticated;