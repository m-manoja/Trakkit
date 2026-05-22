import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_USER_ID = '0e965410-a6a7-48f0-b493-679b519646ea';

async function check() {
  const now = new Date().toISOString();
  console.log('Testing getNotifications query for user:', TEST_USER_ID);

  const { data, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: false })
    .limit(50);

  if (error) {
    console.error('QUERY FAILED:', JSON.stringify(error, null, 2));
  } else {
    console.log(`Query success! Rows returned: ${data?.length}`);
    data?.slice(0, 3).forEach(n => console.log(' -', n.status, n.scheduled_for, n.title));
  }
}

check();
