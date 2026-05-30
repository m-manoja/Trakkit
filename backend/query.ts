import { supabase } from "./src/config/supabaseClient.js";

async function run() {
  const { data, error } = await supabase.from('users').select('id, email, phone, first_name');
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

run();
