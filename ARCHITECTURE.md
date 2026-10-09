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
      catalogue.tsx       the part families
      garage.tsx          Mon garage — the saved cars
    famille/[family].tsx  one family: subcategory filter + its parts
    garage/ajouter/       the three-step picker, pushed over the tabs
      index.tsx             step 1 — make
      [make]/index.tsx      step 2 — model
      [make]/[model].tsx    step 3 — engine, and where the car is saved
  api/
    client.ts             the one place the app talks to the shop
    vehicles.ts           the vehicle endpoints, their types, their formatters
  components/
    picker-screen.tsx     one step of the picker; all three steps are this
    ui/                   text, screen, button, list-row, tile, chip (the
                          breadcrumb), product-card, compatibility, price,
                          entry-card, section-header, skeleton, states,
                          filter-field
  illustrations/
    logo.tsx              the shop's artwork, lockup and mark
    parts.tsx             the sixteen part families, drawn
    paths.tsx             the ways into the catalogue, drawn
assets/images/
  app-icon-art.webp       the app icon the owner supplied — icon, splash, favicon
  logo-lockup.webp        the logo the owner supplied — what the screens draw
scripts/
  make-icons.mjs          cuts every icon and logo file out of those two
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

**Five tabs: Accueil, Catalogue, Garage, Panier, Compte.** There were three
until the basket and the account existed, on the rule that a tab opening onto
"bientôt disponible" is the app advertising features it does not have — the
same habit as inventing stock, pointed at the app instead of at a part. Each
tab keeps its own state when the customer leaves and comes back.

**Search is not a tab.** It is the box on Accueil's hero and at the top of
Catalogue, and it opens `/recherche` — a root-stack screen, full height, with
the keyboard already up. A sixth tab would push the labels under the width a
320pt phone can set them at.

**Everything a customer can be sent a link to is a route**, so a deep link
lands on it directly: `/produit/[slug]`, `/recherche?q=`, `/famille/[family]`,
`/suivi/[ref]`, `/commande/confirmation/[ref]`, `/garage/vin`. The order
screens read with the token in the keychain, so a link to someone else's
order opens nothing.

**Route params carry what the previous screen already knew.** Step 2 receives
the make's name and id in the params rather than re-fetching the makes list to
look them up. The data was on the row the customer tapped.

---

## 3. State

Three kinds, deliberately kept apart.

| What | Where | Why there |
|---|---|---|
| The customer's cars | `store/garage.ts` — Zustand + AsyncStorage | Survives closing the app; needed by every screen; works with no signal |
| The basket | `store/cart.ts` — ids, quantities and a display snapshot; **never a price** | Every total is re-priced by the shop (`POST /cart/quote`) |
| Orders placed here | `store/orders.ts` — the list in AsyncStorage, each token in the Keychain/Keystore | The token opens a stranger's address if leaked; see §10 |
| Delivery details | `store/checkout.ts` — the customer's own, for the next order | "Effacer mes coordonnées" in Compte removes them |
| Recent searches | `store/recent-searches.ts` — eight, removable one by one | Only searches the customer ran, never keystrokes |
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

**The cache is in memory, except the shop's furniture.** A garage picker that
worked offline would need the vehicle tables on disk, kept in step with a shop
that can add a make at any time, and the failure mode of getting that wrong is
an app confidently offering a car it can no longer supply. Not in v1. Families,
parts makers, the shop's settings and its promotions are the exception (§28):
kept a day on disk, drawn at once, asked again behind the screen.

### The API, in the other repo

The app's API lives in `Youssef4doll/automotive-pieces-auto`, under
`src/app/api/v1/`:

```
GET  /api/v1/vehicles/makes | models?make= | engines?make=&model=
GET  /api/v1/vehicles/vin?vin=              the make from a VIN, or null
GET  /api/v1/catalogue/families
GET  /api/v1/catalogue/products?family=&subcategory=&engine=&fits=1&page=
GET  /api/v1/search?q=&engine=&take=&submitted=1
GET  /api/v1/products/:slug?engine=
GET  /api/v1/settings/public                delivery, tax, contact — no secrets
GET  /api/v1/promotions
POST /api/v1/cart/quote                     ids + quantities -> the shop's prices
POST /api/v1/orders                         -> { ref, token, order }
GET  /api/v1/orders/:ref                    Authorization: Bearer <token>
POST /api/v1/orders/lookup                  ref + phone -> a fresh token
```

**One copy of each rule.** Search is the website's `rankProducts`; the order
is the website's own checkout transaction (`lib/orders/place.ts`, which the
server action now calls too); the guest lookup is the website's matching rule
(`lib/orders/lookup.ts`); every product row is shaped by one mapper
(`lib/data/app-catalog.ts`). The app never computes a price, a fee or a tax.

`fits=1` is the narrow one and it earns its place: it returns only the parts
that have a `ProductFitment` row for that engine — the shop's confirmed list
for one car, which is what `Pièces compatibles` renders. It has to be a
server-side filter. Filtering a page of twenty client-side would report
"nothing fits your car" whenever the confirmed parts happened to sit on page
two, and that is not hypothetical: on the BMW 116i in the shop's own data,
page one holds one of the two confirmed parts. It narrows to FITS only, never
FITS plus UNKNOWN — a part with no fitment rows is one nobody has checked,
and folding those in turns "confirmed for your car" into "probably fine".
Asking for it without an `engine` is a 400 rather than a silently empty page.

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

fr (default), en, ar. A first launch opens in Arabic on an Arabic phone and
in French on any other — never English, which is one tap away in Compte →
Langue and in the welcome screen's chips (§28). The choice is then remembered.

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

## 7. Information architecture

The customer's journey, and where each screen sits in it:

```
DISCOVER   Accueil            what this is, and the ways in
IDENTIFY   Mon garage         make → model → engine, kept on the phone
BROWSE     Catalogue          the families the shop actually stocks
           Famille            its parts, filtered by subcategory
           Pièces compatibles what the shop has confirmed fits this engine
           Recherche          one ranking for the box and the results
EVALUATE   Fiche produit      verdict, price, stock, then the details
BUY        Panier             priced by the shop on every change
           Livraison          who and where, remembered for next time
           Paiement           cash on delivery, and a last look
           Confirmation       the reference, and why to keep it
TRACK      Suivi              the status in words, then the dated history
           Compte             the orders on this phone, recovery, contact
```

The home screen follows the owner's reference mockup, placement for placement:

```
Bonjour 👋, search        greeting and the magnifier
Que recherchez-vous ?     over a drawn night road (no stock photography)
three bubbles on an arc   Référence · the car (big, gold ring) · Photo / Expert
                          — the photo bubble only when the shop has a channel;
                          until then that slot is "Quelle pièce"
white sheet               Catégories populaires (the four biggest families)
                          Entretien auto card → Filtres (navigation, not a promo)
                          the shop's real campaigns, when it runs one
```

Where the reference showed data the shop does not have — a star rating,
"Garantie 2 ans", a delivery date, a named greeting — the placement is kept
and the value is the shop's real one, or the element is absent.

Every screen answers one question and offers one primary action. The home
screen's is "which way do you want to start"; the garage's is "which car";
a family's is "which of these parts".

**The vehicle is the app's running context.** Once a car is in the garage it
changes what every other screen says — the home screen leads with it, and
every product card is judged against its engine. It is chosen once and
carried, never asked for twice.

**Two reads, one cache.** A family screen needs the subcategories (from the
families endpoint) and the products (from the products endpoint). The first
is already cached from the moment the customer opened the Catalogue tab, so
switching filter chips re-fetches only the parts.

---

## 8. The visual language

Drawn from two references the owner pointed at — a booking app and a template
browser — and reduced to the handful of moves that actually carry them.

**A hero with a sheet pulled over it.** The home screen is a navy panel with
the customer's car set large in it, and a light rounded panel overlapping its
bottom edge by 28pt. The overlap is the whole effect; without the negative
margin these are two stacked blocks and the screen looks assembled rather than
designed. The hero runs under the status bar and carries the safe-area inset
in its own padding, because an inset applied outside it leaves a white band
over the navy.

**The discovery arc.** "Que cherchez-vous ?" is a horizontally snapping row
whose cards sit on a shallow dome: the active one upright at full strength,
its neighbours 16pt lower and 6% smaller, the next 30pt lower again. It is
the home screen's signature interaction and the reasoning is in
`src/components/ui/discovery-arc.tsx`, but the short version is that a parts
shop's hardest moment is the first one — somebody holding a broken thing who
does not know whether they know its name — and a path is a smaller question
than a grid of equal cards.

Three constraints kept it from becoming a gimmick. The lift is small enough
to read as a curve rather than a carousel. There are no pagination dots and
no scrollbar: the affordance is the peek, because a slide is 62% of the
container, so the next card is always a third visible at the edge — which
shows *what* is next rather than how many there are, and costs no vertical
space. And the whole gesture runs on the UI thread: one shared value written
by `useAnimatedScrollHandler`, read by each card inside a worklet. React
renders a card once and is not involved in the scroll at all. The only thing
that crosses back to JavaScript is the active index, and only when it
changes, because the selected state has to reach the accessibility tree.

Emphasis is never carried by scale and opacity alone — under Reduce Motion
there is no arc at all — so the active card also darkens its border and shows
a gold marker, and each card is numbered.

**Where a destructive action lives.** Never beside the action it could be
mistaken for. The garage's "retirer ce véhicule" sits behind a "…" on each
row, opens a bottom sheet, and asks before it acts — and the confirm button
is red, not gold. That last part was a real bug: gold is the shop's
yes-do-this colour, and a gold "retirer" next to a grey "annuler" reads as a
choice between proceeding and cancelling rather than between deleting and
keeping. `Button` gained a `danger` variant copied from the website's own
`bg-red-600 … text-white`. Red is never the only signal either: the row is
last, separated by a rule, and carries a bin icon.

**There is no photography, and that is a decision, not an omission.** Both
references get most of their impact from a full-bleed photograph. This shop
has almost no product photographs and no lifestyle photography at all — see
`BRIEF.md` §8. A stock photograph of somebody else's workshop behind the
headline would invent the shop's premises exactly the way a fake stock count
invents its shelves, and it would also be somebody else's asset. So the hero
is navy, and the presence comes from type size and the overlap instead. It
costs nothing and it is true. When the shop has its own photographs, the hero
is where the first one goes.

**The other thing the references do that this app must not.** They are full of
"Top 10", "123K users", "Trendy" — social proof with nothing behind it. That
is the form this app takes the structure from and refuses the content of. The
counts on a picker row are distinct active parts with a recorded fitment,
counted by Postgres; there is no badge in this app that is not a fact.

**Accent discipline.** Gold marks exactly two things: the one primary action
on a screen, and state (the current breadcrumb step, the active car, a
selected tile). Everything else is navy, the light surface, or nothing. The
moment gold marks a third category it stops meaning anything.

**Depth in two steps.** `Elevation.resting` for cards sitting on the
background, `Elevation.lifted` for a sheet over a hero. There is no third.
Tuned dark and wide — navy at low opacity over a long radius — because black
at high opacity over a short one reads as a border someone got wrong.

**Two layouts for a choice, picked by what the choice is.** Makes and models
are lists of cards: scanned down a column, sometimes filtered, occasionally
forty of them. The motorisation is a grid of tiles: it is the last choice and
the one the whole app hangs off, there are rarely more than four, and they are
compared against each other rather than searched for. A tile already in the
garage gets the accent outline and a check — "already chosen" and "chosen now"
are the same fact from the customer's side.

