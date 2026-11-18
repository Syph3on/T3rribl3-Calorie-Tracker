import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// If these are missing OR malformed (e.g. still the placeholder text from
// .env.example), the app still renders — it just can't save data yet.
// See README.md > "Set up Supabase" for how to fill these in correctly.
export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl));

export const supabase = supabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (supabaseUrl && !isValidUrl(supabaseUrl)) {
  console.warn(
    "[supabaseClient] VITE_SUPABASE_URL doesn't look like a valid URL — check your .env file. Got:",
    supabaseUrl
  );
}

/**
 * Ensures the current browser has an anonymous Supabase auth session.
 * - If one already exists (e.g. returning visitor), reuses it — this is what
 *   makes past calorie entries / chat history "come back" on a later visit,
 *   as long as they're on the same browser and haven't cleared site data.
 * - If not, creates a new anonymous user (requires "Anonymous Sign-Ins" to be
 *   enabled in Supabase Dashboard > Authentication > Providers).
 * Returns the user's id (a uuid), or null if Supabase isn't connected/enabled.
 */
export async function ensureAnonSession() {
  if (!supabaseReady) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("[supabaseClient] Anonymous sign-in failed — check that it's enabled in Supabase Dashboard > Authentication > Providers:", error.message);
    return null;
  }
  return data.session?.user?.id ?? null;
}
