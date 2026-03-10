
-- Tracking links table
CREATE TABLE public.tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  short_code text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own tracking links" ON public.tracking_links
  FOR ALL TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- Link clicks table
CREATE TABLE public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.tracking_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referer text
);

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own link clicks" ON public.link_clicks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tracking_links
    WHERE tracking_links.id = link_clicks.link_id AND tracking_links.agent_id = auth.uid()
  ));

-- Trigger to increment click count
CREATE OR REPLACE FUNCTION public.increment_click_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE tracking_links SET click_count = click_count + 1 WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_link_click AFTER INSERT ON public.link_clicks
  FOR EACH ROW EXECUTE FUNCTION public.increment_click_count();
