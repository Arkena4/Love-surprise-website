/*
# Fix access-code generation, private grants, and payment action reliability

1. Access-code generation
- Replaces the invalid hexadecimal conversion used by generate_access_code.
- Keeps server-side UUID-derived randomness, 16-character codes, and collision checks.

2. Private data grants
- Removes direct anon and authenticated table-wide access to access_codes.
- Removes direct public access to payment_logs.
- Admins use protected functions for mutations; authenticated admins can read the dashboard records.

3. Payment action reliability
- Replaces approval and rejection functions with versions that validate the admin,
  update the order, and write a correctly linked audit record.
- No orders or customer content are deleted.
*/

REVOKE ALL ON access_codes FROM anon, authenticated;
GRANT SELECT ON access_codes TO authenticated;

DROP POLICY IF EXISTS "access_codes_admin_all" ON access_codes;
CREATE POLICY "access_codes_admin_all" ON access_codes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

REVOKE ALL ON payment_logs FROM anon, authenticated;
GRANT SELECT ON payment_logs TO authenticated;

DROP POLICY IF EXISTS "payment_logs_admin_read" ON payment_logs;
CREATE POLICY "payment_logs_admin_read" ON payment_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  v_hash text;
  v_digit text;
  v_index int;
  i int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR i IN 1..5 LOOP
    v_hash := md5(gen_random_uuid()::text || gen_random_uuid()::text);
    v_code := '';
    FOR j IN 1..16 LOOP
      v_digit := substr(v_hash, j, 1);
      v_index := ((strpos('0123456789abcdef', v_digit) - 1) % char_length(v_chars)) + 1;
      v_code := v_code || substr(v_chars, v_index, 1);
    END LOOP;

    SELECT EXISTS (SELECT 1 FROM access_codes WHERE code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      INSERT INTO access_codes (code, created_by) VALUES (v_code, auth.uid());
      RETURN v_code;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Could not generate a unique code';
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_access_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_access_code() TO authenticated;

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
  INSERT INTO payment_logs (surprise_id, slug, old_status, new_status, reason, admin_email)
  SELECT id, slug, p_old, p_new, p_reason, p_admin_email
  FROM surprises
  WHERE slug = p_slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION log_payment_change(text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION approve_payment(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_gcash_ref text;
  v_admin_email text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT payment_status, gcash_ref INTO v_old_status, v_gcash_ref
  FROM surprises WHERE slug = p_slug FOR UPDATE;
  IF v_old_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_gcash_ref <> '' AND EXISTS (
    SELECT 1 FROM surprises
    WHERE gcash_ref = v_gcash_ref AND payment_status = 'paid' AND slug <> p_slug
  ) THEN
    RAISE EXCEPTION 'This GCash reference number has already been used';
  END IF;

  SELECT email INTO v_admin_email FROM profiles WHERE id = auth.uid();
  UPDATE surprises SET payment_status = 'paid', paid = true, published = true,
    verified_at = now(), admin_note = '' WHERE slug = p_slug;
  PERFORM log_payment_change(p_slug, v_old_status, 'paid', 'Payment approved', v_admin_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_payment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_payment(text) TO authenticated;

CREATE OR REPLACE FUNCTION reject_payment(p_slug text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_admin_email text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF nullif(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;

  SELECT payment_status INTO v_old_status FROM surprises WHERE slug = p_slug FOR UPDATE;
  IF v_old_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT email INTO v_admin_email FROM profiles WHERE id = auth.uid();
  UPDATE surprises SET payment_status = 'rejected', paid = false, published = false,
    verified_at = NULL, admin_note = trim(p_reason) WHERE slug = p_slug;
  PERFORM log_payment_change(p_slug, v_old_status, 'rejected', trim(p_reason), v_admin_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_payment(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_payment(text, text) TO authenticated;