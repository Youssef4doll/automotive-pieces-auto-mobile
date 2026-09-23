# Automotive Pièces Auto — the mobile app

This repository is the phone app. It is new and empty; this file is everything
the first session needs to know, written by the session that built the website.

---

## 1. What already exists

A full Next.js 16 + Prisma + PostgreSQL storefront, live at
`automotive-pieces-auto.vercel.app`, repo `Youssef4doll/automotive-pieces-auto`.
It is a real shop in Tunisia selling car parts: real catalogue, real orders,
real customers. It has an admin at `/admin`, a customer account area, a
three-language storefront (French default, English, Arabic with RTL) and an
end-to-end battery of ~36 Playwright suites and ~1,400 checks.

**The app does not replace it and does not fork it.** The website stays the
shop's own front door and the owner's admin. The app is a second front door for
shoppers.

---

## 2. House rules — these came from the owner and are not negotiable

Copied verbatim from the website's brief, and they bind this repo too:

- Do **not** invent fake products, stock, reviews, sales or demand just to make
  the app appear larger.
- Do **not** invent: delivery dates, stock, payment status, compatibility,
  vehicle specifications, tracking numbers, phone numbers, customer
  information. **Only render data that exists.**
- Only display promotions backed by real data.
- Never use fake discounts or fake urgency.
- Only show BEST SELLER when supported by real sales data.
- Do **not** copy another shop's branding, icons, images, source code, layout or
  copyrighted assets.

The practical consequence, learnt the hard way on the website: when a field is
empty, the screen says less — it never fills the gap with a plausible number.
A placeholder that looks like data is worse than a blank.

---

## 3. Decisions already taken (by the owner, this session)

| Question | Answer |
|---|---|
| Stack | **Expo / React Native, TypeScript** — one codebase, iOS + Android, builds via EAS |
| Data | **A JSON API added to the existing website**, same Postgres, same catalogue, same stock, same admin |
| v1 scope | **Shopper app.** Garage, browse/search, compatibility, cart, cash-on-delivery order, order tracking, account. ~~No owner/admin mode.~~ |
| Staff mode | **Changed by the owner (2026-09-23): "create admin in mobile app".** A staff area at `/gestion`, behind the website's admin accounts: orders and their status, stock counts, price and online switch, product photos, family pictures, the shop's details. Everything else (references, fitments, imports, promotions, analytics) stays on the website. ARCHITECTURE.md §13. |
| Repo | This one, private |

Everything else is open.

---

## 4. The brand

Tokens, lifted from the site's `globals.css` — use these exact values:

```
navy-950  #081633     navy-900  #0f2352     navy-800  #16305f
navy-700  #1c3a70     navy-600  #274a87     navy-400  #6b83ad
navy-300  #9aabc8     navy-50   #eff3fa
gold-600  #e0ac00     gold-500  #fbc000     gold-400  #ffd23d
red-600   #c50e26     red-500   #e1112c
background #ffffff    foreground #0f2352
```

Type: **Barlow** (body), **Barlow Semi Condensed** (display / uppercase
labels), **Archivo** (headings, extrabold, tight tracking), **Cairo** for
Arabic — Barlow and Archivo have no Arabic glyphs, so the whole family stack
swaps under RTL.

Two contrast facts the website had to fix and this app inherits:

- `gold-500` on white is **2.09:1** — it fails WCAG AA for text. Gold is a
  button fill with navy text on it, never text on white.
- Touch targets: 48px primary, 44px minimum, 40px for inline secondary
  controls. The website keeps these as tokens; do the same here.

Voice: plain French, no marketing inflation, no exclamation marks. "Cette pièce
ne correspond pas à votre véhicule", not "Attention !!!".

---

## 5. The domain — what a screen has to respect

**Vehicle.** `VehicleMake → VehicleModel → VehicleEngine`. A shopper picks down
to the engine; that triple is their vehicle. The website stores it client-side
(Zustand + localStorage, key `apa-vehicle`) and calls it "mon garage". The app
should hold the same concept and sync it to the account when signed in.

**Fitment.** `ProductFitment` joins a product to an engine, with a
`FitmentConfidence`. Three states on a card, and they are different things:
*fits* (a fitment row matches the chosen engine), *universal* (the product has
no fitment rows at all — unknown, not "fits everything"), and *does not fit*
(rows exist, none match). The website shows "Vérifier avant d'acheter" for the
third and makes the shopper confirm before adding to the cart. Do not silently
allow it, and do not silently block it.

