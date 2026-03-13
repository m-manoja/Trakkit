import { supabase } from '../config/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  try {
    console.log('Checking todos table schema...');

    // Get table information
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying todos:', error);
      return;
    }

    console.log('Sample data structure:', data);
    console.log('Available columns:', data.length > 0 ? Object.keys(data[0]) : 'No data in table');

    // Also check the table info directly
    const { data: tableInfo, error: infoError } = await supabase
      .rpc('get_table_info', { table_name: 'todos' });

    if (infoError) {
      console.log('Could not get table info via RPC:', infoError.message);
    } else {
      console.log('Table info:', tableInfo);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSchema().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
