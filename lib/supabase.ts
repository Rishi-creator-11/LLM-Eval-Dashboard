import { createClient } from "@supabase/supabase-js"
import { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Fallback logic to avoid crashing if env vars are missing during build/dev
const url = supabaseUrl || "https://placeholder.supabase.co"
const key = supabaseKey || "placeholder-key"

export const supabase = createClient<Database>(url, key)

export const hasSupabaseConfig = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
