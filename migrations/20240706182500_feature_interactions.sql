-- Create user_feature_interactions table to track user interactions with features
CREATE TABLE IF NOT EXISTS user_feature_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES coming_soon(id) ON DELETE CASCADE,
  has_upvoted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_id)
);

-- Enable RLS
ALTER TABLE user_feature_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_feature_interactions
-- Users can view their own interactions
CREATE POLICY "Users can view their own interactions" 
ON user_feature_interactions 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can insert their own interactions
CREATE POLICY "Users can create their own interactions" 
ON user_feature_interactions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own interactions
CREATE POLICY "Users can update their own interactions" 
ON user_feature_interactions 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Function to increment feature likes (for both auth and anon users)
CREATE OR REPLACE FUNCTION increment_feature_likes(feature_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coming_soon
  SET likes = likes + 1
  WHERE id = feature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement feature likes (for both auth and anon users)
CREATE OR REPLACE FUNCTION decrement_feature_likes(feature_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coming_soon
  SET likes = GREATEST(0, likes - 1)
  WHERE id = feature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add an upvote (authenticated users only)
-- This removes any existing upvote from other features
CREATE OR REPLACE FUNCTION add_feature_upvote(feature_id UUID, user_id UUID)
RETURNS VOID AS $$
DECLARE
  previously_upvoted_id UUID;
  feature_exists BOOLEAN;
BEGIN
  -- First check if the feature exists
  SELECT EXISTS(SELECT 1 FROM coming_soon WHERE id = add_feature_upvote.feature_id) INTO feature_exists;
  
  IF NOT feature_exists THEN
    RAISE EXCEPTION 'Feature with ID % does not exist', add_feature_upvote.feature_id;
  END IF;

  -- Check if user has upvoted any other feature
  SELECT feature_id INTO previously_upvoted_id
  FROM user_feature_interactions
  WHERE user_id = add_feature_upvote.user_id AND has_upvoted = TRUE;
  
  -- If there was a previous upvote, remove it
  IF previously_upvoted_id IS NOT NULL AND previously_upvoted_id != add_feature_upvote.feature_id THEN
    -- Decrement the upvote count on the previous feature
    UPDATE coming_soon
    SET upvotes = GREATEST(0, upvotes - 1)
    WHERE id = previously_upvoted_id;
    
    -- Update the user interaction record
    UPDATE user_feature_interactions
    SET has_upvoted = FALSE, updated_at = NOW()
    WHERE user_id = add_feature_upvote.user_id AND feature_id = previously_upvoted_id;
  END IF;
  
  -- Increment upvote on the selected feature
  UPDATE coming_soon
  SET upvotes = upvotes + 1
  WHERE id = add_feature_upvote.feature_id;
  
  -- Insert or update the user interaction record
  INSERT INTO user_feature_interactions (user_id, feature_id, has_upvoted)
  VALUES (add_feature_upvote.user_id, add_feature_upvote.feature_id, TRUE)
  ON CONFLICT (user_id, feature_id) 
  DO UPDATE SET has_upvoted = TRUE, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove an upvote (authenticated users only)
CREATE OR REPLACE FUNCTION remove_feature_upvote(feature_id UUID, user_id UUID)
RETURNS VOID AS $$
DECLARE
  feature_exists BOOLEAN;
  interaction_exists BOOLEAN;
BEGIN
  -- First check if the feature exists
  SELECT EXISTS(SELECT 1 FROM coming_soon WHERE id = remove_feature_upvote.feature_id) INTO feature_exists;
  
  IF NOT feature_exists THEN
    RAISE EXCEPTION 'Feature with ID % does not exist', remove_feature_upvote.feature_id;
  END IF;
  
  -- Check if the interaction record exists
  SELECT EXISTS(
    SELECT 1 FROM user_feature_interactions 
    WHERE user_id = remove_feature_upvote.user_id AND feature_id = remove_feature_upvote.feature_id
  ) INTO interaction_exists;
  
  -- Only decrement and update if interaction exists
  IF interaction_exists THEN
    -- Decrement the upvote count
    UPDATE coming_soon
    SET upvotes = GREATEST(0, upvotes - 1)
    WHERE id = remove_feature_upvote.feature_id;
    
    -- Update the user interaction record
    UPDATE user_feature_interactions
    SET has_upvoted = FALSE, updated_at = NOW()
    WHERE user_id = remove_feature_upvote.user_id AND feature_id = remove_feature_upvote.feature_id;
  ELSE
    -- Create a record with has_upvoted = false
    INSERT INTO user_feature_interactions (user_id, feature_id, has_upvoted)
    VALUES (remove_feature_upvote.user_id, remove_feature_upvote.feature_id, FALSE);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 