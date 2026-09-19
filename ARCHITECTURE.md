# The app's architecture, and why

`BRIEF.md` says what the shop is and what its rules are. This file says how
this repository is put together and what was decided along the way, in the
website's habit of explaining *why* in the file itself. It is written for
whoever picks the app up next, including a future me who has forgotten.

Written during the first working session. Everything here was run and looked
at; where something is untested, it says so.

---

## 1. The shape of it

```
src/
  app/                    screens — expo-router, file-based
    _layout.tsx           fonts + language settle here, before anything paints
    (tabs)/               the tab bar and the screens inside it
      _layout.tsx
      index.tsx           Accueil
      garage.tsx          Mon garage — the saved cars
    garage/ajouter/       the three-step picker, pushed over the tabs
      index.tsx             step 1 — make
      [make]/index.tsx      step 2 — model
      [make]/[model].tsx    step 3 — engine, and where the car is saved
  api/
    client.ts             the one place the app talks to the shop
    vehicles.ts           the vehicle endpoints, their types, their formatters
  components/
    picker-screen.tsx     one step of the picker; all three steps are this
    ui/                   text, screen, button, list-row, states, filter-field
  constants/
    theme.ts              the brand — colours, faces, type sizes, tap sizes
    config.ts             where the shop is, and how long to wait for it
  hooks/
    use-resource.ts       loading / failed / loaded, as one value
    use-app-fonts.ts      the nine font files
  i18n/
    locales.ts            the three languages and their direction
    dictionaries.ts       every string, in all three
    provider.tsx          the active language, and the RTL problem
  store/
    garage.ts             the customer's cars, on this phone
```

### Why the picker sits outside the tabs

Adding a car is a task with a beginning and an end, not a place. It pushes
over the tab bar as a stack, and finishing it calls `router.dismissTo('/garage')`
so the three steps collapse: the customer lands on their garage with the new
car at the top, and the back gesture does not walk them back through the flow
they just completed.

---

## 2. Navigation

expo-router, file-based, same idea as the website's App Router.

**The tab bar has two tabs because two screens are finished.** The brief lists
seven screens for v1. They become tabs as they are built. Five tabs now, three
of which open onto "bientôt disponible", would be the app advertising features
it does not have — the same habit as inventing stock, pointed at the app
instead of at a part.

**Route params carry what the previous screen already knew.** Step 2 receives
the make's name and id in the params rather than re-fetching the makes list to
look them up. The data was on the row the customer tapped.

---

## 3. State

Three kinds, deliberately kept apart.

| What | Where | Why there |
|---|---|---|
| The customer's cars | `store/garage.ts` — Zustand + AsyncStorage | Survives closing the app; needed by every screen; works with no signal |
| The active language | `i18n/provider.tsx` — context + AsyncStorage | Read by every component; changes rarely |
| Anything from the shop | `useResource` + the client's cache | Belongs to a screen, not to the app |

**The garage is the website's store, on purpose.** Same field names, same
`apa-vehicle` key, same six-car ceiling as `src/lib/vehicle-store.ts` in the
website repo. Nothing reads across — a phone and a browser share no storage —
but when the API grows `GET /account/garage`, the payload is already this
object on both sides. A mismatch in field names today is a migration later.

One deliberate divergence: at six cars the website silently pushes the oldest
out. This app says the garage is full and asks which one to drop. A customer
who loses the car they added three months ago has no way to know why.

**There is no global store for catalogue data.** A screen asks for what it
needs and the client's cache makes the second ask free.

---

## 4. Talking to the shop

`src/api/client.ts`. Every read goes through `get()`.

**No TanStack Query, for now.** v1 reads three endpoints: small, identical for
every customer, never written to from the app. What that needs is a timeout,
an abort, one shared cache and an honest error type — about a hundred lines,
visible in the repo, with no version to keep in step with Expo. The moment the
app gains something that *writes* — the cart, an order, the account — this
stops being enough and the library earns its place. Recorded here so the next
person doesn't have to guess whether it was thought about.

**Failures are typed, and the difference is shown to the customer.**
`offline` / `timeout` versus `server` are different sentences: "vérifiez votre
connexion" is useless advice when the shop's server is down. The HTTP status
is never printed on screen — "Erreur 503" helps nobody who is reading it.

**A twelve-second timeout, not the platform's sixty.** These customers are on
Tunisian mobile data, often in a workshop with one bar. A spinner that runs
for a minute before admitting defeat is worse than one that fails at twelve
and offers "Réessayer" — by then the customer has decided the app is broken.

**The cache is in memory only.** A garage picker that worked offline would
need the vehicle tables on disk, kept in step with a shop that can add a make
at any time, and the failure mode of getting that wrong is an app confidently
offering a car it can no longer supply. Not in v1.

### The API, in the other repo

Three endpoints were written in `Youssef4doll/automotive-pieces-auto` for this
flow, under `src/app/api/v1/`:

```
GET /api/v1/vehicles/makes
GET /api/v1/vehicles/models?make=<slug>
GET /api/v1/vehicles/engines?make=<slug>&model=<slug>
```

Conventions they set, which the rest of `/api/v1` should follow:

- **Every response is `{ data }` or `{ error }`.** A client that has to guess
  whether a bare array means success or a truncated body will guess wrong on a
  bad connection.
- **Errors are stable machine codes, not sentences.** The app writes its own
  French, English and Arabic. A message baked into the API arrives in the
  wrong language on most phones and cannot be translated without a new build.
- **One level per request.** The website's own picker fetches the whole
  make→model→engine tree and filters it in the browser, which is right for a
  desktop and wrong for a phone: a shopper who opens the garage to pick
  Renault should not download Volkswagen.
- **CORS is `*` on catalogue reads and must never be on order or account
  reads.** Native has no origin and doesn't care; the web build, which is how
  this app is developed and screenshotted, does. `*` is safe on data that is
  the same public answer for every caller and would be a real hole on anything
  that reads a session or an order token.

---

## 5. Language, and the RTL problem

fr (default), en, ar. The device's language is used on first launch; the
choice is then remembered.

**Strings that exist on the website are copied verbatim, not re-translated.**
"Mon garage" is called "Mon garage" in both front doors or it is two features
to the same customer.

**Catalogue vocabulary is not translated at all.** "Filtre à huile", "Clio IV",
"1.5 dCi" are what is printed on the box and what the counter staff say. They
come from the database in French in all three locales — the same decision the
website made.

**The three dictionaries are checked against each other at compile time.** A
key added to French and forgotten in Arabic used to be found by an
Arabic-speaking customer reading a French sentence; now it is a type error.

### RTL, honestly

Translating the text is the easy half. Arabic also flips the layout, and React
Native only reads `I18nManager` at startup: calling `forceRTL` mid-session
changes the flag and not the screen, leaving the app with half its layout
flipped, which looks like a bug in every screen at once.

So the app does two things rather than pretend:

- Components set `writingDirection` and `flexDirection` from the language.
  That works immediately and covers text, rows and chevrons — which is what
  this app is made of. Verified by screenshot: the make list mirrors, the
  chevrons point the other way, the counts right-align.
- Where the *native* flag genuinely disagrees, the app says so once and asks
  for a restart, in the language just chosen. It does not reload itself out
  from under someone who has just tapped a menu item.

**Two traps here, one of which shipped before it was caught.**
`I18nManager.isRTL` does not exist on react-native-web — the shim exposes only
`getConstants()` — so `rtl !== I18nManager.isRTL` compared against `undefined`
and was always true. Every web session showed "l'arabe se lit de droite à
gauche, redémarrez l'app" under a screen that was in English. And on the web
there is nothing to restart anyway: the browser re-lays-out the moment
`direction` changes. It is a native-only question now.

**Known gap.** The stack header's back arrow does not mirror under RTL on the
web build, because react-navigation reads the same native flag that is always
false there. On a real device with the flag set it mirrors. Not worked around,
because the workaround would be a hand-drawn header.

---

## 6. Fonts

Barlow (body), Barlow Semi Condensed (labels, buttons), Archivo (headings),
Cairo (Arabic). Loaded with `expo-font` from the `@expo-google-fonts/*`
packages — nine files, because **React Native cannot synthesise a weight**:
`fontWeight: '700'` on a face loaded as Regular gives a fake, badly spaced
bold on Android and is silently ignored on iOS. Nothing in this app sets
`fontWeight`; it picks a family.

**Cairo is loaded on every device**, not lazily on a language switch. It ships
inside the binary, so the cost is install size rather than the customer's
data, and loading it late means the first Arabic screen renders in the system
face and visibly re-flows.

**The whole family stack swaps under Arabic, headings included.** The first
draft swapped only the body face and left headings on Archivo, which has no
Arabic glyphs: every screen title rendered as boxes. `familyFor()` in
`theme.ts` is the single place that decision lives.

**Line heights are stated for every type size.** React Native's default
leading follows the font's own metrics, and Cairo's are taller than Barlow's —
left alone, the same screen came out a line and a half longer in Arabic and
the last row fell under the tab bar.

---

## 7. The brand

`src/constants/theme.ts`, copied from the website's `globals.css`. Change it
there, in one place.

**Gold is a fill, never text.** `gold-500` on white is 2.09:1 and fails WCAG
AA. The `Button` component has no gold-text variant to reach for by mistake.

**`Colors.dark` was deleted.** The scaffold shipped one whose values were
invented rather than taken from the site, and the website has no dark mode —
white with a navy header, day and night. Keeping it would have meant the app
quietly rendering an unapproved skin on every phone with dark mode on. If the
shop ever wants one, it is designed on the website first.

**Tap sizes are tokens, not padding suggestions.** 48 primary, 44 minimum, 40
for inline secondary controls.

---

## 8. Two decisions the brief asked to be made early

### "À vérifier" is the normal case, and the app is built for that

