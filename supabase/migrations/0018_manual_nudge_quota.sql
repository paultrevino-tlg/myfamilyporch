-- 0018 — Daily cap on MANUAL story nudges.
--
-- The weekly scheduler is naturally cost-bounded: it sends only on the family's
-- chosen days_of_week. The two manual buttons — Schedule "Ask now" and the
-- Storytellers "Send a nudge" — were not bounded at all, making them the only
-- unbounded outbound path in the system (docs/PRICING.md §6.3). A stuck admin
-- clicking repeatedly costs us Twilio spend and, worse, texts an elder over and
-- over.
--
-- The counter deliberately does NOT live on storytellers or schedules. RLS grants
-- family admins UPDATE on both, so a counter there could be zeroed by the very
-- person it limits, via a direct PostgREST call. This table has RLS enabled with
-- ZERO policies: unreachable by `authenticated`, service-role only (the send path
-- already runs under the service role — lib/sms/nudge.ts).

create table manual_nudge_quota (
  storyteller_id uuid primary key references storytellers(id) on delete cascade,
  -- The storyteller's LOCAL day (schedules.timezone), not UTC — "3 a day" should
  -- mean their day. Computed by the caller and passed in.
  day            date not null,
  count          int  not null default 0,
  updated_at     timestamptz not null default now()
);

alter table manual_nudge_quota enable row level security;
-- No policies, on purpose. See the header.

-- Atomically claim one manual send. Returns the new count on success, or NULL
-- when the cap is already reached for that local day.
--
-- Single statement so two simultaneous clicks cannot both pass: the row lock
-- taken by ON CONFLICT DO UPDATE serialises them, and the WHERE filters the
-- update out once the cap is hit (a filtered-out conflict returns no row).
-- A new local day resets the count rather than accumulating.
create or replace function public.claim_manual_nudge(
  p_storyteller uuid,
  p_day         date,
  p_cap         int
)
returns int language sql security definer set search_path = public as $$
  insert into manual_nudge_quota (storyteller_id, day, count)
  values (p_storyteller, p_day, 1)
  on conflict (storyteller_id) do update
    set day        = p_day,
        count      = case when manual_nudge_quota.day = p_day
                          then manual_nudge_quota.count + 1
                          else 1 end,
        updated_at = now()
    where manual_nudge_quota.day <> p_day
       or manual_nudge_quota.count < p_cap
  returning manual_nudge_quota.count;
$$;

-- Give back a claim when the send did not actually go out (skipped by the
-- pre-send gate, or it threw). Floors at zero and only touches the same local
-- day, so a refund can never manufacture headroom on a later day.
create or replace function public.release_manual_nudge(
  p_storyteller uuid,
  p_day         date
)
returns void language sql security definer set search_path = public as $$
  update manual_nudge_quota
     set count = greatest(count - 1, 0),
         updated_at = now()
   where storyteller_id = p_storyteller
     and day = p_day;
$$;

-- Service role only. `authenticated` must not be able to call either function:
-- claiming is meaningless to a client, and releasing would be a cap bypass.
-- Postgres grants EXECUTE to PUBLIC by default, so the revoke must come first and
-- service_role must then be granted back explicitly.
revoke execute on function public.claim_manual_nudge(uuid, date, int) from public, anon, authenticated;
revoke execute on function public.release_manual_nudge(uuid, date) from public, anon, authenticated;
grant execute on function public.claim_manual_nudge(uuid, date, int) to service_role;
grant execute on function public.release_manual_nudge(uuid, date) to service_role;
