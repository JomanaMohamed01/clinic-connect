-- Run once in the Supabase SQL Editor.
-- Lets a signed-in patient delete their own login and every public row tied to it.
-- The browser calls this with supabase.rpc("delete_own_account").

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = uid
      AND (
        lower(trim(coalesce(u.email, ''))) IN (
          'reception@reserve.com',
          'reception@clinic.com'
        )
        OR coalesce(u.raw_user_meta_data->>'role', '') = 'reception'
        OR coalesce(u.raw_app_meta_data->>'role', '') = 'reception'
      )
  ) THEN
    RAISE EXCEPTION 'The reception desk account cannot be deleted from the app.'
      USING ERRCODE = '42501';
  END IF;

  -- Appointments are stored on patient_id even if that column has no foreign key.
  DELETE FROM public.bookings WHERE patient_id = uid;

  -- Any other public table with a foreign key to auth.users.
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a
      ON a.attrelid = c.oid
     AND a.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND con.confrelid = 'auth.users'::regclass
      AND n.nspname = 'public'
      AND c.relkind = 'r'
      AND array_length(con.conkey, 1) = 1
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE %I = $1',
      rec.schema_name,
      rec.table_name,
      rec.column_name
    )
    USING uid;
  END LOOP;

  -- Removes the login, user metadata, identities, sessions, and refresh tokens.
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
