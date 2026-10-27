/*
# Fix: revoke public execute on internal log_payment_change function

The log_payment_change function is an internal helper called only by other
SECURITY DEFINER functions. It should not be callable directly via the API.

1. Security changes
- REVOKE EXECUTE on log_payment_change from PUBLIC and anon
- Keep it callable internally by SECURITY DEFINER functions (they run as the
  function owner, so they bypass the EXECUTE grant requirement)
*/

REVOKE EXECUTE ON FUNCTION log_payment_change(text, text, text, text, text) FROM PUBLIC, anon;