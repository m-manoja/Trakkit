-- Insert the existing auth user into public.users table
-- This will fix the foreign key constraint issue for existing users

INSERT INTO public.users (id, phone, profile_completed, created_at, updated_at)
SELECT 
  id,
  phone,
  false as profile_completed,
  created_at,
  now() as updated_at
FROM auth.users 
WHERE id = '9f2f22c5-dd2b-403a-b524-50a9f2cc7969'
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = '9f2f22c5-dd2b-403a-b524-50a9f2cc7969'
);

-- Verify the insertion
SELECT * FROM public.users WHERE id = '9f2f22c5-dd2b-403a-b524-50a9f2cc7969';
