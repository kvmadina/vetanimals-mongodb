-- ============================================================================
-- VetAnimals — Veterinary Discovery seed
-- Populates public.clinics and public.veterinarians.
--
-- SAFETY:
--   * Does NOT modify the schema, RLS, or any existing rows.
--   * Idempotent — safe to run repeatedly. Clinics/veterinarians that already
--     exist (matched by name) are skipped, never duplicated.
--   * Wrapped in a transaction; aborts loudly if a referenced clinic name
--     cannot be resolved.
--   * Coordinates are real city coordinates (clinics.latitude/longitude) so
--     the interactive map works. Websites/emails use the reserved .example
--     domain — placeholders that are clearly fictional.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. CLINICS
-- ---------------------------------------------------------------------------
INSERT INTO public.clinics (name, address, phone, email, website, latitude, longitude)
SELECT v.name, v.address, v.phone, v.email, v.website, v.latitude, v.longitude
FROM (VALUES
  ('Paws & Claws Veterinary Clinic', '1420 Maple Avenue, Austin, TX 78701', '(512) 555-0142', 'hello@pawscandclaws.example', 'https://www.pawscandclaws.example', 30.2672, -97.7431),
  ('Green Valley Animal Hospital', '88 Orchard Lane, Portland, OR 97205', '(503) 555-0178', 'care@greenvalley.example', 'https://www.greenvalley.example', 45.5231, -122.6765),
  ('Lakeside Pet Care Center', '5 Harborview Drive, Chicago, IL 60601', '(312) 555-0196', 'hello@lakesidepetcare.example', 'https://www.lakesidepetcare.example', 41.8781, -87.6298),
  ('Blue Oak Veterinary Group', '412 Cedar Street, Denver, CO 80202', '(720) 555-0134', 'team@blueoak.example', 'https://www.blueoakvet.example', 39.7392, -104.9903),
  ('Sunny Meadows Animal Clinic', '27 Meadowbrook Road, Raleigh, NC 27601', '(919) 555-0117', 'care@sunnymeadows.example', 'https://www.sunnymeadows.example', 35.7796, -78.6382),
  ('CityPaws Veterinary Hospital', '900 Market Street, San Francisco, CA 94102', '(415) 555-0129', 'hello@citypaws.example', 'https://www.citypaws.example', 37.7749, -122.4194),
  ('Hearth & Home Vet Clinic', '61 Elmwood Avenue, Nashville, TN 37203', '(615) 555-0153', 'hello@hearthandhome.example', 'https://www.hearthandhome.example', 36.1627, -86.7816),
  ('Harborview Animal Clinic', '340 Bay Street, Seattle, WA 98101', '(206) 555-0181', 'care@harborview.example', 'https://www.harborview.example', 47.6062, -122.3321)
) AS v(name, address, phone, email, website, latitude, longitude)
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinics c WHERE c.name = v.name
);

-- ---------------------------------------------------------------------------
-- 2. SAFETY GUARD
-- Every veterinarian must reference a clinic that actually exists (by name).
-- If a name in the list below can't be found, abort loudly instead of
-- silently dropping rows.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('Paws & Claws Veterinary Clinic'),
      ('Green Valley Animal Hospital'),
      ('Lakeside Pet Care Center'),
      ('Blue Oak Veterinary Group'),
      ('Sunny Meadows Animal Clinic'),
      ('CityPaws Veterinary Hospital'),
      ('Hearth & Home Vet Clinic'),
      ('Harborview Animal Clinic')
    ) AS v(clinic_name)
    LEFT JOIN public.clinics c ON c.name = v.clinic_name
    WHERE c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Seed aborted: one or more clinic names could not be resolved in public.clinics.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. VETERINARIANS
