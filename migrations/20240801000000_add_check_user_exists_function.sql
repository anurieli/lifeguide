-- Add a function to check if a user exists by email and return their name
-- This function can be called from server-side code to check if a user exists
-- without needing to expose sensitive user data

-- Create the function
CREATE OR REPLACE FUNCTION public.check_user_exists(email_to_check TEXT)
RETURNS TABLE(user_exists BOOLEAN, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user exists in auth.users table and get their name
  RETURN QUERY
  SELECT 
    TRUE as user_exists,
    COALESCE(
      (u.raw_user_meta_data->>'name')::TEXT, 
      (u.raw_user_meta_data->>'full_name')::TEXT,
      email_to_check
    ) as user_name
  FROM auth.users u
  WHERE u.email = email_to_check;
  
  -- If no rows returned, return false with null name
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO service_role;

-- Add comment to the function
COMMENT ON FUNCTION public.check_user_exists IS 'Checks if a user with the given email exists in the auth.users table and returns their name if found'; 