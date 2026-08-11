-- Migration Name: 20260811000000_avatar_storage
-- Description: Creates the "avatars" storage bucket for profile pictures and
-- the storage.objects policies that let each user manage their own folder
-- (avatars/<user_id>/...). Public read so avatar URLs render for everyone.
--
-- NOTE: storage policies can only be created once the bucket exists, so both
-- are in this single migration.

-- ---------------------------------------------------------------------------
-- 1. BUCKET
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. POLICIES
--    Path convention: avatars/<user_id>/avatar.<ext> — the first folder
--    segment is always the owning user's id.
-- ---------------------------------------------------------------------------

-- Anyone can read avatars (public bucket)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Authenticated users upload only into their own folder
DROP POLICY IF EXISTS "Authenticated users upload own avatars" ON storage.objects;
CREATE POLICY "Authenticated users upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users update only their own folder
DROP POLICY IF EXISTS "Authenticated users update own avatars" ON storage.objects;
CREATE POLICY "Authenticated users update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users delete only their own folder
DROP POLICY IF EXISTS "Authenticated users delete own avatars" ON storage.objects;
CREATE POLICY "Authenticated users delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
