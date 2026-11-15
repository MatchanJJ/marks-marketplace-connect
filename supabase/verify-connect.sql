begin;
do $$
declare item_id uuid; first_order uuid; second_order uuid; rejected boolean; confirmed boolean;
begin
  if has_table_privilege('anon','public.orders','select') or has_table_privilege('anon','public.sellers','select') then raise exception 'Private data is public'; end if;
  if has_function_privilege('anon','public.reserve_order(uuid)','execute') or has_function_privilege('anon','public.confirm_order(uuid,text,text,integer,text,text,text)','execute') then raise exception 'Public payment mutation'; end if;
  if has_column_privilege('anon','public.listings','sold_at','update') or has_column_privilege('anon','public.listings','sold_at','insert') then raise exception 'Public Sold override'; end if;
  insert into public.sellers(email,stripe_account_id,charges_enabled,payouts_enabled,details_submitted) values('rpc-check@example.com','acct_unitonly',true,true,true);
  insert into public.listings(title,description,price_cents,category,seller_email,image_path)
  values('Transactional verification','Never committed',1250,'Other','rpc-check@example.com',gen_random_uuid()::text||'.jpg') returning id into item_id;
  select id into first_order from public.reserve_order(item_id);
  select id into second_order from public.reserve_order(item_id);
  if first_order <> second_order then raise exception 'Duplicate pending orders'; end if;
  if (select fee_cents from public.orders where id=first_order) <> 125 then raise exception 'Wrong platform fee'; end if;
  update public.orders set stripe_session_id='cs_test_unitonly' where id=first_order;
  rejected=false;
  begin perform public.confirm_order(first_order,'cs_test_unitonly','acct_wrong',1250,'usd','pi_unitonly',null); exception when others then rejected=true; end;
  if not rejected then raise exception 'Accepted wrong connected account'; end if;
  rejected=false;
  begin perform public.confirm_order(first_order,'cs_test_unitonly','acct_unitonly',1,'usd','pi_unitonly',null); exception when others then rejected=true; end;
  if not rejected then raise exception 'Accepted tampered amount'; end if;
  confirmed=public.confirm_order(first_order,'cs_test_unitonly','acct_unitonly',1250,'usd','pi_unitonly','buyer@example.com');
  if not confirmed or (select sold_at from public.listings where id=item_id) is null then raise exception 'Payment and Sold status not committed together'; end if;
  if public.confirm_order(first_order,'cs_test_unitonly','acct_unitonly',1250,'usd','pi_unitonly','buyer@example.com') then raise exception 'Replayed payment was fulfilled twice'; end if;
  rejected=false;
  begin perform public.reserve_order(item_id); exception when others then rejected=true; end;
  if not rejected then raise exception 'Sold listing can be purchased again'; end if;
end;
$$;
rollback;
select 'Payment database invariants passed; transactional fixtures rolled back' as result;