**The breadcrumb replaced the step counter.** "ÉTAPE 1 SUR 3" said how far
along the customer was and nothing else. `Renault › Clio IV › Motorisation`
says the same thing, plus what they have already picked — which is the
question they actually have at step three — and the completed steps are the
way back. A step that looks pressable is pressable; the ones not reached yet
are outlined and inert.

**The logo is the shop's file, not a drawing of it.**
`assets/images/logo-lockup.webp` is the artwork the owner supplied, and it is
the source of the logo the screens draw. `scripts/make-icons.mjs` cuts the
trimmed lockup, the hexagon on its own and the notification icon out of those
same pixels, so nothing can drift from it. (The launcher icon and the splash
have their own supplied artwork since September 27 — see §22.)

An earlier pass rebuilt the mark as SVG paths so it could take any colour and
scale for free. That was the wrong trade and it is gone: a reconstruction
that is 98% right is a different logo, and the wordmark's real lettering is
visibly not Archivo ExtraBold. The lesson generalises — a shop's logo is the
one asset in an app that has to be exactly itself.

Three things to know about the file:

- **Its wordmark is white.** It is the version for dark surfaces, which is
  correct on the navy hero where the app uses it, and it would disappear on a
  light one. A light-background version has to come from the shop; tinting
  theirs is not the same thing.
- Red appears **nowhere else in this app**, which is what makes it read as a
  signature rather than as an alert.
- The lockup mirrors under RTL — the mark moves to the right — but the
  artwork itself is never flipped. It is the shop's name as painted on the
  shopfront.

The script finds the hexagon by looking for the artwork's only large gold
region rather than hard-coding a crop, so replacing the logo file with one
that has different padding does not silently produce an off-centre icon. The
monochrome Android layer is derived from the same pixels: gold becomes white
and everything else, the navy A included, becomes transparent, so the letter
is knocked out exactly as it is in the real mark.

The launcher icons were Expo's scaffold artwork until now, and `app.json`
pointed iOS at Expo's icon-composer bundle, so the app would have shipped
under somebody else's mark on iPhone and the right one on Android. Both are
fixed.

**The illustrations are the shop's own, in `src/illustrations/`.** Sixteen
part families and the ways into the catalogue, drawn as SVG on one 24×24 grid
with one stroke weight. Sixteen drawings that visibly belong to each other are
a brand; sixteen icons from three different sets are a template. The rules
that keep them a family are written at the top of `parts.tsx` — one viewport,
strokes at 1.6, exactly one flat accent shape per drawing, readable at 20pt,
and the recognisable silhouette rather than the accurate one.

A family's drawing always appears in a disc (`ui/part-badge.tsx`), and a
product's always in a rounded tile. That is not decoration: a product tile
holds either a photograph of the actual part or — for most of this catalogue
— the same family drawing, so the two slots have to look like the same slot.
Circles mean "a category", tiles mean "a thing".

They also *are* the product imagery. Almost nothing in this catalogue is
photographed, so a product card with no photo draws its family instead of
showing a picture of a different part — the same answer the website gives, in
vector rather than a rasterised SVG endpoint. `PartArtwork` falls back to a
generic part for a family slug it has never seen, because families come from
the database and the shop can add one from the admin at any time.

**Design tokens, in `constants/theme.ts`.** Colour, type, spacing, radius,
border, elevation, motion, icon size, z-index, breakpoints, tab bar height.
Nothing in a screen should invent a value that belongs in here. Two of them
are worth singling out:

- **Green is not in the brief's palette and is in the shop.** `BRIEF.md` §4
  lists navy, gold and red; the website paints "En stock" and "Compatible"
  green in about a hundred places. The tokens are the Tailwind greens those
  classes resolve to, read off the storefront rather than chosen here — a
  success state the app picked its own green for would put the two front
  doors in different skins on the one signal a parts shop cannot get wrong.
- **`Tap.compact` (40) is no longer used as a control height.** A sweep across
  seven viewports found filter chips, "Voir tout" and the garage's row actions
  sitting at 40pt, under the 44 accessibility floor. Anything pressable is now
  `Tap.min` at least.

**The banner space renders nothing far more often than it renders
something.** `ui/promo-banner.tsx` shows whatever the shop has running in
`/admin/promotions` — the same list the storefront's own promo band reads, so
the shop changes a campaign once and both front doors move. When there is no
campaign the component returns null and the space goes back to the catalogue.
There is no placeholder, no evergreen "bienvenue" slide and no house ad:
inventing something to fill that gap is the same habit as inventing stock.

Two details it inherits and one it does not. The promotion's `title` is
written by the shop as the image's alt text, so it becomes the accessible
name and is never drawn over the artwork as a headline. A banner whose href
has no equivalent in the app — `/#magasin` is an anchor on the website's home
page — is simply not tappable, rather than throwing the customer into a web
view of the shop they are already standing in. And unlike the website's band
it **does not auto-advance**: on a phone a banner that moves while somebody
is reading it, or shifts the tap target mid-press, is the first thing under a
scrolling thumb.

**Compatibility is one component, four states.** `ui/compatibility.tsx`.
*Fits*, *unknown*, *does not fit*, and *no vehicle chosen* — four genuinely
different sentences, never collapsed. Every state carries an icon and a
sentence, never colour alone. It looks the same on a card, in a list and
(when it exists) on a product page.

**Icons are Feather, from `@expo/vector-icons`.** An earlier note in this file
said the project could not use an icon set without breaking the shop's rule
about not copying another party's assets. That was wrong, and the rule it
cited is about not copying *another shop's* branding — a permissively licensed
icon font is a dependency like Barlow is, not a competitor's logo. The
placeholder geometric marks it caused are gone.

---

## 9. The brand

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

## 10. Two decisions the brief asked to be made early

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

Built as decided, with the checkout:

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

What landed, and one change from the plan:

- Tokens live in their own table, `OrderAccessToken`, not a column on the
  order: an order can be opened from the phone that placed it and from one
  it was recovered on with its reference and phone number, and each phone
  holds its own key.
- The token is minted **inside the order's transaction**, so an order and
  the only key to it exist together or not at all. That was tested by
  accident: a dev server with a stale Prisma client failed to write the
  token, and the stock it had claimed came back.
- `GET /orders/:ref` accepts the order's token, or (since §17) the app
  session of the account that owns the order — never a cookie. That is
  also what lets the route take CORS `*`:
  the danger of `*` is ambient credentials, and a bearer header is not
  ambient. The rule is written on the route helper: a route with the write
  profile never reads a cookie.
- Tested from outside: a forged token, a valid token for the reference next
  door, and a wrong phone on lookup all get the same 404; no header is 401;
  a price sent in the order body is ignored. `e2e/journeys.mjs` repeats
  those on every run.

---

## 11. Running it

```bash
npm install
npx expo start --web     # or --android / --ios
```

The app reads a website. `API_BASE_URL` in `src/constants/config.ts` works it
out rather than being told: on a real handset in Expo Go the bundle came from
the developer's machine, so `Constants.expoConfig.hostUri` already holds the
address the website is on. Only a bare IPv4 is accepted from it — `expo start
--tunnel` puts an ngrok domain there and there is no website on port 3000 of
an ngrok domain. Failing that it is `10.0.2.2:3000` on the Android emulator
and `localhost:3000` everywhere else, and `expo.extra.apiBaseUrl` overrides
all of it. Start the website with `npm run dev:lan` so it listens on the LAN
rather than loopback.

To run the website locally, see its `HANDOVER.md` — `npm run db:migrate`,
`npm run db:seed`, `npm run dev`.

**`expo.extra.apiBaseUrl` must be absent when it is not wanted, never
`null`.** Expo resolves a `null` there to an empty object at runtime, and `{}`
is truthy — so `configured ?? fallback` kept it and the app died at import
time on `.replace is not a function`, taking every screen down with it.
`constants/config.ts` now validates the value and falls back with a warning
that names the file, the key and what it found, because a config mistake
should cost a line in the console rather than the whole app.

It shipped because a long-running dev server was serving a bundle from before
the key existed; it failed the moment anybody started cold. Worth remembering
when testing anything that comes from app.json: **restart the dev server and
clear `/tmp/metro-cache`**, because `--clear` alone did not evict the stale
value here.

**`web.output` is `single`, not `static`.** The scaffold's `static` makes
expo-router pre-render each route in Node, where there is no `window` — which
crashed `expo start --web` on startup the first time the garage store existed,
because Zustand's persist middleware reads storage at import time, before any
component renders and outside any error boundary. The store now degrades to a
no-op storage when there is no `window` (correct regardless), and the web
target is an SPA because an app's web build is a development and preview
surface. The website is the website.

---

## 12. How this repo is worked on

The website's four lines, which apply here and earned their place again this
session:

- **Measure, don't assert.** Build it, run it, screenshot it, and read the
  screenshot. Everything that has gone wrong here was invisible to a clean
  typecheck and obvious in a screenshot: the RTL restart prompt on an English
  screen, and the tab bar's height wrong three separate times — labels sheared
  off, then gone entirely while the bar still looked deliberate, then sheared
  again once the placeholder glyphs became real icons. That number cannot be
  reasoned about from the font size, because the navigator adds margins of its
  own. It is also worth screenshotting what looks broken before fixing it: the
  grid tiles appeared to have a hard dark edge at 2x, and at 4x it was just
  the shadow rendering correctly.
- **A missing precondition is a FAIL, not a skip.**
- **One copy of a rule.** Validation, price formatting, availability logic and
  the dictionaries exist on the website. Share or port them deliberately;
  never retype them.
- **When a field is empty, the screen says less.** `subtitle` and `note` on a
  list row are `string | null`, and null renders nothing. That is the shop's
  rule in the type system.

### What is not done

**Built and working on real data:** Accueil with search and the discovery arc,
Catalogue, a family with its subcategory chips, Pièces compatibles, Recherche,
the product page, the basket, the two-step checkout, the confirmation, order
tracking, order recovery, Compte, Mon garage with its picker and the VIN
shortcut, and the help screen (which appears only when the shop has a
channel). The eight shopper journeys in the redesign brief are walked by
`e2e/journeys.mjs` on every run and pass.

**Deliberately absent, because there is nothing true to show:**

- **Ratings and reviews.** The reference design shows "4.6 (124 avis)". There
  is no review table. The line is not there.
- **Delivery dates.** The shop publishes delays ("24h", "48–72h") and the app
  quotes them. It never turns one into a date nobody committed to.
- **"Garantie 2 ans".** The shop's warranty is twelve months, stated across
  the website; the app says twelve.
- **Manufacturer logos.** BMW's roundel is BMW's. The make tiles show the
  logo the shop uploads to `VehicleMake.logoUrl`, and a monogram until it
  does — today, every one is a monogram.
- **The photo route, in production.** "Je ne sais pas son nom" opens a
  WhatsApp conversation with the shop, and the shop's WhatsApp, phone and
  e-mail are still placeholders. The card is absent until the owner fills
  one in at /admin/parametres; it then appears with no release.
