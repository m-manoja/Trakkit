import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Adds timezone to notification_settings.
 * Run in Supabase SQL Editor if this script cannot apply automatically:
 *
 * ALTER TABLE notification_settings
 *   ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Colombo';
 */
const SQL = `ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Colombo'`;

console.log('Run this in Supabase SQL Editor:\n');
console.log(SQL + ';\n');
