/*
# Repair missing profile rows for existing accounts

- Creates a customer profile for any existing auth account that does not yet have one.
- Does not grant admin access automatically.
- The existing one-time Claim Admin Access flow remains the only way to become the first administrator.
- No customer content or orders are changed.
*/

INSERT INTO public.profiles (id, email, role)
SELECT id, COALESCE(email, ''), 'customer'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
);