- **Notifications.** No push service yet (needs the owner's FCM/APNs keys).

**Next, in order:**

1. ~~**Sign-in and "Mes commandes" across devices.**~~ Done — §17. The
   garage is not synced to the account yet.
2. **Camera OCR of the carte grise.** Needs on-device text recognition (a
   native module outside Expo Go) or a service. The VIN screen is the typed
   version and says it only identifies the make.
3. **A photo sent in-app.** Needs image storage on the shop side
   (`MediaAsset` exists) and a message type the admin inbox can show.
4. **Symptom-based discovery.** Needs a symptom→family mapping nobody has
   written, and must never read as a diagnosis.
5. **Pagination on a family and on search.** Both endpoints page; the screens
   show the first page. Fine at 55 parts, not at 5 000.
6. ~~**Analytics.**~~ Done — §17, into the website's own table.
7. **Shared transitions** (card → product image). Reanimated 4 supports them;
   worth doing once there are real photographs to carry across.

**Testing.** `npm run e2e` is layout at nine widths (320–1024) on the home
screen and at three on every buying screen, the arc's geometry, Arabic
mirroring, the eight journeys and the order API's security. It runs against
the web build, so it proves layout, text fitting, target size, direction and
behaviour, not platform specifics — the phones are still checked by hand.
`journeys.mjs` places real orders and refuses to run against anything but a
local shop unless told otherwise.

### One assumption worth checking

The redesign brief this work came from says to keep Next.js, React and
Tailwind. This repository is Expo / React Native, and the mockups that came
with the brief show a native tab bar and an iOS status bar, so that line was
read as carried over from the website's own brief and the work was done in
the app. If the intent was the website's mobile web instead, the design
decisions here port but none of the code does.

---

## 13. The staff area (`/gestion`)

The owner asked for the admin in the app. It is a second door onto the same
admin, not a second admin: the same accounts, the same rules, the same
database rows.

**Sign-in.** `POST /api/v1/admin/session` checks the password with the
website's own function (`lib/credentials.ts` there), so both doors share one
lockout budget and one timing — an unknown e-mail costs a bcrypt compare like
a wrong password does. Only `role = ADMIN` gets a session; a customer with the
right password is told `forbidden`, not "wrong password".

**The token.** 32 bytes from the CSPRNG, stored as SHA-256 in `AdminSession`,
sent as `Authorization: Bearer`, kept in the Keychain/Keystore (`secrets` in
`store/storage.ts`, key `apa-staff.session`). It is a row rather than a signed
JWT so it can be taken back: signing out deletes it, and the role is re-read
from `User` on every request, so a demoted account stops working on its next
call. Thirty days, then sign in again.

**Why not the website's cookie.** The rule from §10 holds: a route with the
write CORS profile never reads a cookie. `/api/v1/admin/*` answers any origin
(the web build of this app is cross-origin in development) and would be a
cross-site request forgery if it honoured the website's session. It does not;
`e2e/staff.mjs` sends one and gets a 401.

**One copy of each rule.** The website's server actions and the app's API both
call `lib/admin/{orders,products,categories}.ts`. Moving an order, counting
stock, adding a photo (8 at most, bytes sniffed, never trusted by name),
replacing a family picture: one implementation. Setting an order to the status
it already has is a no-op in both — it used to re-email the customer.

**What the phone does, and what it leaves to the website.** The phone does
what is done standing at a counter or a shelf: move an order, ring the
customer, count, reprice, take offline, photograph. References, fitments,
descriptions, imports, promotions and analytics need a keyboard and a long
look, and the product screen says so rather than half-offering them.

**Honesty, the same as the shop window.** The dashboard prints counted
figures only — no trends, no forecasts. A contact setting still holding its
setup placeholder is shown empty with "à compléter : non affiché aux clients",
never echoed back as if it were the owner's number. Photos are resized to
1600 px / JPEG 0.8 on the phone (`lib/photo.ts`) so they fit the shop's 4 MB
limit on a workshop connection.

**Screens.** `gestion/_layout.tsx` is the gate (no session → `connexion`);
`index` (dashboard), `commandes/` (list, detail, status), `stock/` (list;
photos, count, price, online, supply), `familles`, `boutique` (settings). The
way in is the last row of Mon compte, "Espace boutique". Staff screens re-read
their data whenever they come back into view (`hooks/use-live.ts`), because
what they show changes underneath them.

---

## 14. The reference pass (September 2026)

The owner sent the full concept board (24 screens) and asked for the app to
match it as closely as possible. Every screen on the board now has its
counterpart, built on the shop's data:

| Reference screen | Here |
|---|---|
| Accueil (logo, "La bonne pièce, pour la bonne route.", search, Votre véhicule) + "Que recherchez-vous ?" arc | `(tabs)/index.tsx` — one scroll, dark head then white sheet |
| Catégories populaires, Entretien auto, Nos marques, Besoin d'un conseil | the home sheet; brands from `/api/v1/catalogue/brands` |
| Toutes les familles de pièces | `(tabs)/catalogue.tsx` — illustrated 4-column grid with a name filter |
| Freinage (dark head, chips, two-column grid) | `famille/[family].tsx` + `ui/product-grid.tsx` / `ui/product-tile.tsx` |
| Choisir ma voiture / Quelle est la marque ? | `garage/ajouter/index.tsx` (round make buttons, Véhicules récents, carte grise) |
| Mon garage (principal card, 2×2 actions, Mes véhicules) | `(tabs)/garage.tsx` |
| Mes véhicules (select, then act) | `garage/vehicules.tsx` |
| Ajouter un véhicule (four ways, Continuer) | `trouver.tsx`, linked under the arc |
| Carte grise / VIN | `garage/vin.tsx` — info box moved under the button, as drawn |
| Product (share, compat pill, facts, accordions) | `produit/[slug].tsx` (favourites removed September 2026, §19) |
| Search (chips, Suggestions, Récents) | `recherche.tsx` |
| Tab bar (gold pill on the active tab, "Garage") | `(tabs)/_layout.tsx` |

**Pictures.** The board's photographs of parts and cars are not ours to copy
and there is no photograph of a real part the shop has not photographed. So:
a filled illustration set, drawn once on the website (`src/lib/part-art.ts`,
served at `/api/part-art/<slug>.svg`) and fetched by `PartImage` — navy
outline, flat metal greys, one yellow accent — replaces the grey line icons
wherever a family is *the picture*. A shop photo or an uploaded family image
still wins. Cars are `illustrations/car-art.tsx`: one generic five-door with no
maker's features, the same for every entry, because the shop knows a make,
model and engine but not a body style or colour. The header uses the shop's
own logo lockup.

**Where the board could not be followed honestly** — each of these is data
the shop does not have, not a style choice:

- no star ratings or review counts on the product page (no reviews exist);
- no notification bell (the app sends none);
- "Bonjour Youssef" uses the name given at checkout, or just "Bonjour";
- no "Nos experts" — the advice card says the shop's team will help, and only
  appears when the shop has published a way to reach it;
- "Modifier le véhicule" is not offered: a saved car is a listed make, model
  and engine; changing it is choosing another car;
- makers' logos (BMW, Bosch…) appear only when uploaded in the admin; until
  then the name is set in type, never a drawn copy of a trademark;
- production years show only where the shop recorded them
  (`SavedVehicle.yearFrom/yearTo`, new and optional).

---

## 15. The refinement pass

Same screens, same features; this pass is about how they feel.

**Less noise.** Cards lost their outlines and sit on a soft lift
(`Elevation.resting`) — product cards and tiles, vehicle cards, catalogue
panels, the "four ways" rows. The brand tiles are flat surface, the
product page's delivery/warranty/returns strip lost its box and went muted:
reassurance under the button, not a second thing to press.

**Hierarchy.** Product cards read brand (red capitals) → name → a
compatibility *sentence naming the customer's car* ("Compatible avec votre
BMW Série 1") → price → stock, instead of a generic pill. The garage leads
with the car as a navy centrepiece carrying the one action it exists for
("Voir les pièces compatibles", gold); history, details and "add" are three
quiet doors under it, not three more identical cards.

**Motion, all of it on the UI thread and all of it off under Reduce
Motion:**
- `ui/press-scale.tsx` — cards settle to ~97% under the thumb and spring
  back (tiles, vehicle cards, category discs, the family grid, the garage);
- the heart pops once when a part is kept, and does nothing on removal;
- "Ajouter au panier" becomes "✓ Ajouté au panier" for 1.6 s, as well as the
  toast and the badge;
- on a product page long enough to need it, a purchase bar slides up once
  the inline button has scrolled out of view (price × quantity, the same
  button), and slides away when it is back.

**Flow.**
- Search offers the vehicle as its first suggestion when some results fit
  the car in the garage — "« filtre » compatibles avec votre BMW Série 1
  (2)" — which narrows the list to the confirmed ones, with a chip to undo
  it. It narrows *these results*; it never invents fits. Autocomplete
  debounce is 180 ms.
- "Comment trouver votre pièce ?" goes straight down a path in one tap (it
  used to be choose, then Continuer).
- "Mes véhicules" is a list of rows; each row's "…" opens its actions in a
  sheet (pièces compatibles, rendre principal, supprimer — which asks).
  Tapping a row makes it the car the app answers for.
- Home follows the brief's order: hero, search, vehicle ("Changer →" on the
  card), the arc, popular families, the shop's campaigns, then its brands.

**Illustrations.** The four ways in (`illustrations/bubbles.tsx`) are
redrawn in the part-family hand; the carte grise now points at the VIN line
("VIN · 17") and shows where the registration stamp sits.

