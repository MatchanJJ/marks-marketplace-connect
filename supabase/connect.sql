begin;
alter table public.listings add column sold_at timestamptz;

create table public.sellers (
  email text primary key check (email = lower(btrim(email)) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  stripe_account_id text unique not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  seller_email text not null references public.sellers(email),
  stripe_account_id text not null,
  listing_title text not null,
  amount_cents integer not null check (amount_cents between 50 and 99999999),
  fee_cents integer not null check (fee_cents = amount_cents / 10),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  stripe_session_id text unique,
  checkout_url text,
  payment_intent_id text unique,
  buyer_email text check (char_length(buyer_email) <= 254),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check ((status = 'paid') = (paid_at is not null))
);
create unique index orders_one_pending_per_listing on public.orders(listing_id) where status = 'pending';
create unique index orders_one_paid_per_listing on public.orders(listing_id) where status = 'paid';
create index orders_seller_idx on public.orders(seller_email);
create index orders_account_idx on public.orders(stripe_account_id);
alter table public.sellers enable row level security;
alter table public.orders enable row level security;
revoke all on public.sellers, public.orders from public, anon, authenticated;
grant select, insert, update on public.sellers, public.orders, public.listings to service_role;

-- One pending order means concurrent buyers share one Stripe Checkout Session.
create function public.reserve_order(p_listing_id uuid) returns setof public.orders
language plpgsql security invoker set search_path = public, pg_temp as $$
declare item public.listings; seller public.sellers; pending public.orders;
begin
  select * into item from public.listings where id = p_listing_id for update;
  if not found or item.sold_at is not null then raise exception 'Listing unavailable'; end if;
  if item.price_cents < 50 then raise exception 'Checkout requires at least 50 cents'; end if;
  select * into seller from public.sellers where email = lower(btrim(item.seller_email));
  if not found or not seller.charges_enabled or not seller.payouts_enabled or not seller.details_submitted then
    raise exception 'Seller has not completed onboarding';
  end if;
  select * into pending from public.orders where listing_id = item.id and status = 'pending';
  if not found then
    insert into public.orders(listing_id,seller_email,stripe_account_id,listing_title,amount_cents,fee_cents)
    values(item.id,seller.email,seller.stripe_account_id,item.title,item.price_cents,item.price_cents / 10)
    returning * into pending;
  end if;
  return next pending;
end;
$$;
revoke all on function public.reserve_order(uuid) from public, anon, authenticated;
grant execute on function public.reserve_order(uuid) to service_role;

-- Validate the signed event's financial snapshot, then commit both changes together.
create function public.confirm_order(p_order_id uuid,p_session_id text,p_account_id text,p_total integer,p_currency text,p_payment_intent text,p_buyer_email text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare purchase public.orders; item public.listings;
begin
  select * into purchase from public.orders where id = p_order_id;
  if not found then raise exception 'Unknown order'; end if;
  select * into item from public.listings where id = purchase.listing_id for update;
  select * into purchase from public.orders where id = p_order_id for update;
  if purchase.stripe_session_id is distinct from p_session_id or purchase.stripe_account_id <> p_account_id
     or purchase.amount_cents <> p_total or purchase.currency <> p_currency then
    raise exception 'Payment snapshot mismatch';
  end if;
  if purchase.status = 'paid' then return false; end if;
  if purchase.status <> 'pending' or item.sold_at is not null then raise exception 'Order no longer payable'; end if;
  update public.orders set status = 'paid',paid_at = now(),payment_intent_id = p_payment_intent,buyer_email = p_buyer_email where id = p_order_id;
  update public.listings set sold_at = now() where id = purchase.listing_id;
  return true;
end;
$$;
revoke all on function public.confirm_order(uuid,text,text,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.confirm_order(uuid,text,text,integer,text,text,text) to service_role;
commit;
