# Expo chat background alerts

Browser code: `push.js`, `chat.js`, `sync.js`, `sw.js`. Server code: `index.ts`
and `push-policy.mjs`, deployed as Supabase function `bourg-chat-push`.
`push.sql` contains the database setup applied through migration history.

## Access and delivery

- Preserve the app's existing private-team-link / chosen-person model. This is
  not verified individual authentication; anyone with the link can choose a name.
- Each browser installation has its own random device ID and 256-bit token.
  Only its hash is stored. Subscription endpoints and encryption keys stay in
  the private schema; no anonymous table access is granted.
- `bourg_push_admin` is restricted to `service_role`. The function authenticates
  browser operations using the active team key and roster before invoking it.
  Gateway JWT checking is off because these users deliberately have no login;
  the handler performs the custom authorization on every operation.
- VAPID private key and independent dispatcher secret are generated server-side
  and stored in Supabase Vault. Do not print them, embed them in client code,
  rotate them casually, or commit them. Rotating VAPID requires resubscription.
- Inserts into `team_messages` enqueue a delivery for each eligible subscribed
  device, excluding all devices belonging to the sender. NTS currently has
  all-team visibility in the existing chat policy, so alerts match that policy.
- A database trigger wakes the sender. A minute cron retries pending jobs only;
  idle checks make no Edge Function call. Leases prevent concurrent dispatchers
  from claiming the same job. Up to five attempts; one-hour message lifetime.
  Push is best effort, not guaranteed delivery; a worker crash after provider
  acceptance can retry, using a stable notification tag to replace duplicates.
- Removed/expired endpoints are deleted on 404/410. Switching people disables
  the old subscription and suppresses in-flight notifications locally. Users
  enable alerts again for the new person. Other devices remain subscribed.
- Test alerts go only to the requesting device, at most once per 30 seconds.
  A provider acceptance is not proof of display on a handset.

## Device setup

iPhone/iPad requires iOS/iPadOS 16.4+ and opening the app from a Home Screen
installation. Open the private link in Safari, Share → Add to Home Screen,
open the app icon, choose a name, then Chat → Enable alerts. Each installation
needs permission separately. Android/desktop users use a supported browser.
Focus, notification settings, connectivity, and OS background restrictions can
affect sound and delivery. This is Web Push, not SMS or guaranteed messaging.

## Validation

Run `node bourg-expo-ops/backend/push.test.mjs` for endpoint restrictions and the
actual service worker's recipient filtering, opt-out and click behavior.
Run `push.test.sql` as one transaction against the configured project before
real subscriptions are enabled. It rolls back test messages, devices and
pg_net calls, so no test messages or push requests leave the database.
Use the app's Send test alert on a real opted-in phone for final OS delivery
verification. Never send unsolicited tests to team channels.

Private push tables intentionally have RLS enabled with no client policies;
this is server-only storage, not a missing public access policy.
No new paid plan or messaging provider is required; existing Supabase usage
limits and costs still apply. Periodically review the project's usage.