**A rule this pass enforces:** a card with its own secondary action ("…",
the garage's gold button) is two buttons side by side, never one inside
another — nested `<button>`s are invalid on the web and ambiguous to a
screen reader, and the dev console says so.

---

## 16. One product, not a set of screens

The third pass asked for fewer boxes, one obvious action per screen and
interactions that behave like an app. What changed, and the rules behind it:

**Navigation is quiet.** The gold pill became a 14×3 gold bar under the
icon; icon and label go from grey to navy; the cart badge is a 16pt navy
count ringed in white. The tab bar border is a hairline.

**Home: the search is the action, the car is part of the hero.** The white
"Votre véhicule" card is gone; under the search sits one translucent line —
the car, its engine, "Changer" — or "Choisissez votre véhicule · Choisir".
The search pill ends in a gold arrow.

**The arc is a radial menu** (`ui/bubble-arc.tsx`). The centre is the car
the app answers for (or "Je connais ma voiture" without one), with "Je
connais la pièce", "J'ai la référence", "Une autre voiture" and, when the
shop can be reached, "Photo / Expert" either side. *A side bubble comes to
the centre when tapped; the centred one goes.* A caption under the arc says
what the centred bubble does. Native screen readers skip the two-step rule
(every bubble acts on its first activation); react-native-web always
reports a screen reader, so the web keeps the rule. Families are a
horizontal rail, most parts first.

**The product page buys from a pinned bar.** Quantity and "Ajouter au
panier" live at the foot of the screen, always within reach; after an add
the bar itself becomes "✓ Ajouté au panier · Voir le panier" for ~3 s — no
toast over the part, no modal, scroll untouched (`useAddToCart(…, { silent
})`). The image is smaller and sits on the page, not in a container.

**Compatibility is the strongest element, and "does not fit" is not an
error.** A panel under the name: green when it fits; neutral with a red
mark when it does not, *with the shop's reason* — "Listée pour 4
motorisation(s), pas pour votre BMW Série 1 (E87)." — and "Voir les
véhicules compatibles" / "Choisir mon véhicule"; amber when unverified, with
what to check; and "Choisissez votre véhicule…" with its button when there
is no car. "Ajouter quand même" is still one confirmation away.

**What fits comes first, everywhere a car is known.**
- Family pages: the *website* orders the list — parts with a fitment row for
  the engine first, then the rest, paged as one list
  (`listAppProducts`, two segments), so it holds past page one.
- Search: exact reference matches stay on top; then fits, unverified, and
  does-not-fit, the shop's relevance order kept inside each. A switch —
  "Voir uniquement les pièces compatibles (2 · BMW Série 1)" — narrows to the
  confirmed ones; when none of the results fit, the screen says so.

**Catalogue** is discovery: "Les plus fournies" as large swipeable
illustrations, then "Toutes les familles" as a clean list (picture, name,
subfamilies, count) — no four-column grid, which cut names in half at 320.

**Garage** with several cars is a paged carousel of hero cards (principal
first, page dots), each with its own "Voir les pièces compatibles" and, for
the others, "Rendre principal". History / details / add stay three quiet
doors below.

**Vehicle setup is guided**: a three-segment progress bar and "Étape 2 sur
3" above the chosen-value chips, and a confirmation when the car is saved
("Renault Clio IV enregistrée", with the way to its parts). The VIN screen
shows a success state — "Constructeur identifié : BMW", what remains, and
"Choisir le modèle" — instead of jumping away.

**Also:** product tiles gained a quick "+" (not on a part known not to fit —
that one needs its explanation); favourites have an empty state with a way
to the catalogue; every text input is 16px or larger so iOS Safari never
zooms on focus.

---

## 17. Foundation pass: accounts, analytics, environments, CI (September 2026)

The master specification asked for an assessment before code; it is
`docs/PLAN.md`, with what exists, what is reused, what changes and what
deliberately does not. This section is what Phase 1 and the first part of
Phase 2 actually built.

**Customer accounts, on the website's own accounts.** The app signs in with
the same e-mail and password as the website, through `POST
/api/v1/auth/session`, and gets a bearer token kept in the Keychain /
Keystore (`store/account.ts`, key `apa-account.session`). On the shop it is a
`CustomerSession` row — 32 random bytes, SHA-256 at rest, thirty days,
revocable — in its own table, so a customer token can never open the staff
door, whatever the account's role. The password check, lockout and timing
are `lib/credentials`, shared by all three doors. A password changed or reset
on the website signs every phone out.

- **Optional, and said to be.** Nothing routes a customer to sign in; the
  Compte tab offers it in one quiet row; the welcome's primary button is
  "Continuer sans compte". Guest checkout is unchanged.
- **Orders follow the account, proven by their own tokens.** On sign-in the
  app sends the order tokens this phone holds (`/account/orders/claim`);
  orders with no owner join the account. Never matched by e-mail. The
  account's orders from other devices are listed in "Mes commandes" and open
  with the session (`GET /orders/:ref` accepts the owner's session as well
  as the order token). Signing out removes those rows from this phone and
  keeps the ones it placed itself.
- **Deletion** is one tap from Compte, finished with the password, and says
  what goes (the person, sessions, baskets, reset links, the link from
  events and messages) and what stays (orders, detached — an invoice has to
  be kept). The owner's own account is refused, so a phone cannot lock the
  shop out of its back office.
- **Forgotten password** sends the website's reset e-mail; the new password
  is chosen on the website. One reset flow, not two.

**Analytics.** `src/services/analytics.ts` is the only door: `track(name,
props)`, batched every five seconds and on backgrounding, decisive steps
(`purchase`, `sign_up`, `login`…) sent at once. `POST /api/v1/events`
writes the website's `AnalyticsEvent` table tagged `app: true` + platform, so
one dashboard reads both front doors. The user id comes from the session on
the server, never from the body; property bags are bounded; no names,
phones, e-mails or addresses are sent. The events wired are listed in
PLAN.md §11.

**Environments.** `app.config.ts` reads `APP_ENV`: development (local shop,
found automatically), preview (a staging shop — required, and refused if it
is the live one), production (the live shop, and only it). Each has its own
bundle identifier, so test and store apps sit side by side. `config.ts` no
longer falls back to the live shop from anything but a production build.
`eas.json` carries the three profiles. EAS Update, push and the store
submission need the owner's Expo project and credentials (PLAN.md, end).

**First launch** (`/bienvenue`): four true sentences, the account (optional),
the car — or "Plus tard"; "Passer" on every step; once, then never. Only the
home screen sends a first-timer there, so a link opens what it points at.
No permission is asked.

**Quality gates.** ESLint (`eslint-config-expo`) in the app with zero
warnings allowed; the React Compiler rules it brought found real things —
state reset inside effects in the three data hooks (now derived from the
request it answers, so a new request reads "loading" on its first render),
Reanimated values written with `.value =` from React code (now `.set()`),
`Math.random` in a render. The website's 13 pre-existing lint errors are
fixed the same way. Unit tests (`node --test` via tsx) for the pure rules in
both repos. GitHub Actions CI in both: lint, typecheck, tests, and a build —
the website's against a throwaway Postgres migrated from zero, the app's for
all three platforms.

**Tested:** `e2e/account.mjs` (guest order → account → claim → sign-out →
second phone → deletion), `e2e/welcome.mjs`, and the sweep now includes the
sign-in and welcome screens at every width, French and Arabic.

---

## 18. Real pictures (September 2026)

Asked for: "use great icons and images like this … make it look so real … use
real images if needed". The full account is `docs/imagery.md`; the decisions:

- **Parts are photographed — in a studio that exists only in code.** Sixteen
  families, a car key, a magnifier, a phone and the home hero are Blender
  renders (`tools/renders`, Cycles, softbox lighting on a dark room so steel
  reads as steel). Real stock photography was not an option twice over: the
  sandbox reaches no photo library, and the brief forbids showing a
  photograph of one part as another. The renders show a *kind* of part,
  branded by nobody.
- **A product without its own photograph says "Illustration"** on the
  picture (PartImage `tagIllustration`) and, on its page, "Illustration de
  la famille … — pas encore de photo de cette pièce". The shop's upload
  replaces it with no release.
- **A car is its make's mark, not a picture of a car.** A generic hatchback
  beside "BMW Série 1 (E87)" would be a claim about the customer's car that
  is false. The marks are the real ones (Simple Icons data, CC0), drawn in
  the shop's navy, under an uploaded logo when there is one. A procedural
  car was modelled and dropped: it read as a toy.
- **Home** opens on the brake-disc hero with room left for it between the
  promise and the search, as the reference leaves room for its car; the
  ways in are the key, the disc, the magnifier and the phone.
- **Compte** shows the customer's own photo if they choose one — cropped
  square, 320 px, kept on the phone, never uploaded.

## 19. Orders by what was bought; the shop's own drawings (September 2026)

Asked for by the owner: "the user shouldn't see his order number like this",
"the cart is generic", the maintenance banner "doesn't match", and "remove
the favourites".

- **Mes commandes** leads each card with what was bought: the parts'
  pictures (up to three, stacked), the first part's name, "+ n more", the
  order's live state as a pill, the date and the total. The reference stays,
  small (`N° CMD-1066`), because it is what a customer quotes on the phone.
  States are read from the shop with each order's key on open and on pull
  (`useLive`); a card that cannot be read shows what the phone remembers and
  no state. New orders also store `lead` (first name, families) so the card
  is right before the shop answers. The tracking screen is titled "Suivi de
  commande", with the reference as a hint in its status card.
- **Empty screens** use `EmptyState` with drawings in the shop's navy and
  gold (`illustrations/empty-art.tsx`: a trolley on tyres, a taped parcel)
  or a studio render (search, help). The basket tab uses `NavCart`, drawn in
  NavCar's grammar so the bar reads as one set.
- **Entretien auto** is gone from Home (and `components/ui/care-banner.tsx`
  with it), at the owner's request: the families rail above it already opens
  the same families.
- **Favourites are gone**: the heart, `store/favourites.ts`, `compte/favoris`
  and the `favorite_added` event. Old installs keep an unread
  `apa-favourites` entry in storage; nothing reads it.
- **Home**: the greeting, title and bubble arc were removed earlier the same
  week; "Comment trouver votre pièce ?" opens `/trouver`, which holds every
  way in.

## 20. The audit of September 27: the right part, and nothing breaking

An outside audit scored the app 54/100: it looked good but broke "the right
part", and one product page crashed. What was fixed, in its order:

- **Crash.** `produit/[slug].tsx`'s photo gallery gave its horizontal
  ScrollView `alignItems`/`justifyContent` in `style`, which React Native
  throws on (web does not, so every local test passed). Only products with
  real photos have a gallery — hence "only some pages". Every route now has
  an error screen instead of a white page: `components/ui/route-error.tsx`,
  exported as `ErrorBoundary` from the root, tabs, staff and product routes;
  it offers "Réessayer" and reports `app_error` (name, message) to analytics.
- **Fitment** is decided on the website (see its HANDOVER §5.ff): VERIFIED
  rows only, and fuel rules no row can overrule. The app shows the website's
  verdict; a "to check" part now offers **Demander à la boutique**, which
  opens the photo request with the part's reference.
- **One delivery promise.** The product page shows the delay the checkout
  will show, for the governorate the customer last delivered to
  (`deliveryDelay` in lib/checkout); with none known, both of the shop's
  delays, each with its area. No computed date: the shop publishes delays,
  not a dispatch cut-off, so a date would be a promise nobody made.
- **Send a photo** (`app/demande-photo.tsx`, `api/expert.ts`): up to three
  photos, the garage's car, name and phone (+216, 8 digits) into the shop's
  inbox with the photos attached. Reachable from "Comment trouver votre
  pièce ?", the home screen's advice card, Aide & contact (now always its
  first action) and "to check" parts. WhatsApp is offered beside it, with the
  car in the message, once the shop publishes a real number.
- **Phone numbers**: `tunisianDigits` (same rule as the website) in the
  checkout, addresses and photo request; phone fields show a fixed "+216".
- **Add to cart** turns the bar into the cart's own − n + for that part and
  "Voir le panier (n)"; it stays until the part leaves the cart. English says
  "cart" everywhere.
- **Account menu**: one "Mes véhicules" row (active car · count); the staff
  door moved to Paramètres and appears in the menu only while a member of
  staff is signed in on the phone.
- **Category names in English and Arabic** (`i18n/categories.ts`, keyed by
  slug; `i18n/data-locale.ts` translates on the way in from the API, so a
  language switch re-reads from the cache with no request). A category the
  shop adds later shows as the shop wrote it until it is added there.
- **Store pickup** was already built: it appears at checkout as soon as the
  shop's address is filled in /admin/parametres (today a placeholder, so it
  is hidden rather than offered with no address).

Not done yet, and why: governorate → delegation lists need an authoritative
list of Tunisia's 264 delegations (not typed from memory); real product
photos, specs and OE numbers are the shop's data to upload; the Phase 2/3
growth items (typo-tolerant ranking by car, sort/filters, personalised home,
bought-together, promo codes, notifications, reviews, phone-code login,
online payment) are separate pieces of work — see docs/PLAN.md.

## 21. Before the real data arrives (September 2026)

The owner's list, built so the shop's real catalogue drops into finished
screens. Everything below renders only what exists; each piece says what it
does when the data is not there yet.

**Foundations (website side, see its HANDOVER §5).** Fitment is judged on the
exact engine (engine code + fuel): only VERIFIED rows fit, the fuel rules
(no ignition parts on a diesel, no glow plugs on a petrol) overrule any row,
and everything else is "À vérifier". The product carries a gallery, a specs
table in the shop's own words, OE references grouped by carmaker and "bought
together" links (the shop's own, then parts actually ordered together in 2+
orders). New products start offline and pass publishing checks (photo, sane
price, brand matching the name) with a preview before going on sale; makes
and categories with nothing in them stay hidden.

**Bugs from the audit.** All makes listed (no cap at 10); Arabic rails start
at the first item (`components/ui/rail.tsx`); Arabic plurals
(`i18n/plural.ts`); opening hours and fuel names translated at the API
boundary (`i18n/data-locale.ts`); "Vehicle details" opens the car
(`app/garage/vehicule/[engine].tsx`); a part that does not fit offers "See
parts that fit my BMW"; the delivery tile reads the shop's own span.

