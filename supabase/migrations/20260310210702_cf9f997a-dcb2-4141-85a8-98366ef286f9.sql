
-- ===== 4.4 Agent Materials =====
CREATE TABLE public.agent_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  material_type text NOT NULL CHECK (material_type IN ('business_card', 'headshot', 'intro_poster', 'deal_poster', 'custom')),
  title text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own materials" ON public.agent_materials FOR ALL TO authenticated
  USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Anyone can view materials" ON public.agent_materials FOR SELECT TO authenticated
  USING (true);

-- Agent profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headshot_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS languages text,
  ADD COLUMN IF NOT EXISTS specialties text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS wechat text;

-- ===== 4.6 Events =====
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'activity' CHECK (event_type IN ('activity', 'training', 'admin')),
  location text,
  is_online boolean DEFAULT false,
  meeting_link text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can manage events" ON public.events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'pm')) WITH CHECK (has_role(auth.uid(), 'pm'));

CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'not_going')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rsvps" ON public.event_rsvps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "All can view rsvps" ON public.event_rsvps FOR SELECT TO authenticated USING (true);

-- ===== 4.7 Resource & Training =====
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('insurance', 'mortgage', 'inspector', 'lawyer', 'moving', 'contractor', 'other')),
  phone text,
  email text,
  wechat_qr_url text,
  logo_url text,
  description text,
  specialties text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can manage vendors" ON public.vendors FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'pm')) WITH CHECK (has_role(auth.uid(), 'pm'));

CREATE TABLE public.training_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('system', 'sales', 'market', 'compliance', 'general')),
  video_url text NOT NULL,
  thumbnail_url text,
  description text,
  duration_seconds integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view videos" ON public.training_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can manage videos" ON public.training_videos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'pm')) WITH CHECK (has_role(auth.uid(), 'pm'));

CREATE TABLE public.video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.training_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  progress_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.video_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.resource_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('business_card_template', 'contract', 'brand_kit', 'guide', 'general')),
  file_url text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resource_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view documents" ON public.resource_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can manage documents" ON public.resource_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'pm')) WITH CHECK (has_role(auth.uid(), 'pm'));

-- Storage bucket for agent materials
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-materials', 'agent-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agents upload own materials" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-materials' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view agent materials" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'agent-materials');
CREATE POLICY "Agents delete own materials" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agent-materials' AND (storage.foldername(name))[1] = auth.uid()::text);
