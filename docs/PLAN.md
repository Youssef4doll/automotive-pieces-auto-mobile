# Automotive Pièces Auto — assessment and plan (September 2026)

Written in answer to the master specification ("AUTOMOTIVE PIÈCES AUTO —
MASTER PRODUCT / ENGINEERING / UX SPECIFICATION"), whose last instruction is:
inspect first, write the twelve answers below, then build Phase 1, verify it,
and continue. Nothing here overrides `BRIEF.md`; where the specification and
the brief meet (real data only, no invented stock, delivery dates,
compatibility, reviews or contact details), they say the same thing.

Two repositories:

| Repo | What it is |
|---|---|
| `automotive-pieces-auto` | Next.js 16 storefront + owner admin + `/api/v1` for the app. Prisma 6 on **Neon** Postgres (pooled `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED` for migrations). Live. |
| `automotive-pieces-auto-mobile` (this one) | Expo SDK 57 / React Native 0.86 app, Expo Router, New Architecture, Reanimated 4. Talks to the shop only through `/api/v1`. |

---

## 1. Current architecture — what exists, what works, what is missing

**Works, and is tested end to end (see `e2e/`, 83 + 42 + interactions + a
364-cell every-screen × every-width sweep, French and Arabic):**

- Native app, five tabs (Accueil, Catalogue, Garage, Panier, Compte), stack
  navigation, bottom sheets, safe areas, RTL by layout (not text alignment).
- Vehicle: make → model → engine picker, VIN decode (`/api/v1/vehicles/vin`,
  WMI + model year, honest about what a VIN cannot say), multiple vehicles,
  one active, persisted on the phone.
- Fitment: three verdicts computed on the server (`FITS`, `UNKNOWN`,
  `DOES_NOT_FIT`) from `ProductFitment` rows against the chosen engine; no
  rows is *unknown*, never "fits everything". Shown as colour **and** text.
- Search: Postgres full text + trigram + normalized references
  (`lib/search`), reference-exact priority, synonyms, "did you mean", misses
  filed for the buyer. Vehicle-aware ranking in the app.
- Catalogue → famille → products, brand pages, compatible-first ordering.
- Product page, cart priced by the server (`/cart/quote`), cash-on-delivery
  order placed in one transaction (`createOrder`: fresh prices, atomic stock
  claim, VAT + stamp snapshot), order token in the Keychain/Keystore, order
  tracking timeline, recovery by reference + phone.
- Staff area (`/gestion`) on revocable bearer sessions.
- Security already in place: bcrypt 12, shared credential check with decoy
  hash and per-account lockout, in-memory rate limits, bounded JSON bodies,
  CSP + HSTS + nosniff, bearer-only (cookie-free) app routes, sequential
  order refs never treated as secrets, SHA-256 of tokens at rest.

**Missing against the specification (the honest list):**

| Area | State |
|---|---|
| Customer sign-in in the app | **None.** The app is guest-only; "Mes commandes" is per phone. The website has accounts (cookie JWT) that the app cannot use. |
| Account deletion | Neither front door offers it. Required by both stores once the app signs people in. |
| Analytics in the app | **None.** The website logs `AnalyticsEvent` rows; the app sends nothing, so the app funnel is unmeasured. |
| Environments | One hard-coded production URL plus a dev default. No staging, no EAS profiles, no bundle id / package name. |
| CI | None in either repo. |
| Unit tests | None in either repo (e2e only). |
| App lint | `expo lint` would install a config on first run; there is none. |
| Website lint | 13 pre-existing errors. |
| First-launch welcome | The app opens straight onto Accueil. |
| Apple / Google sign-in, OTP | Need the owner's Apple team, Google OAuth client and an SMS provider. Cannot be built honestly without them. |
| Card / Tunisian online payment | Needs a provider contract (Konnect, Paymee, ClicToPay…). COD only today. |
| Push notifications | Need an EAS project + FCM/APNs credentials. |
| Suppliers, purchase orders, inventory reservations | Not in the schema. Stock is one `stockQty` + `supply` mode + `StockMovement` log. |
| Photo / expert request | Not built. |
| Sentry / crash reporting | Not wired (needs a DSN). |

## 2. What is reused as it is

- The whole backend: Next.js route handlers on the same Neon database, the
  `{data}`/`{error}` envelope (`api/v1/_lib/respond.ts`), `createOrder`,
  `lib/validation` (names, phones), `lib/search`, `lib/credentials`,
  `lib/rate-limit`, `lib/order-token`, the admin session design.
- The app's API client (`src/api/client.ts`: deadline, error taxonomy, no
  auto-retry on writes), stores, design tokens, component set, i18n.
