import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js'

const supabaseUrl = SUPABASE_URL.startsWith('__') ? import.meta.env.VITE_SUPABASE_URL || '' : SUPABASE_URL
const supabaseAnonKey = SUPABASE_ANON_KEY.startsWith('__') ? import.meta.env.VITE_SUPABASE_ANON_KEY || '' : SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