**Sprint 1.** WhatsApp on Aide, on each order and on "to check" parts, with
the car and the part in the message (`components/ui/shop-contact.tsx`) —
shown only once the shop publishes a number. Store pickup at checkout.
Delegations as a list for Grand Tunis and Nabeul (`lib/delegations.ts`),
free text elsewhere, with a gentle warning when the address names another
governorate — no authoritative national list could be fetched, and a list
typed from memory would be invented data. The order page: call / WhatsApp
the shop, cancel while PENDING (`POST /orders/{ref}/cancel`, 409 after), and
an arrival window counted from the real "shipped" time (`lib/arrival.ts`).

**Sprint 2.**
- Search: sound-alike respelling ("plakette" → plaquette) and names ranked
  above descriptions (website); recent searches on the phone; popular
  searches from real traffic (`GET /search/popular`: 3+ distinct sessions in
  30 days, results found, nothing that looks like a phone or an e-mail).
- Family pages: sort by price, "in stock" and brand chips built from the
  page's own facets.
- Home: a due-date strip for the main car (`components/ui/care-due.tsx`).
  (Product rows were added here and later removed — see §22.)
- Product page: specs table, bought together, "Vous économisez X" only when
  the shop set a reference price, photo zoom.
- **Cart**: one suggestion that reaches free delivery — linked by the shop to
  a part in the basket or VERIFIED for the car, on the shelf, never a misfit,
  and only when the gap is at most half the threshold. **Promo codes**: the
  phone keeps the code only (`store/cart.ts promoCode`); the quote says
  whether it applies and for how much, and the order judges it again with
  the code's row locked, so a limit cannot be overrun by two phones at once.
  An unknown code is dropped from the basket at once (so quantity taps are
  not counted as guesses against the shop's 10-misses-per-15-minutes limit).
  The order sends only a code the last quote accepted; if the code stopped
  applying in between, the order is refused with `field: "promoCode"`, the
  basket is re-priced and the customer confirms the new total.

**Sprint 3.**
- **Push notifications** (`services/notifications.ts`, `expo-notifications`
  57). Order moves (confirmed, ready for pickup, shipped, delivered,
  cancelled) and "back in stock" for a part not on the shelf. Registered per
  order with the order's own key (`POST /orders/{ref}/push`), per part with
  `POST /products/{slug}/stock-alert`; the server sends through Expo in the
  phone's language, names the order by what is in it, never promises a date.
  **Push needs an EAS project**: until `eas init` has written
  `extra.eas.projectId`, `pushAvailable` is false and no switch is shown.
  Permission is asked when the customer turns it on, never at launch; a
  customer who said yes once gets it for the next orders without being asked
  again. A tapped notification opens the order, the part or the car
  (`components/notification-router.tsx`).
- **Garage reminders**: mileage, oil interval, inspection and insurance
  dates are the owner's own; "Me rappeler ces dates" schedules local
  notifications a week before and on the day at 9:00 (`reminderMoments` in
  `lib/care.ts`, tested). Local, so no server or EAS project is needed — only
  a phone.
- **Favourites** stay removed, as the owner asked earlier; the useful half
  of "favourites with alerts" — being told when a part is back — is the
  stock alert above, on the product page, without a favourites list.
- **Ratings after delivery** (`components/ui/order-rating.tsx`): stars and an
  optional sentence on a DELIVERED order, for the shop only (Admin → Avis,
  the order page, the staff order screen). Nothing is published; the card
  says so.
- **Crash reports** (`services/crash.ts`): uncaught errors and unhandled
  rejections go to the shop's own analytics as `app_crash` (message, top of
  the stack, fatal or not; five distinct per session), beside the error
  screens' `app_error`. Read them in Admin → Analytics → Erreurs de l'app.
- **Remote updates** (`services/updates.ts`, `expo-updates` 57,
  `runtimeVersion: appVersion`): checks on launch and on return to the app,
  downloads, applies on the next start — never mid-checkout. Off until
  `eas update:configure` adds the update URL.

