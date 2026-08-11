// ---------------------------------------------------------------------------
// Avatar helpers (profile pictures).
// Uploads go to the "avatars" storage bucket at avatars/<user_id>/avatar.<ext>
// (see the 20260811000000_avatar_storage migration for the bucket + policies).
// The returned public URL is stored on public.profiles.avatar_url by the
// Settings page, and on public.veterinarians.avatar_url by the vet profile
// editor.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

const AVATARS_BUCKET = 'avatars'

/**
 * Upload (or replace) the user's avatar image.
 * @param {string} userId
 * @param {File} file
 * @returns {Promise<string>} the public URL of the uploaded avatar
 */
export async function uploadAvatar(userId, file) {
  if (!supabase) throw new Error('Supabase client not initialized')
  if (!userId || !file) throw new Error('A user and image file are required.')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/gi, '')
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type || 'image/jpeg' })
  if (error) throw error

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete every avatar file in the user's folder (e.g. when the avatar is
 * removed). Missing files are not an error.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteAvatarFiles(userId) {
  if (!supabase || !userId) return
  const { data, error } = await supabase.storage.from(AVATARS_BUCKET).list(userId)
  if (error) throw error
  const paths = (data ?? [])
    .filter((entry) => !entry.id.endsWith('/'))
    .map((entry) => `${userId}/${entry.name}`)
  if (paths.length === 0) return
  const { error: removeError } = await supabase.storage.from(AVATARS_BUCKET).remove(paths)
  if (removeError) throw removeError
}

/** Validate an avatar image file (type + size). Returns a message or null. */
export function validateAvatarFile(file) {
  if (!file) return 'Choose an image file first.'
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
    return 'Avatar must be a PNG, JPG, WebP or GIF image.'
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Avatar must be 5 MB or smaller.'
  }
  return null
}
