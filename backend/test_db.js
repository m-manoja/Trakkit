import { supabase } from './src/config/supabaseClient.js';
async function test() {
  const { data } = await supabase.from('scheduled_notifications').select('*').limit(1);
  console.log(data);
}
test();
