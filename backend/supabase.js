const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("خطأ: تعذر قراءة SUPABASE_URL أو SUPABASE_KEY من ملف .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
