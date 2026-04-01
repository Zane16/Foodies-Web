// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Use the shared supabase client - this prevents multiple instances
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure session is persisted across page loads
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Helper function to get or create a client instance (singleton pattern)
export function createSupabaseClient() {
  // Always return the shared instance to prevent multiple GoTrueClient instances
  return supabase
}

// Helper function for API routes to create admin client at runtime
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}


