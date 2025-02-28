-- Function to increment upvotes for a feature
CREATE OR REPLACE FUNCTION increment_upvotes(feature_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE coming_soon
  SET upvotes = upvotes + 1
  WHERE id = feature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement upvotes for a feature
CREATE OR REPLACE FUNCTION decrement_upvotes(feature_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE coming_soon
  SET upvotes = GREATEST(upvotes - 1, 0)  -- Ensure we don't go below zero
  WHERE id = feature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment likes for a feature
CREATE OR REPLACE FUNCTION increment_likes(feature_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE coming_soon
  SET likes = likes + 1
  WHERE id = feature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement likes for a feature
CREATE OR REPLACE FUNCTION decrement_likes(feature_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE coming_soon
  SET likes = GREATEST(likes - 1, 0)  -- Ensure we don't go below zero
  WHERE id = feature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for the coming_soon table
-- Allow anyone to select from the table
CREATE POLICY "Allow public read access" ON coming_soon
  FOR SELECT USING (true);

-- Only allow authenticated users to update the table through the RPC functions
-- This is handled by the SECURITY DEFINER on the functions above

-- Insert some sample data if the table is empty
INSERT INTO coming_soon (feature_title, feature_description, use_case, upvotes, likes)
SELECT 
  'AI Progress Coach', 
  'An AI-powered coach that provides personalized feedback and suggestions based on your blueprint progress.', 
  'Get tailored advice when you feel stuck or need guidance on specific sections of your blueprint.',
  0, 
  0
WHERE NOT EXISTS (SELECT 1 FROM coming_soon LIMIT 1);

INSERT INTO coming_soon (feature_title, feature_description, use_case, upvotes, likes)
SELECT 
  'Blueprint Templates', 
  'Pre-made blueprint templates for different life situations and goals.', 
  'Jump-start your planning with templates designed for career transitions, relationship building, or health transformations.',
  0, 
  0
WHERE NOT EXISTS (SELECT 1 FROM coming_soon WHERE feature_title = 'Blueprint Templates');

INSERT INTO coming_soon (feature_title, feature_description, use_case, upvotes, likes)
SELECT 
  'Progress Visualization', 
  'Interactive charts and graphs to visualize your progress over time.', 
  'See how consistent you've been with your blueprint work and identify patterns in your personal development journey.',
  0, 
  0
WHERE NOT EXISTS (SELECT 1 FROM coming_soon WHERE feature_title = 'Progress Visualization');

INSERT INTO coming_soon (feature_title, feature_description, use_case, upvotes, likes)
SELECT 
  'Accountability Partners', 
  'Connect with others to share goals and hold each other accountable.', 
  'Pair up with someone who has similar goals to provide mutual support and motivation.',
  0, 
  0
WHERE NOT EXISTS (SELECT 1 FROM coming_soon WHERE feature_title = 'Accountability Partners');

INSERT INTO coming_soon (feature_title, feature_description, use_case, upvotes, likes)
SELECT 
  'Mobile App', 
  'Access your blueprint on the go with a dedicated mobile application.', 
  'Review and update your blueprint anytime, anywhere, even without internet access.',
  0, 
  0
WHERE NOT EXISTS (SELECT 1 FROM coming_soon WHERE feature_title = 'Mobile App');

INSERT INTO coming_soon (feature_title, feature_description, use_case, upvotes, likes)
SELECT 
  'Journaling Integration', 
  'Built-in journaling feature that connects your daily reflections to your blueprint.', 
  'Track how your daily experiences and thoughts relate to your larger life goals and values.',
  0, 
  0
WHERE NOT EXISTS (SELECT 1 FROM coming_soon WHERE feature_title = 'Journaling Integration'); 