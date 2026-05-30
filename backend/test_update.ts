import { supabase } from './src/config/supabaseClient.js';

async function test() {
  const { data: users, error: fetchErr } = await supabase
    .from('users')
    .select('id, email, email_verified')
    .limit(1);
    
  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log("No users found");
    return;
  }
  
  const user = users[0];
  console.log("Before update:", user);
  
  const testEmail = "test_" + Date.now() + "@example.com";
  
  const { data: updateData, error: updateErr } = await supabase
    .from('users')
    .update({ 
      email_verified: true,
      email: testEmail
    })
    .eq('id', user.id)
    .select();
    
  if (updateErr) {
    console.error("Update Error:", updateErr);
    return;
  }
  
  console.log("Update result:", updateData);
  
  const { data: checkUser } = await supabase
    .from('users')
    .select('id, email, email_verified')
    .eq('id', user.id)
    .single();
    
  console.log("After update:", checkUser);
}

test();
