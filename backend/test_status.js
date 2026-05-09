import { supabase } from './src/config/supabaseClient.js';
async function checkEnum() {
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .update({ status: 'notified' })
    .eq('id', '320d9499-9791-462d-8143-b5a6fdd9f992')
    .select();
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
    // revert
    await supabase.from('scheduled_notifications').update({ status: 'pending' }).eq('id', '320d9499-9791-462d-8143-b5a6fdd9f992');
  }
}
checkEnum();
