import { supabase } from '../config/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserSync() {
  const userId = '9f2f22c5-dd2b-403a-b524-50a9f2cc7969';
  
  try {
    console.log('Checking if user exists in public.users...');
    
    // Check if user already exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, phone')
      .eq('id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
      return;
    }
    
    if (existingUser) {
      console.log('User already exists in public.users:', existingUser);
      return;
    }
    
    console.log('User not found in public.users, creating entry...');
    
    // Get user info from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser.user) {
      console.error('User not found in auth.users:', authError);
      return;
    }
    
    // Insert user into public.users
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        phone: authUser.user.phone || '94756834823', // Fallback phone
        profile_completed: false
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting user:', insertError);
      return;
    }
    
    console.log('Successfully created user in public.users:', newUser);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixUserSync().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
