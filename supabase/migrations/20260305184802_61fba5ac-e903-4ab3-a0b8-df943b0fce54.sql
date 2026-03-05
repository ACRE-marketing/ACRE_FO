-- Create a temporary bucket for listing document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-docs', 'listing-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload listing docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-docs');

-- Allow authenticated users to read their uploads  
CREATE POLICY "Authenticated users can read listing docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'listing-docs');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete listing docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-docs');