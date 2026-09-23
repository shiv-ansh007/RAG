import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Use service role key to bypass RLS for server-side operations.
// All user-scoping is enforced in application code, not RLS policies.
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
