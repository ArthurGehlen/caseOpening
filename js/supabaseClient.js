import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qxucezkntkyjmbfxpisj.supabase.co";
const SUPABASE_KEY = "sb_publishable_-uOF73-6wEMZ-0DvAcqpdA__9qTJj_k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
