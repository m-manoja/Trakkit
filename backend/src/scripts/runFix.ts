import { supabase } from '../config/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function runFix() {
  try {
    console.log('Testing todo creation with current user...');
    
    const testTodo = {
      userId: '9f2f22c5-dd2b-403a-b524-50a9f2cc7969',
      task_name: 'Test todo',
      has_reminder: false,
      reminder_date: null
    };
    
    const { data, error } = await supabase
      .from('todos')
      .insert([testTodo])
      .select();
    
    if (error) {
      console.error('Error creating test todo:', error);
      console.log('This confirms the foreign key issue exists.');
      
      // Let's check what the current constraint looks like
      console.log('Checking current table constraints...');
      
    } else {
      console.log('Test todo created successfully:', data);
      
      // Clean up the test todo
      await supabase
        .from('todos')
        .delete()
        .eq('id', data[0].id);
      
      console.log('Test todo cleaned up');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

runFix().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
