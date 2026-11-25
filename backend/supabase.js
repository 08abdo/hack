const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// إذا مالقاش المتغيرات في Render، راح يستعمل الروابط هادي مباشرة
const supabaseUrl =
  process.env.SUPABASE_URL || "https://qwpwibqesigyzkoodwyo.supabase.co";
const supabaseKey =
  process.env.SUPABASE_KEY || "sb_publishable_koWzyJX9jHFoh1P2Hy0kAw_ynHXhF7r";

if (!supabaseUrl || !supabaseKey) {
  console.error("خطأ: تعذر قراءة SUPABASE_URL أو SUPABASE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
