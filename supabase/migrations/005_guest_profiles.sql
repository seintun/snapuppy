-- Add is_guest column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false;

-- Optional: you could add a comment
COMMENT ON COLUMN profiles.is_guest IS 'Flag indicating this user is using anonymous/guest login';