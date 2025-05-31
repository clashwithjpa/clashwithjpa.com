-- Create the auth hook function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
stable
as $$
  DECLARE
    claims jsonb;
    user_metadata jsonb;
    discord_user_provider_id text;
    internal_user_id_from_db bigint;
    user_app_roles_array jsonb;
  BEGIN
    claims := COALESCE(event->'claims', '{}'::jsonb);
    user_metadata := claims->'user_metadata';

    IF user_metadata IS NOT NULL THEN
      discord_user_provider_id := user_metadata->>'provider_id';

      IF discord_user_provider_id IS NULL THEN
        discord_user_provider_id := user_metadata->>'sub';
      END IF;
    ELSE
      discord_user_provider_id := NULL;
    END IF;

    IF discord_user_provider_id IS NOT NULL THEN
      BEGIN
        SELECT u.id INTO internal_user_id_from_db
        FROM public.users u
        WHERE u.discord_id = discord_user_provider_id;
      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          internal_user_id_from_db := NULL;
        WHEN TOO_MANY_ROWS THEN
          internal_user_id_from_db := NULL;
      END;

      IF internal_user_id_from_db IS NOT NULL THEN
        SELECT jsonb_agg(ur.role::text) INTO user_app_roles_array
        FROM public.user_roles ur
        WHERE ur.user_id = internal_user_id_from_db;

        IF user_app_roles_array IS NOT NULL AND jsonb_array_length(user_app_roles_array) > 0 THEN
          claims := jsonb_set(claims, '{user_roles}', user_app_roles_array);
        END IF;
      END IF;
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  end;
$$;

grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

grant all
  on table public.user_roles
to supabase_auth_admin;

grant all
  on table public.users
to supabase_auth_admin;

create policy "Allow auth admin to read user roles" ON public.user_roles
as permissive for select
to supabase_auth_admin
using (true);

create policy "Allow auth admin to read users" ON public.users
as permissive for select
to supabase_auth_admin
using (true);


CREATE OR REPLACE FUNCTION has_any_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text((auth.jwt() -> 'user_roles')::jsonb) AS role
    WHERE role = ANY (roles)
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.current_discord_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    user_metadata ->> 'provider_id',
    user_metadata ->> 'sub'
  )
  FROM (
    SELECT (auth.jwt() -> 'user_metadata')::jsonb AS user_metadata
  ) AS t
$$;
--> statement-breakpoint