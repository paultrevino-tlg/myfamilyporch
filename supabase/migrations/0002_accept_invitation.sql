-- ============================================================================
-- accept_invitation: redeem a family invitation token (TODO 1.3).
-- Security-definer because the invitee is NOT yet a member — RLS would block
-- them from reading the invitations row or inserting their own membership.
-- Mirrors create_family(): clients call this RPC, never touch the tables direct.
-- Validates token / expiry / single-use, and requires the signed-in user's
-- email to match the invited email. Returns the family the user just joined.
-- ============================================================================
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_inv   invitations;
  v_email text;
begin
  select * into v_inv from invitations where token = p_token;
  if not found                       then raise exception 'invalid_invitation';        end if;
  if v_inv.accepted_at is not null   then raise exception 'invitation_already_used';    end if;
  if v_inv.expires_at  < now()       then raise exception 'invitation_expired';         end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null                 then raise exception 'not_authenticated';          end if;
  if v_email <> lower(v_inv.email)   then raise exception 'email_mismatch';              end if;

  -- Idempotent: re-accepting just refreshes the role to whatever was invited.
  insert into memberships(user_id, family_id, role)
    values (auth.uid(), v_inv.family_id, v_inv.role)
    on conflict (user_id, family_id) do update set role = excluded.role;

  update invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.family_id;
end; $$;

grant execute on function public.accept_invitation(text) to authenticated;
