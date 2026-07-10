// Supabase connection — the publishable key is safe to ship in client code.
export const SUPABASE_URL = 'https://umcxlubqcnbhxnmjtann.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_gZS61jVoF4NwlVRbccpkog_XzMBiQvq'

// The tropical-fish photo, served from Supabase Storage (public bucket).
export const FISH_IMAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/fish-assets/fish.jpg`
