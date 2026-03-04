
-- Create enums
CREATE TYPE public.app_role AS ENUM ('pm', 'agent');
CREATE TYPE public.listing_type AS ENUM ('company_exclusive', 'featured', 'agent_exclusive');
CREATE TYPE public.promo_tag AS ENUM ('limited_offer', 'rare', 'new_development');
CREATE TYPE public.listing_area AS ENUM ('LIC', 'Manhattan', 'Jersey City', 'Long Island');
CREATE TYPE public.listing_status AS ENUM ('active', 'inactive');
CREATE TYPE public.client_stage AS ENUM ('new_lead', 'contacted', 'touring', 'negotiating', 'signed', 'paused');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'agent',
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles table (for security checks)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Also sync role to user_roles from profiles
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- Listings table
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT,
  cover_image TEXT,
  listing_type listing_type NOT NULL DEFAULT 'featured',
  promo_tag promo_tag,
  area listing_area NOT NULL DEFAULT 'Manhattan',
  price NUMERIC,
  beds INTEGER,
  baths INTEGER,
  status listing_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can view active listings" ON public.listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "PMs can insert listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'pm'));
CREATE POLICY "PMs can update listings" ON public.listings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'pm'));
CREATE POLICY "PMs can delete listings" ON public.listings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'pm'));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  source TEXT,
  needs_summary TEXT,
  stage client_stage NOT NULL DEFAULT 'new_lead',
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_followup_date DATE,
  reminder_interval_days INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view own clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = agent_id OR public.has_role(auth.uid(), 'pm'));
CREATE POLICY "Agents can insert own clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Agents can update own clients" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = agent_id);
CREATE POLICY "Agents can delete own clients" ON public.clients FOR DELETE TO authenticated USING (auth.uid() = agent_id);

-- Client attachments
CREATE TABLE public.client_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.client_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view own client attachments" ON public.client_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_attachments.client_id AND clients.agent_id = auth.uid()));
CREATE POLICY "Agents can insert own client attachments" ON public.client_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_attachments.client_id AND clients.agent_id = auth.uid()));

-- Follow-up logs
CREATE TABLE public.followup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.followup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view own followup logs" ON public.followup_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = followup_logs.client_id AND clients.agent_id = auth.uid()));
CREATE POLICY "Agents can insert own followup logs" ON public.followup_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = followup_logs.client_id AND clients.agent_id = auth.uid()));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'reminder',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for client attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('client-attachments', 'client-attachments', false);
CREATE POLICY "Agents can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-attachments');
CREATE POLICY "Agents can view own attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-attachments');
