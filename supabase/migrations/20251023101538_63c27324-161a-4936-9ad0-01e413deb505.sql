-- Add parent_id column to categories table to support subcategories
ALTER TABLE public.categories
ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- Insert main category: Brands
INSERT INTO public.categories (name, slug, parent_id)
VALUES ('Brands', 'brands', NULL);

-- Insert subcategories under Brands
-- First, get the id of Brands category we just created
WITH brands_category AS (
  SELECT id FROM public.categories WHERE slug = 'brands'
)
INSERT INTO public.categories (name, slug, parent_id)
SELECT name, slug, (SELECT id FROM brands_category)
FROM (VALUES
  ('House of Lepallevon', 'house-of-lepallevon'),
  ('Homebrandsitaalexandra', 'homebrandsitaalexandra'),
  ('Championship Stadium Concerts', 'championship-stadium-concerts'),
  ('SitaAlexandra', 'sitaalexandra'),
  ('Oleriora', 'oleriora'),
  ('Dianise Athen', 'dianise-athen'),
  ('Bubble n Bands', 'bubble-n-bands'),
  ('Botanic & Bullinjon', 'botanic-bullinjon'),
  ('My Kitchen Aluminium', 'my-kitchen-aluminium'),
  ('Flowers & Golion', 'flowers-golion')
) AS subcats(name, slug);