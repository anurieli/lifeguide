-- Add the admin user
INSERT INTO admin_users (email, created_at)
VALUES ('anurieli365@gmail.com', NOW())
ON CONFLICT (email) DO NOTHING; 