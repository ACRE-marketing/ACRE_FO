ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_password text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_mandatory boolean DEFAULT false;