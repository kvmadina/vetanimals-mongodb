-- ===========================================================================
-- VetAnimals — Shop seed data
-- ===========================================================================
-- Inserts realistic pet-care categories and products into the EXISTING schema
-- (public.categories / public.products). Safe to run multiple times:
--   * categories are skipped when a category with the same name already exists
--   * products are skipped when a product with the same name already exists
-- No existing rows are deleted or modified. No schema changes.
--
-- HOW TO RUN:
--   Option A (recommended): Supabase Dashboard -> SQL Editor -> paste + Run
--   Option B (CLI):          supabase db execute --file supabase/seed/products.sql
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. CATEGORIES (idempotent — name is UNIQUE in the schema)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, description)
VALUES
  ('Food',            'food',            'Nutritious food for every species.'),
  ('Treats',          'treats',          'Rewards and training treats.'),
  ('Toys',            'toys',            'Toys that keep pets active and happy.'),
  ('Accessories',     'accessories',     'Collars, bowls, carriers and everyday gear.'),
  ('Hygiene',         'hygiene',         'Grooming, litter and cleanliness essentials.'),
  ('Health & Care',   'health-care',     'Supplements and wellness products.'),
  ('Beds & Comfort',  'beds-comfort',    'Cozy beds and comfort essentials.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. SAFETY CHECK: fail loudly if any referenced category cannot be resolved
--    (instead of silently skipping product rows via the JOIN below).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing integer;
BEGIN
  SELECT count(*) INTO missing
  FROM (VALUES
    ('Food'), ('Treats'), ('Toys'), ('Accessories'),
    ('Hygiene'), ('Health & Care'), ('Beds & Comfort')
  ) AS t(name)
  LEFT JOIN public.categories c ON c.name = t.name
  WHERE c.id IS NULL;

  IF missing > 0 THEN
    RAISE EXCEPTION 'Seed aborted: % category name(s) could not be resolved in public.categories', missing;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. PRODUCTS (idempotent — skips products whose name already exists)
--    category_id is resolved from the category name; every product is
--    is_active = true with a positive price and stock.
-- ---------------------------------------------------------------------------
INSERT INTO public.products (category_id, name, description, price, image_url, stock, is_active, species)
SELECT c.id, v.name, v.description, v.price, v.image_url, v.stock, TRUE, v.species
FROM (VALUES
  -- Food
  ('Food', 'Premium Adult Dog Food', 'Complete and balanced dry food for adult dogs, with real chicken and essential vitamins.', 49.99, 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80&auto=format&fit=crop', 85, 'dog'),
  ('Food', 'Puppy Chicken Food', 'Specially formulated kibble for growing puppies, rich in protein and DHA.', 39.99, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80&auto=format&fit=crop', 60, 'dog'),
  ('Food', 'Cat Dry Food', 'Everyday dry food for adult cats with salmon and balanced minerals.', 34.99, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80&auto=format&fit=crop', 95, 'cat'),
  ('Food', 'Kitten Food', 'High-energy food for kittens up to 12 months, with extra taurine.', 29.99, 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80&auto=format&fit=crop', 70, 'cat'),
  ('Food', 'Bird Seed Mix', 'Premium seed blend for parakeets and small birds, fortified with vitamins.', 12.99, 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80&auto=format&fit=crop', 110, 'bird'),
  ('Food', 'Rabbit Hay', 'Timothy hay for rabbits and guinea pigs — high fibre for healthy digestion.', 18.99, 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=800&q=80&auto=format&fit=crop', 80, 'rabbit'),
  ('Food', 'Hamster Food Mix', 'Nutritious seed and grain mix for hamsters and gerbils.', 9.99, 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&q=80&auto=format&fit=crop', 120, 'hamster'),
  ('Food', 'Rabbit Food Pellets', 'High-fibre pellets with added vitamins for adult rabbits.', 16.99, 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&q=80&auto=format&fit=crop', 65, 'rabbit'),

  -- Treats
  ('Treats', 'Dental Chew Treats', 'Daily dental chews that help reduce plaque and tartar.', 14.99, 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80&auto=format&fit=crop', 75, 'dog'),
  ('Treats', 'Salmon Cat Treats', 'Soft salmon bites that cats love, ideal for training rewards.', 11.99, 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=800&q=80&auto=format&fit=crop', 90, 'cat'),
  ('Treats', 'Bird Millet Spray', 'Natural millet spray, a favourite treat for small birds.', 6.99, 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=800&q=80&auto=format&fit=crop', 100, 'bird'),
  ('Treats', 'Rabbit Treat Sticks', 'Yummy fruit and seed sticks for rabbits, great for bonding time.', 8.99, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80&auto=format&fit=crop', 85, 'rabbit'),

  -- Toys
  ('Toys', 'Interactive Dog Toy', 'Durable puzzle toy that keeps dogs entertained and mentally sharp.', 19.99, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80&auto=format&fit=crop', 55, 'dog'),
  ('Toys', 'Cat Scratching Toy', 'Cardboard scratcher with catnip, perfect for claw care.', 24.99, 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop', 40, 'cat'),
  ('Toys', 'Bird Swinging Perch', 'Natural wood swinging perch for small and medium birds.', 15.99, 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80&auto=format&fit=crop', 50, 'bird'),
  ('Toys', 'Hamster Running Wheel', 'Silent running wheel for hamsters and small rodents.', 22.99, 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&q=80&auto=format&fit=crop', 45, 'hamster'),
  ('Toys', 'Plush Squeaky Toy', 'Soft plush toy with a squeaker, for playful dogs of all sizes.', 12.49, 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&q=80&auto=format&fit=crop', 130, 'dog'),

  -- Accessories
  ('Accessories', 'Adjustable Dog Collar', 'Strong, adjustable nylon collar with a quick-release buckle.', 17.99, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80&auto=format&fit=crop', 95, 'dog'),
  ('Accessories', 'Cat Harness & Leash', 'Comfortable harness with matching leash for safe walks.', 21.99, 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&q=80&auto=format&fit=crop', 60, 'cat'),
  ('Accessories', 'Stainless Pet Bowl', 'Rust-proof stainless steel bowl with anti-slip base.', 13.99, 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80&auto=format&fit=crop', 140, 'dog'),
  ('Accessories', 'Small Pet Carrier', 'Ventilated carrier for small cats, with a soft liner and shoulder strap.', 45.99, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80&auto=format&fit=crop', 25, 'cat'),

  -- Hygiene
  ('Hygiene', 'Clumping Cat Litter', 'Odour-controlling clumping litter, low dust and easy to scoop.', 23.99, 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&q=80&auto=format&fit=crop', 75, 'cat'),
  ('Hygiene', 'Gentle Dog Shampoo', 'pH-balanced oat shampoo for sensitive skin, no harsh chemicals.', 15.99, 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=800&q=80&auto=format&fit=crop', 88, 'dog'),
  ('Hygiene', 'Pet Grooming Brush', 'Dual-sided grooming brush that removes loose fur and tangles.', 11.49, 'https://images.unsplash.com/photo-1560053608-13721e0d69e8?w=800&q=80&auto=format&fit=crop', 105, 'dog'),
  ('Hygiene', 'Bird Cage Liner', 'Absorbent paper liner sheets that keep the cage fresh and clean.', 9.99, 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=800&q=80&auto=format&fit=crop', 70, 'bird'),

  -- Health & Care
  ('Health & Care', 'Dog Joint Supplement', 'Glucosamine and chondroitin chews for healthy joints.', 27.99, 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&q=80&auto=format&fit=crop', 50, 'dog'),
  ('Health & Care', 'Cat Hairball Paste', 'Palatable malt paste that helps prevent hairballs.', 13.49, 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=800&q=80&auto=format&fit=crop', 62, 'cat'),
  ('Health & Care', 'Flea & Tick Spray', 'Vet-grade spray for dogs that repels fleas, ticks and mosquitoes.', 19.49, 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800&q=80&auto=format&fit=crop', 45, 'dog'),

  -- Beds & Comfort
  ('Beds & Comfort', 'Orthopedic Dog Bed', 'Memory foam bed with washable cover for joint support.', 59.99, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80&auto=format&fit=crop', 30, 'dog'),
  ('Beds & Comfort', 'Cozy Cat Cave Bed', 'Snuggly cave-shaped bed that keeps cats warm and secure.', 34.99, 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop', 40, 'cat')
) AS v(category_name, name, description, price, image_url, stock, species)
JOIN public.categories c ON c.name = v.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.products p WHERE p.name = v.name
);

COMMIT;

-- ===========================================================================
-- VERIFICATION (run after the seed to confirm):
-- SELECT 'categories' AS entity, count(*) FROM public.categories
-- UNION ALL SELECT 'products', count(*) FROM public.products;
--
-- SELECT count(*) AS products_without_category
-- FROM public.products WHERE category_id IS NULL;
--
-- SELECT name, count(*) FROM public.products
-- GROUP BY name HAVING count(*) > 1;
--
-- SELECT count(*) AS visible_active_products
-- FROM public.products WHERE is_active = true;
-- ===========================================================================