Most products have no fitment rows, so for most of the catalogue the app
genuinely does not know whether a part fits a given car. Three states, and
they are three different things: *fits* (a fitment row matches), *unknown*
(the product has no fitment rows at all — not "fits everything"), *does not
fit* (rows exist, none match).

The consequence reaches the garage picker, before any product screen exists:

**The picker lists every make, model and engine the shop has vehicle data
for — including the ones with no parts behind them.** Filtering to "vehicles
we have parts for" would empty the picker, and a customer whose car was
missing would conclude the shop does not serve their car rather than that one
table is incomplete. The part count rides along on each row so the choice is
informed; a count of zero shows no count rather than a bare "0", and never
hides the row.

When the product screens land, the rule is the same: *unknown* gets its own
words — the website's "Vérifier avant d'acheter" — and is neither silently
treated as fitting nor silently blocked from the basket.

**A measurement, so nobody quotes the wrong number.** The seeded development
database has 52 of 55 products carrying fitment rows, which sounds like good
coverage and is not a measurement of anything: `prisma/seed.ts` assigns
engines at random to demo products. Production coverage could not be measured
from this session's container — outbound access to the live site is blocked by
network policy — so the brief's "coverage is thin" stands unverified but
unchallenged, and the design assumes it.

### Order ownership: a token, and never the email

Order references are sequential (`CMD-1042`) and printed on the page, so a
reference is not a secret. The website proves ownership with an httpOnly
cookie holding order ids — see `src/lib/order-access.ts` there. A phone has no
cookie jar to lean on.

**Decided: `POST /api/v1/orders` returns the reference *and* a token, and the
app keeps the token in the device keychain (`expo-secure-store`).**
`GET /api/v1/orders/:ref` accepts that token or a session, and nothing else.

Specifically, and to be built with the checkout:

- The token is generated server-side, at least 32 bytes of CSPRNG output,
  stored **hashed** on the order row. A database dump should not be a set of
  working order links.
- `expo-secure-store`, not AsyncStorage: the Keychain and the Android
  Keystore. AsyncStorage on Android is a world-readable-ish SQLite file on a
  rooted handset.
- **An email address on an order is never proof.** Checkout asks for it and
  believes the answer; it is unverified. Accepting "the email matches" would
  hand a stranger's name, phone and delivery address to anyone who types it —
  which is exactly the reasoning already written down on the website side.
- The lookup endpoint gets the website's tightest rate limit, the one
  `LIMITS.orderLookup` already uses, for the same reason: sequential
  references mean a wrong answer still tells a guesser something.

---

## 9. Running it

```bash
npm install
npx expo start --web     # or --android / --ios
```

The app reads a website. `API_BASE_URL` in `src/constants/config.ts` defaults
to `http://localhost:3000` in development (`10.0.2.2` on the Android
emulator), and is overridable through `expo.extra.apiBaseUrl` in `app.json` so
a build can be pointed at staging without a code change. A real handset needs
the developer's LAN address there.

To run the website locally, see its `HANDOVER.md` — `npm run db:migrate`,
`npm run db:seed`, `npm run dev`.

**`web.output` is `single`, not `static`.** The scaffold's `static` makes
expo-router pre-render each route in Node, where there is no `window` — which
crashed `expo start --web` on startup the first time the garage store existed,
because Zustand's persist middleware reads storage at import time, before any
component renders and outside any error boundary. The store now degrades to a
no-op storage when there is no `window` (correct regardless), and the web
target is an SPA because an app's web build is a development and preview
surface. The website is the website.

---

## 10. How this repo is worked on

The website's four lines, which apply here and earned their place again this
session:

- **Measure, don't assert.** Build it, run it, screenshot it, and read the
  screenshot. Three bugs in this session were invisible to a clean typecheck
  and obvious in a screenshot: the RTL restart prompt on an English screen,
  tab labels sheared off along the bottom edge, and then — after the first
  "fix" — tab labels gone entirely while the bar still looked deliberate.
- **A missing precondition is a FAIL, not a skip.**
- **One copy of a rule.** Validation, price formatting, availability logic and
  the dictionaries exist on the website. Share or port them deliberately;
  never retype them.
- **When a field is empty, the screen says less.** `subtitle` and `note` on a
  list row are `string | null`, and null renders nothing. That is the shop's
  rule in the type system.

### What is not done

- Only two of the brief's seven screens exist: Accueil (small and honest) and
  Mon garage with its picker.
- No search, no product screen, no cart, no checkout, no order tracking, no
  account. The API endpoints behind them are not written either.
- The garage does not sync to an account, because there is no account yet.
- There are no automated tests. The website's answer is Playwright against a
  real database; the app's equivalent needs choosing. Everything in this
  session was verified by driving the real app in a browser and reading the
  screenshots, which is a starting point and not a substitute.
- VIN entry, which the brief lists as a second way into the garage, is not
  built. The website has `src/lib/vin.ts` to port rather than rewrite.
