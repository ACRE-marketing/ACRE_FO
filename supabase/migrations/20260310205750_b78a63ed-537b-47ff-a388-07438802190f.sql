
-- Step 1: Create new enum type
CREATE TYPE public.client_stage_new AS ENUM ('active', 'opportunity', 'lost', 'pending');

-- Step 2: Add new columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_channel text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS client_occupation text,
  ADD COLUMN IF NOT EXISTS target_area text,
  ADD COLUMN IF NOT EXISTS contact_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS budget text,
  ADD COLUMN IF NOT EXISTS preferred_unit_type text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS wechat text;

-- Step 3: Add temporary column with new type
ALTER TABLE public.clients ADD COLUMN stage_new client_stage_new NOT NULL DEFAULT 'active';

-- Step 4: Migrate data
UPDATE public.clients SET stage_new = CASE
  WHEN stage IN ('new_lead', 'contacted', 'touring') THEN 'active'::client_stage_new
  WHEN stage = 'negotiating' THEN 'opportunity'::client_stage_new
  WHEN stage = 'signed' THEN 'lost'::client_stage_new
  WHEN stage = 'paused' THEN 'pending'::client_stage_new
  ELSE 'active'::client_stage_new
END;

-- Step 5: Drop old column and rename new one
ALTER TABLE public.clients DROP COLUMN stage;
ALTER TABLE public.clients RENAME COLUMN stage_new TO stage;

-- Step 6: Drop old enum type
DROP TYPE public.client_stage;

-- Step 7: Rename new enum to original name
ALTER TYPE public.client_stage_new RENAME TO client_stage;