**Availability** is derived, never typed in: `stockQty > 0` → **En stock**;
otherwise `supply = ON_ORDER` → **Disponible sur commande**; `supply =
UNAVAILABLE` → **Indisponible**. The lead time for a sur-commande part comes
from the shop setting `supplier_lead_time`, and when it is empty the screen
says "sur commande" and stops — it does not name a number nobody committed to.

**References.** `PartReference` holds OEM and supplier reference numbers.
Searching by a reference stamped on the old part is the single most valuable
thing a parts app does. The website's search index lives in Postgres and
maintains itself.

**Money.** Prices are in TND (`DT`). TVA 19 % and the *droit de timbre* (a flat
per-invoice stamp duty) are handled in `lib/tax.ts` on the website — both are
settings-driven, and the app must not hard-code either. Payment is **cash on
delivery**. Delivery: 24h Grand Tunis, 48–72h régions — from settings, not from
a constant in the app.

**Orders.** Reference format `CMD-1042`, sequential. Because it is sequential
it is **not a secret**: the website proves order ownership with an httpOnly
cookie of order ids, or a signed-in owner. An app has no cookie jar to lean on
— **the API must define its own ownership proof** (a token issued with the
order, stored in the device keychain, is the obvious shape). Never accept
"email matches" as proof: the email on an order is unverified.

**Languages.** fr (default), en, ar. Arabic is RTL — the app must flip layout,
not just text.

---

## 6. The API to build in the website repo

This is work in the *other* repo, and it should land before or alongside the
screens. Suggested shape, `/api/v1`, JSON, versioned, read-mostly:

```
GET  /api/v1/catalogue/families
GET  /api/v1/catalogue/products?family=&brand=&engine=&q=&page=
GET  /api/v1/products/:slug
GET  /api/v1/search?q=                 (parts, references, brands)
GET  /api/v1/reference/:ref
GET  /api/v1/vehicles/makes|models|engines
GET  /api/v1/settings/public           (delivery, tax, contact — never secrets)
POST /api/v1/orders                    (cash on delivery, returns ref + token)
GET  /api/v1/orders/:ref               (token or session)
POST /api/v1/auth/login | signup | logout
GET  /api/v1/account/orders | garage
```

Rules for it: same Zod validation as the server actions (share
`lib/validation.ts`, don't retype the rules), same rate limits, no field the
storefront would not show, and no endpoint that lets a caller read an order it
cannot prove it owns.

---

## 7. v1 screens

1. **Accueil** — vehicle chip, search, families, real best sellers.
2. **Mon garage** — add/choose vehicle by make → model → engine, or by VIN.
3. **Recherche** — free text, reference, and by-family browse; compatibility
   badge on every result once a vehicle is set.
4. **Fiche produit** — photos or the family drawing, availability, fitment
   verdict, references, add to cart.
5. **Panier** → **Commande** — cash on delivery, name/phone/address, the same
   stricter validation the website uses (a name is not an email address).
6. **Suivi** — order by reference + its token; the status timeline.
7. **Compte** — sign in, my orders, my garage, reorder.

---

## 8. What is honestly missing today

Say this out loud rather than designing around a fiction:

- **Fitment coverage is thin.** Most products have no fitment rows, so "fits
  your car" is unknown for most of the catalogue. An app that leads with
  compatibility will show "à vérifier" a lot. That is the truth until the data
  lands.
- **Almost no product photographs.** The website draws a per-family line
  drawing for anything unphotographed. The app needs the same honest fallback,
  not a stock photo of a different part.
- **Shop identity fields are placeholders** in production — WhatsApp number,
  phone, address, tax id, email. They are the owner's to fill in. Do not invent
  them, and do not ship a screen that prints a fake one.

---

## 9. How to work in this repo

What the website learnt, in four lines:

- **Measure, don't assert.** Build it, run it, screenshot it, and read the
  screenshot before saying it works. Three fixes were reported done on the
  website and were broken; the test battery caught all three.
- **A missing precondition is a FAIL, not a skip.** A test that skips itself
  when it cannot find suitable data measures nothing and reports green.
- **One copy of a rule.** Validation, price formatting, availability logic and
  the dictionaries exist on the website; share or port them deliberately, never
  retype them.
- The website's own conventions live in its `HANDOVER.md` — read it before
  designing the API.
