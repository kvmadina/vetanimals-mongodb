import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getAuthErrorMessage } from '../lib/authErrors.js'
import AppHeader from '../components/AppHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import {
  AlertIcon,
  CameraIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
  UserIcon,
} from '../components/Icons.jsx'

const PHONE_PATTERN = /^[+()\-.\s\d]{7,20}$/
const URL_PATTERN = /^https?:\/\/\S+$/i

export default function Settings() {
  const { user, profile, refreshProfile, updateProfile, updatePassword, signIn } = useAuth()
  const { showToast } = useToast()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [formLoaded, setFormLoaded] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Avatars are plain image URLs — the same approach the pet form already
  // uses, so there is no file storage to run.
  const [avatarInput, setAvatarInput] = useState('')
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordDone, setPasswordDone] = useState(false)

  // Populate the form from the profile once it's available
  useEffect(() => {
    if (!profile || formLoaded) return
    setFullName(profile.full_name || '')
    setPhone(profile.phone || '')
    setAvatarInput(profile.avatar_url || '')
    setFormLoaded(true)
  }, [profile, formLoaded])

  const handleSaveAvatar = async (e) => {
    e.preventDefault()
    const url = avatarInput.trim()
    setAvatarError('')

    if (url && !URL_PATTERN.test(url)) {
      setAvatarError('Photo URL must start with http:// or https://')
      return
    }

    setSavingAvatar(true)
    try {
      await updateProfile({ avatar_url: url })
      showToast(url ? 'Profile photo updated' : 'Profile photo removed')
    } catch (err) {
      console.error('[Settings] Avatar save failed:', err)
      setAvatarError('Could not save the photo. Please try again.')
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarError('')
    setSavingAvatar(true)
    try {
      await updateProfile({ avatar_url: '' })
      setAvatarInput('')
      showToast('Profile photo removed')
    } catch (err) {
      console.error('[Settings] Avatar removal failed:', err)
      setAvatarError('Could not remove the photo. Please try again.')
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    const errors = {}
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.'
    }
    if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) {
      errors.phone = 'Enter a valid phone number, e.g. +1 (555) 000-0000.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingProfile(true)
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() })
      await refreshProfile()
      showToast('Profile updated')
    } catch (err) {
      console.error('[Settings] Profile save failed:', err)
      setProfileError('Could not save your profile. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordDone(false)
    if (!currentPassword) {
      setPasswordError('Enter your current password.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      // Verify the current password first, then set the new one.
      const { error: signInError } = await signIn(user?.email || '', currentPassword)
      if (signInError) {
        setPasswordError('Your current password is incorrect.')
        return
      }
      const { error } = await updatePassword(newPassword)
      if (error) {
        setPasswordError(getAuthErrorMessage(error, 'We could not update your password. Please try again.'))
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordDone(true)
      showToast('Password updated')
    } catch (err) {
      console.error('[Settings] Password change failed:', err)
      setPasswordError('Something went wrong. Please try again.')
    } finally {
      setSavingPassword(false)
    }
  }

  const avatarUrl = profile?.avatar_url || null
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Account
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Settings
          </h1>
          <p className="mt-2 text-slate-500">
            Manage your profile photo, personal details and password.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* -------------------------------------------------- PROFILE PHOTO */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Profile photo</h2>
            <p className="mt-1 text-sm text-slate-500">
              Paste a link to an image. Shown next to your name across VetAnimals.
            </p>

            {avatarError && (
              <div role="alert" className="form-banner--error mt-4">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{avatarError}</span>
              </div>
            )}

            <form
              onSubmit={handleSaveAvatar}
              noValidate
              className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start"
            >
              {/* Live preview of whatever is currently typed */}
              <Avatar
                src={URL_PATTERN.test(avatarInput.trim()) ? avatarInput.trim() : avatarUrl}
                name={fullName || 'Member'}
                className="h-20 w-20 shrink-0 text-2xl"
              />

              <div className="min-w-0 flex-1">
                <label htmlFor="settings-avatar" className="form-label">
                  Photo URL
                </label>
                <div className="relative">
                  <CameraIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="settings-avatar"
                    name="avatarUrl"
                    type="url"
                    autoComplete="off"
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className={`input-field pl-10 ${avatarError ? 'input-field--error' : ''}`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Leave empty to use the generated initials avatar.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="submit" disabled={savingAvatar} className="btn-primary">
                    {savingAvatar ? 'Saving…' : 'Save photo'}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={savingAvatar}
                      className="btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </form>
          </section>

          {/* ------------------------------------------------ PERSONAL DETAILS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Personal details</h2>
            <p className="mt-1 text-sm text-slate-500">
              How you appear on the platform and how we can reach you.
            </p>

            {profileError && (
              <div role="alert" className="form-banner--error mt-4">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} noValidate className="mt-5 space-y-5">
              <div>
                <label htmlFor="settings-name" className="form-label">
                  Full name
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="settings-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className={`input-field pl-10 ${fieldErrors.fullName ? 'input-field--error' : ''}`}
                  />
                </div>
                {fieldErrors.fullName && <p className="field-error">{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="settings-phone" className="form-label">
                  Phone number <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="settings-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={`input-field pl-10 ${fieldErrors.phone ? 'input-field--error' : ''}`}
                  />
                </div>
                {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
              </div>

              <div>
                <label htmlFor="settings-email" className="form-label">
                  Email address
                </label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="settings-email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input-field pl-10"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Your email is the account identifier and cannot be changed
                  from Settings.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <p className="text-sm text-slate-500">
                  {memberSince ? `Member since ${memberSince}` : 'Account member'}
                </p>
                <button type="submit" disabled={savingProfile || !formLoaded} className="btn-primary">
                  {savingProfile ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* ------------------------------------------------------ PASSWORD */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900">
              <KeyIcon className="h-4 w-4 text-emerald-700" />
              Change password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ll stay signed in on this device after changing it.
            </p>

            {passwordError && (
              <div role="alert" className="form-banner--error mt-4">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordDone && !passwordError && (
              <div role="status" className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Your password was updated.</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} noValidate className="mt-5 space-y-5">
              <div>
                <label htmlFor="settings-current-password" className="form-label">
                  Current password
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="settings-current-password"
                    name="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="settings-new-password" className="form-label">
                    New password
                  </label>
                  <input
                    id="settings-new-password"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="settings-confirm-password" className="form-label">
                    Confirm new password
                  </label>
                  <input
                    id="settings-confirm-password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5">
                <button type="submit" disabled={savingPassword} className="btn-primary">
                  {savingPassword ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