**What the owner has to do for Sprint 3 to reach phones:** `eas init`
(project id), `eas update:configure`, then an EAS build; push credentials
(FCM for Android, APNs for iOS) are set in EAS. Optional on the website:
`EXPO_ACCESS_TOKEN` (Expo's "enhanced security" for push).

Tests: `e2e/after-delivery.mjs` (rating, staff reads it; refuses a non-local
shop), the promo refusal in `e2e/interactions.mjs`, `reminderMoments` in
`lib/__tests__/care.test.ts`.


## 22. The app icon and the launch screen (September 27, 2026)

**The icon is the owner's picture.** `assets/images/app-icon-art.webp` — the
glass square with the car, the wordmark, the red swoosh and the gold road —
is the second supplied artwork, beside the logo. `scripts/make-icons.mjs`
cuts from it, and from nothing else:

- `icon.png`: the picture inside the glass rim, square and full bleed. iOS
  and the older Android launchers round the corners themselves; a rim drawn
  in would be rounded twice.
- `android-icon-foreground.png` / `-background.png`: the picture at 700 of
  1024, so the strictest launcher mask (a circle over the middle 683) loses
  only its outer edge, on the artwork's own dark `#051022`.
- `android-icon-monochrome.png` (Android 13 themed icons): the wordmark band
  only, white on transparent. The car and the road are shading, which one
  colour turns to mud.
- `favicon.png`.

The crops are measured on the supplied 1254 × 1254 file and written at the
top of the script; a replacement of another size stops the script rather than
cutting an off-centre icon. The notification icon stays the hexagon from the
logo: Android draws it as a one-colour silhouette at 24 dp, where the glass
square would be a white blob.

**The launch screen** (`components/preloader.tsx`) is the shop's name and
nothing else — AUTOMOTIVE and PIÈCES AUTO in white on the shop's navy
(`Brand.navy950`, `#081633`), no tile, no frame (the owner's call, September
28: the glass square was the icon, not the brand). Its only motion is the
logo's own red swoosh drawing itself in under the name, left to right, as a
pen would. It is in two halves:

1. The native splash (`expo-splash-screen` in `app.json`: `splash-icon.png`,
   360 wide, on `#081633`) shows the name without the swoosh from the moment
   the phone starts the app, before any JavaScript.
2. The preloader draws the same picture, at the same size and place, on the
   same colour, and hides the native splash on its first frame — so the
   hand-over cannot be seen — then reveals `splash-swoosh.png` over it
   through a window that opens from the left.

Both pictures are cut by `make-icons.mjs` from the logo file (everything to
the right of the hexagon; the red pixels are the swoosh, the rest the
lettering) onto the same transparent square, the wordmark at 60% of its
width so Android 12's circular splash mask never reaches its ends. The
logo is never mirrored, so the swoosh draws left to right in Arabic too.

It leaves when the fonts are in and the home's first data has been asked for
(families, shop settings, promotions — they land in the API cache, so the
home opens filled, not on skeletons), and never before 1 s (a flash of the
logo reads as a glitch) or after 2.6 s whatever the network does (a launch
screen that waits on a slow connection is a hang with a logo on it). With
reduced motion on the swoosh is simply there; the screen fades.
The clock is light while it is up.

`LaunchBackground` in `constants/theme.ts` is the launch navy and is written
again in `app.json` for the native splash — a config file cannot import a
constant, so change both together.

What to know when checking it:

- **Expo Go shows its own icon and splash.** The native half — the icon on the
  home screen, the splash before JavaScript — exists only in a development or
  store build (`eas build`). In Expo Go, the preloader still runs.
- On the web, a browser driven by a test (`navigator.webdriver`) skips the
  launch screen so the suites can get on with the app. `e2e/launch.mjs`
  turns the flag off and checks it: up on the first frames, on the right
  colour, the name where the native splash leaves it, the swoosh drawing in,
  gone between its minimum and its cap, the home underneath, and the
  reduced-motion version.

**The home shows no products** (September 28, the owner's call). The rows
"Pour votre <car>", "Commander à nouveau" and "Packs entretien" are gone
with `components/ui/home-rows.tsx`; the home is the ways in — search, the
car, the families, maintenance, the shop's campaigns, the makers, advice.
Parts are one tap away in the catalogue, the family pages and the search.
`catalogue/products?packs=1` stays on the website for whoever wants it next.

## 23. Returns, end to end, and the tab bar (September 29, 2026)

**A customer can return a part from the order itself.** Until now the
policy said "contact us". The website's side is its HANDOVER §5.hh; the rules
are the policy page's own sentences (`lib/returns-rules.ts` there), worked
out per order by the shop and sent in the order view as `returnOptions` —
this app never decides a deadline or who pays, it draws what it is sent.

- **On the order** (`components/ui/order-returns.tsx`, on `/suivi/[ref]`):
  "Retours et garantie" appears once the order is delivered, or as soon as a
  request exists. Each request shows where it stands (Demande envoyée →
  Acceptée → Pièce reçue → Terminée), the shop's answer — how to bring the
  part back (with the shop's address when it has published one), its
  message, the exchange or the refund and its amount — and, while the shop
  has not answered, "Annuler la demande". The screen re-reads the order when
  you come back to it, so a request just sent is on it.
- **The request** (`/retour/[ref]`): which part (a stepper up to what is
  still free), what is wrong — five reasons, each with its deadline and, for
  the shop's own errors, "à notre charge" (naming the car when the order
  carried one, which is what makes a misfit the shop's error) — then what
  that reason asks: photos (required for a wrong or damaged part), a note,
  exchange or refund, and the "never fitted, in its packaging" declaration
  for a 14-day return. It will not send without what the reason needs, and
  says so; the shop checks it all again. Afterwards: "Demande envoyée", the
  RET reference, and — only if this phone follows the order — that a
  notification will come. Nothing claims a refund is automatic.
- **"Retours et garantie"** (`/garanties`): the three commitments with the
  shop's own figures from its settings (14-day return and its conditions;
  the shop's errors at its charge, 48 hours with a photo; 12-month warranty
  and what it does not cover), then how to ask. Opened from the product
  page's guarantee tiles (now one tappable row), from Compte, and from every
  order.
- **Staff** (`/gestion/retours`, `/gestion/retours/[id]`): the list with
  filters, the detail with the policy's line for the case, the customer's
  words and photos (fetched with the session, `components/staff/private-photo`,
  never a public link), the order's car and each line's fitment verdict,
  and the answer, one step at a time. The dashboard counts requests waiting.
- Every move reaches the customer by push (the orders channel; tapping opens
  the order) and by e-mail when the order has an address.

Pure helpers in `lib/returns.ts` (tested): whether a return can start, the
step a request is at, which policy sentence applies (left out rather than
printed with an invented figure when the shop's settings are not loaded), and
the error sentence for each refusal.

**The tab bar** (`components/tab-bar.tsx`) is now a rounded bar lifted off
the bottom edge, with a soft shadow, and a navy capsule behind the open
tab's icon that slides to the tab you pick (a short spring; none with
reduced motion). The active tab is still three signals — the capsule, the
white icon and full-weight label, `accessibilityState.selected` — never
colour alone. The basket count is gold with navy figures, ringed in white.
It stays in the layout rather than floating over the screens, so the
basket's checkout bar and every screen's bottom stay where they were. In
Arabic the tabs run right to left and the capsule counts from the right.
`TabBarHeight` is 80: the bar's 64, 4 above, at least 12 below.

Tests: `e2e/returns.mjs` (the card, the request screen, the refusal without
the declaration, sending, withdrawing, the staff screen accepting, the
customer reading the answer, the guarantee page from a product) and
`lib/__tests__/returns.test.ts`.

**September 29, later.** The garage and basket icons (`illustrations/vehicle`
`NavCar`, `illustrations/nav-cart`) were redrawn: nothing filled but the
car's headlamps, because the old ones filled their wheels white and became
two blobs on the navy capsule; the car is larger and plainer (roof,
body, lamps, tyres), the basket lost its faint inner bars. And the make
picker's round logo rail is back above the registration card on every
catalogue: it had only listed makes with parts linked, so on a live
catalogue whose fitment data is still thin it was empty and vanished. It now
ranks by parts, then by models — both real counts — and is never empty.


## 24. Sign-in, failures, the catalogue, the bar (September 30, 2026)

The shop's side of all of this is its HANDOVER §5.ii.

**When the shop does not answer** (`api/client.ts`, `api/retry.ts`, tested).
Reads (`get`, and `send` without a body method) are asked again after a
failure that says nothing about the request: no signal (twice, after about
0.7 s and 2 s), a timeout (once — each attempt may take the full 12 s), a
502/503/504 (after the shop's `Retry-After`, capped at 5 s — the shop now
answers `503 temporarily_unavailable` when its database is waking), a flood
window that reopens within seconds. Never a 4xx: that is the shop's answer.
A gateway's HTML error page is now a server failure (retryable), not
"malformed". `rateLimited` and `server` carry `retryAfter`.

**Orders are safe to send twice.** A POST is still never retried blindly —
unless it carries an `Idempotency-Key`, and the order does
(`newIdempotencyKey`, 24 bytes from expo-crypto's CSPRNG). The payment step
keeps one key per basket-and-details (a new one when anything it sends
changes), so the client's own retry after a dropped connection, and the
customer tapping « Confirmer » again after a timeout, both come back with the
order the first attempt placed — never a second parcel. The timeout and
no-signal sentences now say exactly that ("Réessayez — elle ne sera jamais
passée deux fois"). `expo-crypto` is new (SDK 57's, in Expo Go).

**Sign-in.** The password rule is the shop's: eight characters, not a common
password, not the account's own name or e-mail — the phone checks the length,
the shop the rest, and each refusal's `reason` has its own sentence
(`lib/account` `passwordProblem`). Sign-in and sign-up send the phone's name
(`lib/device-name`: model and system from expo-device, nothing that
identifies the owner) so the account can list its phones.
**Compte → Connexion et sécurité** (`app/compte/securite.tsx`, signed in
only): change the password with the current one (the shop then signs out
every other phone, staff session and website sign-in; this phone stays in,
and the toast says how many were signed out), and the signed-in phones as
the shop knows them — name, last activity, sign-in date, « Cet appareil »,
« Déconnecter » on each other one, « Déconnecter les autres appareils ». A
401 there means this phone was signed out elsewhere, and it is signed out
here too. The staff sign-in sends the name as well.

**The catalogue tab** is laid out around how a customer reaches a part, in
the order that converts: the search box; **the car** — the make's badge, its
name and a gold « Voir les pièces compatibles » when there is one, a dashed
« Ajoutez votre véhicule » when not; **En promotion** — the shop's
marked-down parts as real tiles with their add button, only while there are
any (`productsApi.onSale`, a compare-at price the owner set); **every family**
as a two-column grid of pictures (48.5 % each so two always fit at 320 pt),
best stocked first, part count on the picture, the filter box above it; the
parts makers; and at the foot « Vous ne trouvez pas votre pièce ? » — the
advice card.

**Sorting and the whole list.** A family's (and a parts maker's) « Trier »
chip names the current order and opens a sheet of the shop's five
(`components/ui/sort-sheet`): Pertinence (what fits and what is in stock
first), prix croissant / décroissant, Nouveautés, Les plus commandées — each
with its reason where the name alone does not say. « En promo » appears when
the family holds marked-down parts. And the list is now the whole list: it
used to stop at the first twenty parts because nothing answered the grid's
end; `hooks/use-more-products` fetches the next page as it comes into view
(once, however often the end is reached), drops the extra pages when the
question changes, and never shows a part twice.

**« Besoin d'un conseil ? »** (`components/ui/advice-card`) is drawn like the
reference's quiet cards: a pale surface, a flat navy-and-gold drawing of a
phone framing a brake disc with a question bubble (`illustrations/advice-art`,
replacing the photographed phone in a white disc on navy), the question, one
line, and « Envoyer une photo » as an underlined link with an arrow; the
whole card is the button.

**The tab bar** follows the reference: a white, fully rounded bar (66 tall)
with a pale pill behind the open tab's icon *and* label, sliding between
tabs. The icons are one set drawn for it (`illustrations/tab-icons`): navy
outlines, the open tab's filled with gold under its outline — gold as a line
on white would be 1.8:1, as a fill under navy it reads at any size. Labels
stay navy, bold when open. `TabBarHeight` is 82. `illustrations/nav-cart` is
gone; `NavCar` stays for the rows that show a car.

Tests: `lib/__tests__/retry.test.ts`, the password cases in `rules.test.ts`,
and `e2e/account.mjs` now walks the security screen (another phone listed by
name and signed out, the current password checked, a common new one refused,
the change).

**October 1.** Two changes asked for after seeing it on a phone. The
families are back in the old card: four across (six on a tablet), round
discs with the shop's flat drawings (`PartImage drawn` skips the studio
render, which at 44pt read as a grey smudge; an uploaded family photo still
wins), name and count under each — sixteen families a screen instead of the
picture grid's four. And the tab bar is glass and floats over the screens:
Apple's liquid glass (`expo-glass-effect` `GlassView`) where iOS has it,
otherwise a frosted white (blurred with `backdrop-filter` on the web build,
near-opaque on Android, which has no live blur); the open tab's pill is a
translucent navy tint so it reads on either. Content scrolls on under it, so
every tab screen keeps `tabBarFootprint` clear at its end (`useTabBarSpace`;
Compte and the empty basket now do too) and the basket's checkout bar runs on
under the glass with its button just above it.

**The icon, October 1.** The app icon is the launch screen's own picture:
the AUTOMOTIVE wordmark with its red swoosh and PIÈCES AUTO, on the same
plain navy (#081633) — no car, no road, no glow. `scripts/make-plain-icon.py`
builds `icon.png`, the three Android adaptive layers (wordmark inside the
safe circle) and the favicon from `splash-icon.png` and `splash-swoosh.png`;
the adaptive background colour is the launch navy too.

**The garage, October 1.** The hero is a wallet pass, chosen from three
mock-ups: the shop's navy with a soft diagonal sheen, the make's own mark
large and faded behind the text, its badge and "MON VÉHICULE" across the
top, the name, then MOTORISATION and ANNÉES as labelled fields (years only
when the shop recorded them, kept left-to-right in Arabic) — the gold edge it first had went on October 2;
"Voir les pièces compatibles" is the gold button under it. A car that
is not the principal one offers "Rendre principal" inside the pass, so every
card in the carousel is the same height; the pass's tap area sits behind its
content so that button is never a button inside a button. The three doors
are their own white tiles with gold icon discs; the owner's upkeep reminders
(`CareDueStrip`) appear under them when something is due; "Mes véhicules"
says what is behind it; the advice card closes the page (`AdviceCard
onPale`). A drawn car and a night-time silhouette were both tried here and
dropped. The empty basket became a page to start from: a new drawing
(`EmptyBasketArt`), laid out from the top, with the car's compatible parts
and the four best-stocked families.

**October 2.** The catalogue opens on the families: search, then "Toutes
les familles de pièces", then the shop's markdowns, then the car card
("Pièces pour votre véhicule"), then the makes and the advice card.

The empty basket and the empty order list are the shop artist's own
drawings — a basket with a brake disc and a spark plug flying in, an open
box with the AUTOMOTIVE name on its side. The files as delivered live in
`assets/illustrations/*.svg`; react-native-svg reads neither CSS classes nor
nested `<svg>`s, so `python3 scripts/inline-svg.py` turns each into
`src/illustrations/drawn/<name>.ts` (styles written onto the shapes, nested
viewports as transforms), drawn with `SvgXml`. Edit the .svg and rerun; never
the .ts. `EmptyState scene` stands such a full scene on the page without the
round halo.

Signing in, up or out is a moment over the whole app
(`components/auth-moment.tsx`): the navy washes in, a disc springs up with a
ring opening behind it — gold with a tick and "Bienvenue, Prénom", or white
with the door and "À bientôt" — and the navy lifts onto the screen the app
has moved to underneath, in about a second and a half. It never takes a
tap. The account store's `moment` drives it; `restore` never sets it, so
opening the app signed in is not a sign-in. It replaces the welcome and
signed-out toasts.

Signing out leaves a guest's phone. Every order the account owns leaves
it, token and all: orders placed while signed in (`fromAccount` set at
`remember`), guest orders claimed at sign-in (marked when the account's
list comes back), and those listed from other devices. The checkout's
remembered name, e-mail, phone and address go too. Only a guest order that
was never claimed stays. Signing back in brings the account's orders back.

## 25. Reaching the shop, being told, signing in by SMS (October 3, 2026)

**Why there seemed to be "no way to reach the shop".** WhatsApp, call and
e-mail buttons have been in the app since September (Aide & contact, every
order, a part to check), and collection in store at checkout. Each appears
only once the shop has filled in that detail — the binding rule: no
placeholder number that rings nobody. Production's WhatsApp, phone and
address are still empty, so none showed. The staff dashboard now opens on
"À compléter pour vos clients" (the website's `missing`) with the way to
fill them in (Espace boutique → Paramètres); the moment they are, the
buttons and the pickup option appear by themselves (`e2e/reach.mjs` checks
both sides).

**"Demander à la boutique" (`/demande`)** is the way that never depends on
a number: a question, a photo or both, the car, the part (`?sku=`) or the
order (`?order=`, its own token sent along so the shop sees the real order),
a name and a number to be called back on. It lands in the shop's inbox; the
shop answers in writing or calls back. The old photo request
(`/demande-photo`) is a door to it, photo first. Each question returns a
token kept in the Keychain (`store/questions`), the key to read the answer.
Answers show in **Mes questions** (`/compte/questions`, a row on Compte with
the count of new answers), and on the order's page under "Une question sur
cette commande ?" (`QuestionThread`), which now always offers "Demander à la
boutique" beside WhatsApp/call (when published) and Annuler. Aide & contact
leads with "Poser une question" and "Envoyer une photo de la pièce".

A photo the phone cannot shrink (a HEIC, a cloud photo) is now sent as taken
rather than dropped without a word (`lib/photo`) — the "adding an image does
nothing" report.

**Staff: Messages** (`/gestion/messages`, `[id]`): the inbox, waiting first;
a message with its photos, the order (one tap, when proved), call or WhatsApp
the customer's number, a written answer for app questions (the customer gets
it under their question, with a push when their phone allows), mark handled.

**Being told.** Three layers, each honest about where it works:
- push to a signed-in phone for every order of the account: the session
  keeps the push token (`registerAccountPush`, after sign-in and whenever
  notifications are allowed — never asked for at sign-in);
- push for one order ("Me prévenir", unchanged) and for a question's answer
  ("Me prévenir quand la boutique répond" on `/demande`, asked right there);
- **the order watch** (`components/order-watch`): while the app is open — on
  coming to the foreground and every 90 s — it re-reads the orders still on
  their way and the unanswered questions, and says "CMD-1176 : Confirmée" or
  "La boutique vous a répondu" in a toast with "Voir". It needs nothing from
  the shop, so it works in Expo Go and on the web; where push is live and
  allowed, it stays quiet. It remembers the last status seen and only speaks
  about a change.

Push itself still needs a build tied to an EAS project: run `eas init` once
(it writes `extra.eas.projectId` into app.json) and make a development or
store build; Expo Go on Android cannot receive remote push at all.

**Signing in by SMS** (`components/phone-sign-in`, on `/compte/connexion`):
"Code par SMS" first when the shop can send texts (`settings.auth.phoneCode`),
"E-mail" one tap away. Number → code (the phone offers to fill it from the
SMS; the sixth digit submits) → for a number with no account, a name and an
optional e-mail. Wrong / expired / too many tries each said plainly; resend
after 60 s. The account may have no e-mail and no password: Compte shows its
number; Connexion et sécurité shows "Connexion par SMS" (add or change the
number, by code) and no password card; deleting it takes a code to its
number. Only a number proved by code signs in — never one merely typed.

**Espace boutique** is gone from Paramètres. It appears on Compte only for
an admin (`account.staff`): their password sign-in brings the staff session
with it, so there is no second door; signing out ends both. An admin signed
in by code finds the door asking for the password (e-mail filled in) — an
SMS never opens the back office.

`e2e/reach.mjs` drives all of it from the screens (with `SHOTS=dir` for
pictures); the website's `scripts/e2e-reach.mjs` checks the rules at the API.

## 26. The tab bar: Apple's own on iOS 26, one drawn after it elsewhere (October 4, 2026)

**On iOS 26 and later the system draws the tab bar.** `app/(tabs)/_layout`
renders `NativeTabs` (expo-router/unstable-native-tabs) when
`isLiquidGlassAvailable()` says the phone has liquid glass. That is Apple's
UITabBar: the glass, the selection that swells into a magnifying lens only
while it moves and settles back when it lands, sliding along the bar, all
behaving exactly as in Apple Music because it is the same control. Details:

- The icons are the app's own drawings (illustrations/tab-icons), rendered to
  PNG at 1x/2x/3x by `scripts/make-tab-icons.mjs` from the running web build
  and shown with `renderingMode="original"`, so they keep the navy outline
  and the gold fill on the open tab. SF Symbols were the alternative, but a
  gold symbol on the glass measures 1.8:1, and the set would no longer match
  the rest of the app. Re-run the script after changing a glyph.
- The labels are Barlow, navy, and bold on the open tab.
- The basket's badge is white on the shop's red600. iOS sets badge text in
  white, and white on gold would not read.
- `disableAutomaticContentInsets` is set on every tab, because each tab
  screen keeps the bar's footprint clear itself (`useTabBarSpace`), exactly
  as it does with the drawn bar.

**Elsewhere** (Android, the web, iOS before 26), components/tab-bar draws one
after it:

- **At rest:** a quiet navy-tinted pill inside the frosted capsule. It is no
  bigger than the bar and has no glass.
- **On a tab change:** the pill swells into a white glass lens with an
  iridescent rim, 14% wider and 30% taller, and magnifies each tab it passes
  over. It springs to the new tab and shrinks back into the pill as it lands,
  about half a second in all.
- **Sliding:** a sideways drag swells the lens under the finger and opens the
  tab it is let go over.
- **Reduce Motion** turns all of this into a jump.

**The titles moved off the navigator.** The system bar draws no header, so
Catalogue, Garage, Panier and Compte are now folders: `index.tsx` plus a
`_layout.tsx` that renders `TabScreen` (components/tab-header), which draws
the title (24pt, start-aligned) above a `<Slot />`. The URLs are unchanged.
The drawn bar's navigator runs with `headerShown: false`, so the title is
the same with either bar.

**Search** is not on the bar. For a day it was a round glass button beside
it; the owner asked for the five tabs alone. Search stays in the boxes on
Accueil and Catalogue.

**The language is on Compte.** It is a "Langue" row showing the language in
use, which opens a sheet of the three languages. Paramètres held only the
language and the version number, so it is gone: the version sits at the foot
of Compte, and /compte/parametres redirects to /compte for old links.

## 27. An account to order; a maker's page (October 4, 2026)

**Ordering takes an account.** The owner chose this, as Glovo does.
- **For a guest:** browsing, the cart, the garage and questions to the shop
  still work without one. The cart's button reads "Se connecter pour
  commander" and opens the sign-in with `then=checkout`. Once signed in or
  signed up there, the checkout replaces the sign-in screen, so "back" from
  it is the cart.
- **The checkout steps:** `/commande/livraison` and `/commande/paiement`
  send a guest to the same sign-in, so a link or a back gesture cannot get
  around it.
- **The shop's API** still accepts a guest order, as the website's own
  checkout does. The rule is the app's.

**A phone with nobody signed in holds nobody's details.**
- **Compte:** it says "Invité" and nothing more, with no name or number
  remembered by a checkout. There is no "Mes commandes", no "Adresses", and
  no "Effacer mes coordonnées", because there is nothing to clear.
- **"Mes commandes" by link:** opened directly while signed out, it asks the
  customer to sign in.
- **The order watcher** only watches a signed-in phone's orders.
- **On launch with no session,** `restore` clears what an earlier session or
  an older version's guest checkout left behind: the checkout details, and
  the account's orders and questions. It waits until those stores have read
  their saved state back first, because a reset done before that would be
  undone by it.
- **Older guest orders:** orders placed as a guest before this change keep
  their keys out of sight, and join the account at the next sign-in, which
  claims each one with its own order token.

**The maker's page** (`/marque/[brand]`) shows, from top to bottom:
1. **The mark:** the one uploaded in the admin, else the real mark on
   record, else the name set in type.
2. **The name and how many parts the maker has on sale.**
3. **Its families:** the catalogue's round pictures, each counting only this
   maker's parts. A family opens with the maker already chosen
   (`/famille/[family]?brand=`).
4. **All its parts,** sortable.

The families come from a new shop endpoint, `GET
/api/v1/catalogue/brands/[slug]` (lib/data/catalog `getBrandFamilies`). It
counts active parts grouped by top-level family and returns 404 for a slug
that is not a parts maker with something on sale.

**The artist's key and carte grise (October 5).** Two more of the shop
artist's drawings replace what stood in for them:
- **The car key** (`CarKey`, `cle-vehicule.svg`): a key and its navy fob on
  a ring. It replaces the studio render everywhere it was used: the empty
  garage, "Mes véhicules" with no car, a vehicle card for a make with no
  mark on record, "Je connais ma voiture" and the error page. The render
  (`car-key.webp`) is gone from the app; its Blender script stays in
  tools/renders.
- **The carte grise** (`CarteGrise`, `carte-grise-vin.svg`): a registration
  card with its serial-number line picked out in gold under a "VIN · 17"
  tag. It shows on the VIN screen, and smaller on the picker's "Scanner ma
  carte grise" card, whose tile became a rounded rectangle to fit a drawing
  wider than tall. What is printed on it is the artist's sample, not anyone's
  data.

`scripts/inline-svg.py` now also drops `<metadata>`, which holds the files'
provenance record (C2PA), so it never ships in the bundle.

**The four ways in, drawn (October 5).** "Comment trouver votre pièce ?"
(`/trouver`) is now four tiles, two to a row on a phone and four on a wide
screen, each with one of the artist's drawings (`illustrations/ways-art.tsx`):
the key, a brake disc, a part label under a magnifier, a phone asking the
shop. With a car in the garage the first tile says "Pour votre <car>". The
old rows let a long title widen the card past the screen at 440 pt; a tile's
words now wrap inside it. The disc is cut from the phone drawing, which holds
it as a nested drawing (`assets/illustrations/disque-frein.svg`). The phone
drawing also replaces the phone render on the photo request and "Mes
questions"; `phone.webp` is gone. `inline-svg.py` now keeps clip paths and
their ids, which the phone and the magnifier need.

**Mon garage, white (October 5).** Chosen by the owner from two previews.
The page is white from the header down (no pale second tone). Above the
car: "N véhicule(s)" as a heading, with "Voir tout" opening Mes véhicules.
The car's pass now holds its actions, as in the owner's reference: the gold
"Pièces compatibles" and a round (i) for the car's details. Under it,
"Raccourcis": one pale grouped list with hairlines (Mes commandes, Mes
véhicules, Ajouter un véhicule in gold). Then the care strip and "Besoin
d'un conseil ?", now on the pale surface with the artist's phone drawing;
that drawing replaces `AdviceArt` on the card everywhere it appears.


## 28. The October 5 audit: one verdict, honest money, no waiting

An outside audit scored the app 45/100 for launch readiness, most of it on
things that did not need new screens. What changed, in both repos:

**One fit verdict** (`lib/fit`). Four states — FITS, LIKELY, UNKNOWN,
DOES_NOT_FIT — from the shop's verdict and its reason. LIKELY is a lead: an
inferred (DERIVED) row, or the same engine code confirmed on another model.
It is amber with "Probablement compatible — à confirmer" and never a green
tick; the compatibility list used to tick the customer's engine green on an
inferred row while the card above said "à vérifier". The card, the tile, the
cart badge, the product page and the payment summary all read `fitState`.
Amber words use `C.cautionText` (#8a6100, 5.5:1); the gold stays on icons.

**Pièces compatibles** asks the shop for two lists (`fits=1`, and the new
`likely=1`, lib/data/fitment `likelyFitWhere`): the confirmed parts, then
"À confirmer avec la boutique" with a button to ask. The banner ticks only
when something is confirmed and counts both. Saving a new car opens this
page over the garage.

**Money** is "89,000 DT" everywhere — three decimals, narrow-space
thousands — in `formatDT`, `Price` and the website's `formatTND`.

**Language.** French by default (Arabic on an Arabic phone), chips on the
first welcome step, `<html lang dir>` on the web. Car and engine names are
isolated left-to-right where shown (`ltr`), so Arabic keeps "1.5 dCi".

**Checkout.** Each line on the payment step carries its verdict, and a note
says how many are not confirmed and repeats the shop's own guarantee for an
incompatible part. The address shows the delegation. "Passer la commande"
and "Annuler" lock on the first tap with a ref.

**Waiting.** The API was fast once warm (under 160 ms locally); the seconds
the audit saw on order and cancel were SMTP sends awaited before the reply.
They now go after it (website `lib/defer`, `after()`). Static data is cached
(§4), and a product page starts loading on press-in.

**Smaller.** Zero search results offer "Demander à la boutique" and "Envoyer
une photo" with the query written in. Bought-together co-purchases pass a
family/axle rule (website `lib/complements`). Events carry an id and a
sequence number, and `product_viewed` fires once per opening. "Scanner ma
carte grise" became "Saisir le VIN de ma carte grise".

**Second pass, the same day.** What was left of the audit that needed
neither the owner nor real data:

- *The account wall.* Where the shop can text, a guest's cart goes on to
  the delivery step; "Continuer" sends a code to the number just typed and
  the code signs in that number's account or opens one in the name on the
  form (`PhoneSignIn` with a preset). No detour, no password. Without SMS
  the sign-in-first path stays.
- *"Va sur ma voiture"* on family lists (the shop's `fits=1`).
- *The fitment queue* (website `/admin/compatibilites`): every inferred
  row, car by car, the cars customers drive first, confirm or remove in
  one tap.
- *The event schema* from the audit's measurement plan: every event carries
  locale, engine and signed-in; new ones for filters, zero results,
  fitment summary and questions, the delivery step, the logbook, reminders
  and the notification answer; the website records order_placed,
  order_status_changed, order_delivered and order_cancelled itself
  (`lib/server-events`).
- *Smaller:* the last priced basket shown dimmed instead of "—"; the
  free-delivery suggestion only from families that finish the basket's
  job; WhatsApp on zero results; the shop's guarantee beside a confirmed
  part; dates typed as JJ/MM/AAAA; a shorter welcome step 2; "Annuler la
  commande" as a quiet link away from the help; the website's fitment list
  no longer greens an inferred engine; `npm run perf` in the website checks
  a 300 ms p95 budget (locally every call is under 90 ms).

Not done here, because they need the owner or real data: confirming the
fitment rows themselves (the queue is ready for it), real product photos
and brands, reviews, good/better/best tiers, card payment, delivery dates
promised per governorate (a dispatch cut-off), SMS on every status, a
personal Home and a smaller hero (Home kept as chosen on October 5),
notification preferences, referral and pro mode.

## 29. A shorter Home, a quieter product page (October 8, 2026)

At the owner's request, from screenshots of the app in English:

- **Home's night road is short.** The photograph no longer has a band of
  its own between the slogan and the search: the render is drawn at about
  the column's width, its disc beside the slogan near the far edge
  (`DISC` gives where the disc is in the render), faded into the navy on
  the side of the text and below. On a 390 pt phone the families rail is
  on the first screen. Under 360 pt the slogan drops to 22 pt so its
  second line ends clear of the disc. "Entretien auto" is gone, and the
  doubled padding above the shop's campaign with it.
- **The product page** reads logo, name, reference, price, stock, then
  the verdict. The maker is its logo (`components/ui/brand-logo.tsx`, the
  same order as "Nos marques": the uploaded logo, the mark on record, the
  name). The verdict is one tinted line; its reasons open under it from
  the (i). WhatsApp is a link with the green mark beside "Demander à la
  boutique", not a green button over the price.
- **Never how many.** No customer screen says "3 en stock" any more —
  the product page, cards and tiles say "En stock". The staff screens
  still count.
- **A long family name** ("Steering & suspension arms") wraps to a second,
  smaller line; the picture starts under it.
- **Family pictures uploaded in /admin** are drawn cover into a circle, so
  the owner's own drawings must keep inside it: 600 × 600 px, the part
  within a centred 500 px circle (`docs/imagery.md`, template in
  `docs/templates`).

**The same day, second round.**

- *Make logos from /admin, everywhere.* Only the picker passed the uploaded
  logo to `MakeLogo`; a car in the garage keeps the make's name and slug,
  so a make added in /admin with its logo (Škoda) showed "SK" on Home, in
  the garage and on a part. `MakeLogo` now looks the logo up in the shop's
  list of makes (or of parts makers) whenever its caller passes none.
- *A maker's families on a rail*, Home's exact cells (84 wide, 72 discs),
  edge to edge, still a filter in place.
- *Home's top, calmer.* The search and the car are one white card with a
  rule between them; "Comment trouver votre pièce ?" is a plain line with
  an arrow. Under 360 pt the car row drops the word "Changer" for its
  chevron. The photograph is inset 4 px under its gradient: flush, its
  bright floor showed down the hero as a one-pixel line. The families
  below are as they were.

**The same day, third round** (the owner's answers to the second).

- *Home's top: no photograph, no slogan.* The hero is the shop's navy as
  a gradient (navy950 → navy700), running on under the sheet's rounded
  corners. "La bonne pièce, pour la bonne route." is gone from Home (the
  welcome keeps it). The search is its own white pill again and the car
  its own translucent bar — the make's mark, the car, "Changer" in gold —
  as before the second round. Without a car, or under 360 pt, the bar
  ends in a chevron.
- *Car makes: the app's marks first.* The logos uploaded in /admin were
  not good enough, so for a car make `MakeLogo` draws the mark from
  `illustrations/marques.ts` and only falls back to the upload for a make
  with no mark there (then initials); it looks the upload up only then.
  26 makes were added from Simple Icons (Škoda, Audi, SEAT, Ford, Opel,
  Nissan…) by `tools/marks/add-make-marks.js`. Parts makers keep their
  upload first. The garage pass draws every make large behind the words —
  the mark, or its initials for a make with none.
- *Free delivery says what it saved.* The quote carries
  `deliveryFeeWaived` — the home-delivery fee the threshold waived, worked
  out by the shop (`waivedDeliveryFee` in the website's `lib/shipping`;
  0 for pickup or a charged delivery). The checkout's receipt shows it
  struck through beside a red "GRATUITE". The app never computes it.
- *"Pièces à vérifier" in the checkout* is one bold line ("1 pièce à
  vérifier"); why, the promise and "Demander à la boutique" open from its
  (i).
- *A maker's page keeps its row.* Picking a family reloaded the parts in a
  different tree, so the header — and the families' row in it — was
  rebuilt and scrolled back to the first family. The page is now one
  product list whatever its state (skeleton, empty, failed and "more" are
  its footer), and a picked family's name has a line of its own above
  "Tout afficher" and "Trier".
- *Less to read when asking.* "Demander à la boutique" lost its preface,
  the WhatsApp caption, the phone hint and half its placeholder; the
  divider says "ou". The order page lost the line under its button.

**Fourth round.** The owner preferred the second round's Home: it is back
as it was — the disc photograph, the search and the car in one white card —
with only the slogan's words taken out. Their height is kept as an empty
space, so the disc and the card sit exactly where they were.

## 30. The VIN names the car (October 9, 2026)

"Make the app identify the car from the VIN." Before, the VIN gave the
make and the picker took over. Now the shop reads more, and still invents
nothing (website `lib/vin-reading.ts`, `lib/vin-online.ts`,
`lib/data/vin.ts`; app `app/garage/vin.tsx`):

- **The make** from characters 1–3, now for several plants per make (a
  Peugeot is VF3 or VR3, an Indian-built i10 is MAL) and more makes.
- **The model year** from character 10 — only for the makers that write it
  there on the cars sold here (Volkswagen group, Hyundai, Kia). Peugeot and
  Renault do not, so their year stays unknown rather than misread.
- **The model** from characters 7–8 for the Volkswagen group (WVWZZZ**AU**…
  is a Golf VII; Škoda NJ a Fabia III; Seat 6J an Ibiza IV), from a table of
  the codes sold in Tunisia — an unknown code gives no model. For other
  makers the public NHTSA decoder (free, no key) is asked, with a 3.5 s
  limit; it knows many Kia, Hyundai and Toyota and few European-only cars.
  `VIN_ONLINE_DECODER=off` turns it off.
- Whatever was read is **matched to the shop's own models** ("Golf VII" or
  "Golf 7"; a bare "Ibiza" when its years fit). With one model, its
  engines are listed, narrowed by the year (and the displacement and fuel
  when the decoder gave them) — never to none.

The app shows the car ("Volkswagen Golf VII, année modèle 2015") and its
engines; one tap saves it, through the same `useSaveVehicle` as the
picker's last step. The engine is never chosen for the customer: a European
VIN does not carry it. Several models → "Lequel est le vôtre ?"; the make
alone → the picker on that make, as before; "Ce n'est pas ma voiture" is
always there.

**The garage, the same day.** The shortcuts were three tiles — add a
vehicle, by registration (the VIN screen), my vehicles — and the empty
garage offered the VIN too (taken back the same evening, §31). Passes in the carousel have no shadow (the
scroller cut it into a grey box); on a narrow phone the button and the
kicker keep their words. The Home proposed with it was declined; Home stays
as it is.

## 31. Easier for a customer who does not know their car (October 9, 2026)

The owner's list, after watching customers use the app:

- **The VIN first.** "Choisir ma voiture" opens on a large navy card — "Votre
  carte grise suffit" and a gold "Entrer mon VIN", no paragraph — then "Ou
  choisissez vous-même" and the make step. `PickerScreen` takes a `lead`; with one, the step's head and
  search box scroll with the list so the card does not hold the screen.
- **The engine step helps.** Fuel chips (Tous · Essence · Diesel) when the
  model has more than one fuel, from the engines the shop recorded; "Je ne
  connais pas ma motorisation" says what on the card tells it and offers the
  VIN or a question to the shop (`/demande`, photo first).
- **A saved car lands on the garage**, with the toast — no parts list pushed
  on top of it any more.
- **Home: "Marques automobiles"**, a rail of car makes (most parts, then most
  models, as the picker), each opening the picker at that make
  (`components/ui/make-rail`).
- **A family says which car it is for**: "Pour votre BMW Série 1 (E87)" with
  the maker's mark, under the tagline; without a car, the way to choose one.
- **The product page.** "Voir les véhicules compatibles" opens the list
  inside the verdict (it used to scroll to a position measured inside the
  sections block, which sent the page near the top). The basket is up top: the
  camera, sharing and the basket (its count on a gold badge) in one navy
  capsule, an island that opens to "✓ Ajouté" beside the basket for two
  seconds when a part goes in. The purchase bar keeps its shape — the
  quantity and "Ajouter au panier" ("Ajouter" on the narrowest phones; the
  whole phrase always for a screen reader).
- **Basket**: what is left to spend ("Plus que 129,100 DT pour la livraison
  offerte"), the bar, and under its end the threshold ("Offerte dès 150,000
  DT").
- **An order's page**: the in-app question only ("Demander à la boutique"),
  no WhatsApp or call beside it; no "Commander à nouveau".
- **Garage**: back to the design before the three tiles (Mes véhicules and
  Ajouter un véhicule as two rows), without the "Besoin d'un conseil ?" card
  at the foot.

## 32. A glitch, the help page, "Mes informations" (October 9, 2026)

- **The white VIN card.** Picker → "Entrer mon VIN" → an unknown maker →
  "Toutes les marques" opened a *second* picker over the first. On the web
  every SVG gradient id lives in one document: both cards pointed at
  `url(#vinFirst)`, the first copy's — on a hidden screen — and the visible
  card painted nothing, its white title on white. Two fixes: SVG gradients
  take an id of their own (`hooks/use-svg-id`, used by the VIN card, the
  garage pass, the Home fade and the help band) with the navy as the card's
  background underneath; and "Toutes les marques" from the VIN screen goes
  back to the picker already open (`dismissTo`), not a new one.
- **Aide & contact** is a navy band — "Comment pouvons-nous vous aider ?",
  "Un vendeur vous répond ici", the gold "Poser une question" — then grouped
  rows: in the app (a photo of the part, my questions), the shop's channels
  with the number or address each one dials (only those the shop filled in),
  and its hours and address.
- **Mes informations** (`/compte/profil`), from the name on Compte or its
  own row: the avatar, "Client depuis…", then the name, the e-mail and the
  phone as rows. The name and e-mail change in a sheet (website
  `PATCH /api/v1/account`); a new e-mail asks for the password, or a code for
  an account without one. The phone row goes to "Connexion et sécurité",
  where a number is changed with a code.

## 33. The product page's island in liquid glass (October 9, 2026)

The camera, sharing and the basket at the top right of a product page were
a navy capsule drawn by the app. The owner asked for Apple's liquid glass,
the material of the tab bar.

- **iOS 26 and later** (`SYSTEM_TAB_BAR`, the same test as the tab bar):
  the three are the navigation bar's own buttons, through `Stack.Toolbar
  placement="right"` (expo-router 57, `unstable_headerRightItems` under it).
  UIKit sets them in one shared capsule of glass, with SF Symbols
  (`camera`, `square.and.arrow.up`, `cart`), the bar's own badge in the
  shop's red with white figures (as the system tab bar draws it), and the
  press, light and motion iOS gives every app. After an add the basket is a
  tick (`checkmark`) for two seconds, and VoiceOver says "Ajouté". Listed
  left to right; in Arabic UIKit mirrors the bar itself.
- **Everywhere else** (Android, the web, iOS before 26) the capsule is drawn
  in the drawn tab bar's frost: translucent white with a backdrop blur on
  the web, a hairline of light round the edge, navy icons, the same red
  badge, and under a finger a lens of white glass that swells in and
  settles out. It still opens to "✓ Ajouté" for two seconds after an add.