- The e2e suites — they are the regression net for every phase below.

## 3. What changes, and what deliberately does not

**Changes:** customer bearer sessions (§6), account deletion, a central
analytics service, environments, CI, unit tests, lint, first-launch welcome.

**Does not change, with the reason:**

- **No Supabase, no second backend, no direct database access from the
  phone.** Phone → HTTPS `/api/v1` → Next.js → Neon, as the spec says.
- **Prisma stays.** 26 migrations, triggers for the search index, working
  transactions. Drizzle would be a rewrite for no customer benefit.
- **TanStack Query / React Hook Form are not introduced wholesale.** The
  client already has a cache, in-flight de-duplication, deadlines and an
  error taxonomy in ~200 lines (`api/client.ts`, `hooks/use-resource.ts`);
  the forms are three screens. Swapping libraries across forty screens is
  risk without a customer-visible gain. Revisit if the account area grows
  mutations that need invalidation.
- **Zod stays on the server**, which is where validation is enforced. The
  app mirrors the rules for instant feedback and the server has the last word.
- **The domain folder layout is not moved.** `src/api` is the services layer
  per domain, `src/store` is client state, `src/components/ui` the kit.
  Moving files is churn; new domains go where the spec suggests
  (`src/services/analytics`).
- **Database entities the spec lists that have no data yet** (suppliers,
  supplier prices, purchase orders, generations, maintenance records) are
  not created empty. A table with no writer is a promise nobody keeps; each
  arrives with the feature that fills it (Phase 6).

## 4. Mobile architecture

```
src/app/            Expo Router screens (routes = files)
  (tabs)/           Accueil · Catalogue · Garage · Panier · Compte
  produit/ famille/ marque/ recherche  trouver  pieces-compatibles
  garage/           ajouter (make → model → engine), vin, vehicules
  commande/         livraison → paiement → confirmation
  suivi/            order timeline
  compte/           connexion · supprimer · commandes · favoris · adresses · parametres · retrouver
  gestion/          staff area (bearer admin session)
src/api/            one module per domain, all through api/client.ts
src/services/       analytics (new)
src/store/          Zustand: garage, cart, orders, favourites, account, staff…
src/components/ui/  the component kit (Button, ProductCard, VehicleCard,
                    CompatibilityBadge, QuantityStepper, BottomSheet, Toast,
                    Skeleton, EmptyState/ErrorState, StepIndicator…)
src/constants/      theme tokens (copied from the website's globals.css), config
src/i18n/           fr (default), en, ar (RTL)
```

Secrets on the phone: only per-user bearer tokens, in the Keychain /
Keystore (`store/storage.ts#secrets`). No database URL, no API key.

## 5. Neon / database architecture

- Neon Postgres, pooled connection for traffic, unpooled for `prisma migrate`.
- Every schema change is a Prisma migration in the website repo.
- Constraints already used: unique slugs/refs/emails, FKs with explicit
  `onDelete`, enums for statuses, `Decimal(10,2)` money, snapshot columns on
  orders. Indexes on every filter the API uses (status, userId, createdAt,
  search vectors, trigram).
- Phase 1 adds one table, `CustomerSession` (below).

## 6. Authentication architecture

The website's customer session is an httpOnly cookie. The app API may never
read a cookie (`respond.ts`, WRITE_CORS: a route with `*` CORS that honoured
a cookie would let any web page act as the customer). So:

- `CustomerSession`: 32 random bytes, base64url on the wire, SHA-256 at rest,
  30 days, revocable, `lastUsedAt` for pruning. Same design as
  `AdminSession`, which has been through review.
- `POST /api/v1/auth/signup` · `POST /api/v1/auth/session` (sign in) ·
  `DELETE /api/v1/auth/session` (sign out) · `POST /api/v1/auth/password-reset`
  (sends the website's reset e-mail; same answer whether or not the address
  has an account).
