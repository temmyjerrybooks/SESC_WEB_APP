-- Service-only propagation for newsletter preference bearer tokens.
--
-- The subscription RPC intentionally exposes only a confirmation token. This
-- resolver lets the trusted mailer obtain the paired unsubscribe token without
-- granting browser roles access to subscriber records or either token.

begin;

create or replace function public.server_resolve_newsletter_unsubscribe_token(
  p_confirmation_token uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select subscriber.unsubscribe_token
  from public.newsletter_subscribers as subscriber
  where subscriber.confirmation_token = p_confirmation_token
  limit 1;
$$;

revoke all on function public.server_resolve_newsletter_unsubscribe_token(uuid) from public;
grant execute on function public.server_resolve_newsletter_unsubscribe_token(uuid) to service_role;

commit;
