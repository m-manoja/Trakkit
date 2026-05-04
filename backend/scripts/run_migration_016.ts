import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Run each statement individually via Supabase's postgres function
async function run() {
  const statements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_email TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_prompt_shown BOOLEAN NOT NULL DEFAULT FALSE`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_backup_email_idx ON users (backup_email) WHERE backup_email IS NOT NULL`,
  ];

  for (const sql of statements) {
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql }).match(() => ({ error: { message: 'rpc not available' } }));
    if (error) {
      // fallback: try direct query via REST
      console.log(`Statement: ${sql}`);
      console.log(`Note: Run this manually in Supabase SQL Editor if needed.`);
    } else {
      console.log(`✅ Done: ${sql.substring(0, 60)}...`);
    }
  }

  console.log('\n📋 If migration did not apply automatically, run the following in your Supabase SQL Editor:');
  console.log('-----');
  statements.forEach(s => console.log(s + ';'));
  console.log('-----');
}

run().catch(console.error);
