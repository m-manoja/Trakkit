import { supabase } from '../config/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
  try {
    console.log('Applying migration to fix foreign key constraint...');
    
    // First, let's try to drop the existing constraint
    console.log('Step 1: Dropping existing constraint...');
    const { error: dropError } = await supabase
      .rpc('exec_sql', { sql: 'ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_user_id_fkey;' });
    
    if (dropError) {
      console.log('Drop constraint error (may be expected):', dropError.message);
    } else {
      console.log('✅ Constraint dropped successfully');
    }
    
    // Now add the correct constraint
    console.log('Step 2: Adding correct constraint pointing to public.users...');
    const { error: addError } = await supabase
      .rpc('exec_sql', { sql: 'ALTER TABLE todos ADD CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;' });
    
    if (addError) {
      console.error('❌ Error adding constraint:', addError.message);
      
      // Try alternative approach - check if we can see the constraint
      console.log('Step 3: Checking current constraint...');
      const { data: constraints, error: checkError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, table_name')
        .eq('table_name', 'todos')
        .eq('constraint_type', 'FOREIGN KEY');
      
      if (checkError) {
        console.log('Cannot check constraints via API:', checkError.message);
      } else {
        console.log('Current constraints:', constraints);
      }
      
      return;
    } else {
      console.log('✅ Constraint added successfully');
    }
    
    // Test the fix
    console.log('Step 4: Testing the fix...');
    const testUserId = '9f2f22c5-dd2b-403a-b524-50a9f2cc7969';
    
    // Check if user exists in public.users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', testUserId)
      .single();
    
    if (userError) {
      console.error('❌ User not found in public.users:', userError.message);
      return;
    }
    
    console.log('✅ User found in public.users:', user);
    
    // Try to create a test todo
    const { data: testTodo, error: testError } = await supabase
      .from('todos')
      .insert([{
        user_id: testUserId,
        task_name: 'Test todo after migration fix',
        has_reminder: false
      }])
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Test todo creation failed:', testError.message);
    } else {
      console.log('✅ Test todo created successfully:', testTodo);
      
      // Clean up
      await supabase
        .from('todos')
        .delete()
        .eq('id', testTodo.id);
      
      console.log('✅ Test todo cleaned up');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

applyMigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
