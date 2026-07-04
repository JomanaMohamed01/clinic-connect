-- Run once in Supabase SQL Editor to enable reception@reserve.com staff access.
-- Updates RPC helpers used by the /reception desk page.

CREATE OR REPLACE FUNCTION public.is_reception_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND (
        lower(trim(coalesce(u.email, ''))) IN (
          'reception@reserve.com',
          'reception@clinic.com'
        )
        OR coalesce(u.raw_user_meta_data->>'role', '') = 'reception'
        OR coalesce(u.raw_app_meta_data->>'role', '') = 'reception'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_reception_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_reception_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.reception_create_booking(
  p_doctor_id uuid,
  p_slot_start timestamptz,
  p_first_name text,
  p_last_name text,
  p_age integer,
  p_gender text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_reception_user() THEN
    RAISE EXCEPTION 'Forbidden: reception staff only' USING ERRCODE = '42501';
  END IF;

  IF trim(coalesce(p_first_name, '')) = '' OR trim(coalesce(p_last_name, '')) = '' THEN
    RAISE EXCEPTION 'First and last name are required' USING ERRCODE = '23502';
  END IF;

  IF p_age IS NULL OR p_age < 1 OR p_age > 150 THEN
    RAISE EXCEPTION 'Invalid age' USING ERRCODE = '23502';
  END IF;

  IF trim(coalesce(p_gender, '')) = '' THEN
    RAISE EXCEPTION 'Gender is required' USING ERRCODE = '23502';
  END IF;

  INSERT INTO public.bookings (
    patient_id,
    doctor_id,
    slot_start,
    first_name,
    last_name,
    age,
    gender,
    notes
  )
  VALUES (
    auth.uid(),
    p_doctor_id,
    p_slot_start,
    trim(p_first_name),
    trim(p_last_name),
    p_age,
    trim(p_gender),
    nullif(trim(coalesce(p_notes, '')), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reception_create_booking(uuid, timestamptz, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reception_create_booking(uuid, timestamptz, text, text, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reception_cancel_booking(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_reception_user() THEN
    RAISE EXCEPTION 'Forbidden: reception staff only' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.bookings WHERE id = booking_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reception_cancel_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reception_cancel_booking(uuid) TO authenticated;
