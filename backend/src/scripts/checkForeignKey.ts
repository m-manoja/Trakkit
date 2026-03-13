import { supabase } from '../config/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkForeignKey() {
  try {
    console.log('Checking current foreign key constraint...');
    
    // Try to get constraint information
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'todos';
        `
      });
    
    if (error) {
      console.log('Could not check constraint via RPC, trying direct approach...');
      
      // Let's try a direct SQL approach
      console.log('Testing if constraint points to auth.users or public.users...');
      
      // Test with a simple query that would fail if constraint is wrong
      const testUserId = '9f2f22c5-dd2b-403a-b524-50a9f2cc7969';
      
      // Check if user exists in public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id')
        .eq('id', testUserId)
        .single();
      
      console.log('User in public.users:', publicUser ? 'YES' : 'NO');
      if (publicError) console.log('Public users error:', publicError.message);
      
      // Check if user exists in auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(testUserId);
      console.log('User in auth.users:', authUser?.user ? 'YES' : 'NO');
      if (authError) console.log('Auth users error:', authError.message);
      
    } else {
      console.log('Constraint info:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkForeignKey().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