- `GET /api/v1/account` · `DELETE /api/v1/account` (password re-entered;
  orders are kept for the shop's accounts but detached from the person).
- `GET /api/v1/account/orders` · `POST /api/v1/account/orders/claim`
  (orders this phone holds tokens for — the token is the proof, never the
  e-mail).
- Identity is **always** derived from the bearer token on the server; no
  route reads a user id from the body.
- Password check, lockout and timing are `lib/credentials`, shared with the
  website and the staff door — one failure budget across all three.
- Guest checkout stays. Signing in is offered, never required.

Apple / Google sign-in and OTP are designed to slot in as further ways to
obtain the same `CustomerSession`; they wait on the owner's credentials.

## 7. Navigation map

```
Tabs: Accueil ─ Catalogue ─ Garage ─ Panier(badge) ─ Compte
Accueil → recherche | trouver | garage/ajouter | famille/[f] | produit/[slug]
Catalogue → famille/[f] → produit/[slug]      marque/[b] → produit
Garage → garage/ajouter → [make] → [model] (engine)   garage/vin   garage/vehicules
Panier → commande/livraison → commande/paiement → commande/confirmation/[ref] → suivi/[ref]
Compte → compte/connexion (sign in / create / forgot) → back
       → compte/commandes → suivi/[ref]      compte/retrouver
       → compte/favoris · adresses · parametres · compte/supprimer
       → gestion (staff only)
```

## 8. Design system

Already centralised in `src/constants/theme.ts` (colour, type, spacing on a
4/8 grid, radii, borders, shadows, motion, tap sizes) and copied from the
website's `globals.css` so the two front doors cannot drift. Deep navy,
white/light grey, warm yellow for the one primary action (never as text on
white — 2.09:1), green/amber/red reserved for compatibility and errors, always
with words. Barlow / Barlow Semi Condensed / Archivo, Cairo under Arabic.
44pt minimum targets, 16px inputs, reduced-motion honoured. New screens in
this plan use the existing kit; none gets its own card style.

## 9. Core journeys

1. Open → my car (picker or VIN) → compatible parts.
2. Search (name, reference, brand) → product → verdict → add → cart → COD
   order → confirmation → tracking.
3. Returning customer: sign in → my orders on any phone → reorder.
4. Guest who ordered, then created an account: the phone's orders are
   claimed with their tokens.
5. Account deletion from the app, in two taps and a password.

## 10. Security model

- The server is the boundary: prices, totals, stock, VAT, stamp and delivery
  fees are computed in `createOrder`; the client sends ids and quantities.
- Every private read is authorised by a bearer token hashed at rest; an order
  opens only for its token or its owner's session; wrong owner = 404, same as
  a missing order (no enumeration).
- Rate limits per identity and per address (`lib/rate-limit`), bounded
  bodies, Zod on every input, CSP/HSTS headers, no cookies on app routes.
- Admin routes check the role from the database on every request.
- Analytics accept a whitelist-shaped name, bounded properties, and never a
  user id from the client.

## 11. Analytics model

One service, `src/services/analytics.ts`: `track(name, props)` queues, a
batch is flushed every few seconds and when the app goes to background, to
`POST /api/v1/events`, which writes the website's existing `AnalyticsEvent`
table — so app events appear in the same admin analytics as the website's,
tagged `platform: ios|android|web` and `app: true`. Anonymous device session
id; the user id is attached by the server from the bearer session, never by
the client. No names, phones, addresses or free text beyond a search query.

Events wired in Phase 1: `app_open`, `vehicle_selected`, `vehicle_added`,
`vin_started`, `vin_completed`, `search_query`, `search_result_clicked`,
`category_viewed`, `product_viewed`, `compatibility_checked`, `add_to_cart`,
`remove_from_cart`, `view_cart`, `begin_checkout`, `purchase`,
`order_viewed`, `favorite_added`, `sign_up`, `login`, `logout`,
`account_deleted`.

## 12. Phases

| Phase | Content | State |
|---|---|---|
| 1 Foundation | Customer auth + deletion, analytics, environments (dev / preview / production, EAS profiles), unit tests, lint in both repos, CI | **done** — ARCHITECTURE.md §17 |
| 2 Core commerce | First-launch welcome (value → guest or sign in → vehicle), everything else already exists and is covered by e2e | **done** — §17 |
| 3 Conversion | Payment provider interface on the server (COD implemented, card as a disabled provider until contracted) | next |
| 4 Retention | Garage sync to the account, push (needs credentials), reorder from history | next |
| 5 Support | Photo / expert request with validated uploads | later |
| 6 Operations | Suppliers, purchase orders, reserved stock, import pipeline hardening | later |

What needs the owner, because it cannot be invented: Apple team id and bundle
identifier confirmation, Google OAuth client, an SMS provider for OTP, a
payment provider contract, FCM/APNs keys, a Sentry DSN, the shop's real
contact details, and the production/staging Neon branches' URLs.
