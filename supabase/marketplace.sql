begin;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120 and title ~ '[^[:space:]]'),
  description text not null check (char_length(description) between 1 and 3000 and description ~ '[^[:space:]]'),
  price_cents integer not null check (price_cents between 0 and 99999999),
  category text not null check (category in ('Electronics','Furniture','Clothing','Books','Sports','Other')),
  seller_email text not null check (char_length(seller_email) <= 254 and seller_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  image_path text not null check (image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_email text not null check (char_length(buyer_email) <= 254 and buyer_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  message text not null check (char_length(message) between 1 and 2000 and message ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);

create index listings_newest_idx on public.listings (created_at desc, id desc);
create index listings_category_newest_idx on public.listings (category, created_at desc, id desc);
create index messages_listing_idx on public.messages (listing_id);

alter table public.listings enable row level security;
alter table public.messages enable row level security;

revoke all on public.listings, public.messages from public, anon, authenticated;
grant select on public.listings to anon, authenticated;
grant insert (title, description, price_cents, category, seller_email, image_path)
  on public.listings to anon, authenticated;
grant insert (listing_id, buyer_email, message) on public.messages to anon, authenticated;

create policy "Visitors can browse listings" on public.listings
  for select to anon, authenticated using (true);
create policy "Visitors can publish listings" on public.listings
  for insert to anon, authenticated with check (true);
-- Buyer messages are private: public clients can submit, but cannot read them.
create policy "Visitors can contact sellers" on public.messages
  for insert to anon, authenticated with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
  array['image/jpeg','image/png','image/webp']);

create policy "Visitors can upload listing photos" on storage.objects
  for insert to anon, authenticated with check (
    bucket_id = 'listing-images'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

commit;
