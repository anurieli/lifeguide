-- Create a function to safely delete features
-- This function uses SECURITY DEFINER to bypass RLS policies
-- It can be called by authenticated users to delete features

create or replace function public.delete_feature(feature_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  -- Check if the user is authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete the feature and get the count of deleted rows
  delete from public.coming_soon
  where id = feature_id
  returning 1 into deleted_count;
  
  -- Return true if a row was deleted, false otherwise
  return deleted_count = 1;
exception
  when others then
    -- Log the error for debugging
    raise notice 'Error deleting feature %: %', feature_id, sqlerrm;
    return false;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.delete_feature(uuid) to authenticated;

-- Add comment explaining the function
comment on function public.delete_feature(uuid) is 'Deletes a feature from the coming_soon table. Returns true if successful, false otherwise.'; 