-- ---------------------------------------------------------------------------
INSERT INTO public.veterinarians (clinic_id, name, specialty, bio, avatar_url, license_number)
SELECT c.id, v.name, v.specialty, v.bio, v.avatar_url, v.license_number
FROM (VALUES
  ('Paws & Claws Veterinary Clinic', 'Dr. Maya Chen', 'general practice', 'General practice veterinarian focused on preventive wellness and everyday care for dogs and cats.', 'https://i.pravatar.cc/300?img=47', 'TX-48201'),
  ('Paws & Claws Veterinary Clinic', 'Dr. Daniel Okafor', 'surgery', 'Soft-tissue and orthopedic surgeon with a gentle, low-stress approach to surgical recovery.', 'https://i.pravatar.cc/300?img=12', 'TX-48202'),
  ('Paws & Claws Veterinary Clinic', 'Dr. Sofia Ramirez', 'dentistry', 'Veterinary dentistry including cleanings, extractions and oral-health education.', 'https://i.pravatar.cc/300?img=45', 'TX-48203'),
  ('Green Valley Animal Hospital', 'Dr. Emily Watson', 'internal medicine', 'Internal medicine specialist with a focus on chronic conditions and diagnostic workups.', 'https://i.pravatar.cc/300?img=44', 'OR-61203'),
  ('Green Valley Animal Hospital', 'Dr. James Park', 'cardiology', 'Cardiology consultations, echocardiography and long-term cardiac care for pets.', 'https://i.pravatar.cc/300?img=13', 'OR-61204'),
  ('Lakeside Pet Care Center', 'Dr. Rachel Kim', 'preventive care', 'Preventive medicine, vaccinations and wellness plans tailored to each pet.', 'https://i.pravatar.cc/300?img=49', 'IL-77301'),
  ('Lakeside Pet Care Center', 'Dr. Michael Torres', 'emergency & critical care', 'Emergency and critical care for urgent cases, available for same-day triage.', 'https://i.pravatar.cc/300?img=14', 'IL-77302'),
  ('Blue Oak Veterinary Group', 'Dr. Sarah Mitchell', 'dermatology', 'Dermatology services for allergies, skin and ear conditions.', 'https://i.pravatar.cc/300?img=48', 'CO-92501'),
  ('Blue Oak Veterinary Group', 'Dr. David Nguyen', 'behavior', 'Behavior consultations to help pets and their people build better routines.', 'https://i.pravatar.cc/300?img=15', 'CO-92502'),
  ('Sunny Meadows Animal Clinic', 'Dr. Laura Bennett', 'general practice', 'Compassionate general practice care with a special interest in senior pets.', 'https://i.pravatar.cc/300?img=43', 'NC-33601'),
  ('Sunny Meadows Animal Clinic', 'Dr. Chris Evans', 'ophthalmology', 'Eye care including exams, treatment of common conditions and post-operative checks.', 'https://i.pravatar.cc/300?img=16', 'NC-33602'),
  ('CityPaws Veterinary Hospital', 'Dr. Anita Desai', 'exotic animal medicine', 'Care for small mammals, birds and reptiles, from wellness visits to urgent concerns.', 'https://i.pravatar.cc/300?img=46', 'CA-94101'),
  ('CityPaws Veterinary Hospital', 'Dr. Robert Hughes', 'oncology', 'Oncology consultations and supportive treatment planning for pets with cancer.', 'https://i.pravatar.cc/300?img=17', 'CA-94102'),
  ('Hearth & Home Vet Clinic', 'Dr. Grace Thompson', 'general practice', 'Neighborhood general practice for dogs and cats, with a focus on family-centered care.', 'https://i.pravatar.cc/300?img=50', 'TN-37201'),
  ('Hearth & Home Vet Clinic', 'Dr. Omar Farouk', 'surgery', 'Routine and advanced surgical procedures with thorough pre- and post-operative care.', 'https://i.pravatar.cc/300?img=18', 'TN-37202'),
  ('Harborview Animal Clinic', 'Dr. Jessica Lane', 'emergency & critical care', 'Emergency medicine and intensive care, including after-hours stabilization.', 'https://i.pravatar.cc/300?img=42', 'WA-98101'),
  ('Harborview Animal Clinic', 'Dr. Kevin Brooks', 'preventive care', 'Wellness exams, parasite prevention and nutrition guidance for every life stage.', 'https://i.pravatar.cc/300?img=19', 'WA-98102')
) AS v(clinic_name, name, specialty, bio, avatar_url, license_number)
JOIN public.clinics c ON c.name = v.clinic_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.veterinarians p WHERE p.name = v.name
);

COMMIT;
