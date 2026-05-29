/**
 * Run in Supabase SQL Editor:
 *
 * ALTER TABLE scheduled_notifications
 *   ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0;
 *
 * ALTER TABLE scheduled_notifications
 *   ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
 *
 * CREATE TABLE IF NOT EXISTS push_tokens (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   token TEXT NOT NULL,
 *   platform TEXT NOT NULL DEFAULT 'expo',
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   UNIQUE (user_id, token)
 * );
 *
 * CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens (user_id);
 */

const SQL = `
ALTER TABLE scheduled_notifications
  ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE scheduled_notifications
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'expo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens (user_id);
`;

console.log('Run this in Supabase SQL Editor:\n');
console.log(SQL);
