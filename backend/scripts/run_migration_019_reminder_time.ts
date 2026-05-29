/**
 * Adds per-item reminder time to manual_reminders and todos.
 * Run in Supabase SQL Editor:
 *
 * ALTER TABLE manual_reminders
 *   ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '08:00';
 *
 * ALTER TABLE todos
 *   ADD COLUMN IF NOT EXISTS reminder_time TEXT;
 */

const SQL = `
ALTER TABLE manual_reminders
  ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '08:00';

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS reminder_time TEXT;
`;

console.log('Run this in Supabase SQL Editor:\n');
console.log(SQL);
