-- Pending share invites: created when an owner shares an item with an email
-- that has no Trakkit account yet. Claimed (converted into item_shares) once
-- that email becomes linked to a user account.
create table if not exists public.pending_shares (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  invite_email  text not null,                 -- normalized (trim + lowercase)
  item_type     text not null check (item_type in ('warranty', 'subscription', 'reminder', 'todo')),
  item_id       uuid not null,
  token         text not null,                 -- random, used in the invite link
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz,                   -- set when converted to item_shares
  claimed_by    uuid references public.users (id) on delete set null
);

-- Fast lookup when claiming by email, and to skip already-claimed rows.
create index if not exists pending_shares_email_unclaimed_idx
  on public.pending_shares (invite_email)
  where claimed_at is null;

-- Avoid duplicate pending invites for the same owner+email+item.
create unique index if not exists pending_shares_unique_open_idx
  on public.pending_shares (owner_user_id, invite_email, item_type, item_id)
  where claimed_at is null;
