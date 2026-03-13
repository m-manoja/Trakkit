import { supabase } from '../config/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixForeignKey() {
  try {
    console.log('Fixing foreign key constraint for todos table...');
    
    // Drop the existing foreign key constraint
    const { error: dropError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_user_id_fkey;' 
      });
    
    if (dropError) {
      console.log('Drop constraint error (may be expected):', dropError);
    }
    
    // Add the correct foreign key constraint pointing to public.users
    const { error: addError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE todos ADD CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;' 
      });
    
    if (addError) {
      console.error('Error adding constraint:', addError);
      return;
    }
    
    console.log('Foreign key constraint fixed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixForeignKey().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
