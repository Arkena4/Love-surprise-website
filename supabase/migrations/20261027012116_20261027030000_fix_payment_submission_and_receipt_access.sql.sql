/*
# Fix payment submission flow and protect receipts

1. Payment submission
- Allow a first payment submission from `pending_payment`.
- Keep corrected submissions supported from `rejected` and `needs_correction`.
- Always return the order to `payment_verification` without approving it.

2. Admin setup visibility
- Add `can_claim_initial_admin()` so the login screen only shows the one-time
  claim action when no administrator exists.

3. Receipt security
- Make the receipts bucket private.
- Remove public receipt reads.
- Allow only authenticated administrators to read receipt files.
- Customer pages no longer depend on predictable public receipt URLs.

4. Data safety
- Existing receipt files and paths are preserved.
- No orders, submissions, or review history are deleted.
*/

-- Allow the initial submission as well as corrected submissions.
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

  IF old_status NOT IN ('pending_payment', 'rejected', 'needs_correction') THEN
    RAISE EXCEPTION 'Cannot resubmit from current status';
  END IF;

  UPDATE surprises
    SET payment_status = 'payment_verification',
        gcash_ref = trim(p_gcash_ref),
        receipt_url = p_receipt_url,
        customer_note = p_note,
        admin_note = '',
        paid = false,
        published = false
    WHERE slug = p_slug;

  PERFORM log_payment_change(p_slug, old_status, 'payment_verification', 'Customer submitted payment proof', '');
END;
$$;

REVOKE EXECUTE ON FUNCTION resubmit_payment(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resubmit_payment(text, text, text, text) TO anon, authenticated;

-- Report whether the one-time initial admin claim is still available.
CREATE OR REPLACE FUNCTION can_claim_initial_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin');
$$;

REVOKE EXECUTE ON FUNCTION can_claim_initial_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_claim_initial_admin() TO authenticated;

-- Make the receipt bucket private and restrict reads to admins.
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

DROP POLICY IF EXISTS "receipts_read_all" ON storage.objects;
DROP POLICY IF EXISTS "receipts_admin_read" ON storage.objects;
CREATE POLICY "receipts_admin_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "receipts_insert_own" ON storage.objects;
CREATE POLICY "receipts_insert_own" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;
CREATE POLICY "receipts_update_own" ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');