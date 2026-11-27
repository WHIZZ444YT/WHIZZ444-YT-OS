-- Require a known, future cutoff before public display of licensed observations.
create or replace function public.futures_market_display_approved(
  check_provider_id text,
  check_venue text,
  check_instrument_root text,
  check_delay_class text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.futures_market_data_entitlements e
    where e.provider_id = check_provider_id
      and e.venue = check_venue
      and e.instrument_root = check_instrument_root
      and e.delay_class = check_delay_class
      and e.public_display_status = 'public-display-approved'
      and e.is_active
      and e.reviewed_at is not null
      and e.reviewed_by is not null
      and e.rights_reference is not null
      and e.valid_until > now()
  );
$function$;
