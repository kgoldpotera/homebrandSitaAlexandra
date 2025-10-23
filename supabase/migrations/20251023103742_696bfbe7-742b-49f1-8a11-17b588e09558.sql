-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add brand_id to products table
ALTER TABLE public.products
ADD COLUMN brand_id UUID REFERENCES public.brands(id);

-- Enable RLS on brands table
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Anyone can view brands
CREATE POLICY "Anyone can view brands"
ON public.brands
FOR SELECT
USING (true);

-- Only admins can manage brands
CREATE POLICY "Only admins can manage brands"
ON public.brands
FOR ALL
USING (is_admin(auth.uid()));

-- Insert the brand subcategories from the categories table
INSERT INTO public.brands (name, slug, image_url)
VALUES
  ('Botanic & Bullinjon', 'botanic-bullinjon', NULL),
  ('Bubble n Bands', 'bubble-n-bands', NULL),
  ('Championship Stadium Concerts', 'championship-stadium-concerts', NULL),
  ('Dianise Athen', 'dianise-athen', NULL),
  ('Flowers & Golion', 'flowers-golion', NULL),
  ('Homebrandsitaalexandra', 'homebrandsitaalexandra', NULL),
  ('House of Legallevon', 'house-of-legallevon', NULL),
  ('My Kitchen Aluminium', 'my-kitchen-aluminium', NULL),
  ('Oleriora', 'oleriora', NULL),
  ('SitaAlexandra', 'sitaalexandra', NULL);