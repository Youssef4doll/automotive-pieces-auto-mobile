# Automotive Pièces Auto — mobile

The phone app for [automotive-pieces-auto.vercel.app](https://automotive-pieces-auto.vercel.app),
a car-parts shop in Tunisia. Expo / React Native, TypeScript, expo-router.

**Read [`BRIEF.md`](./BRIEF.md) first.** It carries the brand tokens, the
domain rules the screens have to respect, the API the website still has to
expose, and — importantly — what data the shop does *not* have yet, so the app
does not invent it.

Then [`ARCHITECTURE.md`](./ARCHITECTURE.md), which says how this repository is
put together, what was decided and why, and what is not built.

## Run it

```bash
npm install
npx expo start          # then scan the QR code with Expo Go
npx expo start --web    # or in a browser
```

**The app reads a website; it has no data of its own.** Start the website
first — see its `HANDOVER.md` for `db:migrate`, `db:seed` and `dev`. The app
finds it on its own in every normal case:

| Running on | Where it looks |
|---|---|
| Browser, iOS simulator | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| A real phone, Expo Go | `http://<the machine running Metro>:3000` |

The last row is the one that used to need configuring. Expo Go tells the app
which address it loaded the bundle from, which is by definition the
developer's machine, so the app derives the website's address from it. Start
the website with **`npm run dev:lan`** in the website repo so it accepts
connections from the LAN rather than loopback only, and that is the whole
setup.

To point a build somewhere else — a staging shop, a website on another port —
set `expo.extra.apiBaseUrl` in `app.json` to **a plain string holding a full
URL**:

```json
"extra": { "apiBaseUrl": "http://192.168.1.20:3000" }
```

When you do not want it, **leave the key out entirely**. `null` is not the
same as absent: Expo resolves it to an empty object and the app used to crash
on it. Anything unusable is now ignored with a console warning naming the key
and the value, and the app starts on the default.

**After editing `app.json`, clear Metro's cache** — `npx expo start --clear`
on its own has not been enough:

```bash
# macOS / Linux
rm -rf /tmp/metro-cache && npx expo start --clear
# Windows PowerShell
Remove-Item -Recurse -Force $env:TEMP\metro-cache; npx expo start --clear
```

## Where things are

```
src/app/          screens — expo-router, file-based, like the website's App Router
src/api/          the one place the app talks to the shop
src/components/   shared UI, and the picker every garage step is built from
src/constants/    theme.ts — the shop's colours, fonts and touch sizes
src/i18n/         fr / en / ar, and the RTL handling
src/illustrations/ the drawings: part families, the car, the logo
src/store/        the customer's cars, on this phone
e2e/              checks that drive the real app in a browser
```

`ARCHITECTURE.md` explains the shape and the reasoning behind each of these.

## Checking a change

```bash
npx tsc --noEmit              # types
npx expo start --web          # leave running in one terminal, with the website on :3000
npm run e2e                   # layout + journeys; or e2e:layout / e2e:journeys alone
npm run e2e:staff             # the shop's own screens (/gestion), signed in as the seed admin
```

`npm run e2e` opens the app in Chromium and measures it: layout at nine
widths on the home screen and at three on every buying screen, the discovery
arc's geometry, Arabic mirroring — then walks the eight shopper journeys from
the redesign brief, including placing and tracking a real order, and attacks
the order API from outside. `e2e/README.md` says why each check is there.

**`e2e:journeys` places real orders.** It refuses to run unless the shop is on
localhost; `E2E_ALLOW_ORDERS=1` overrides that, deliberately.

**`e2e:staff` signs in as staff and changes things** — moves a test order it
placed itself, counts stock, adds and removes a photo, swaps a family picture,
edits a setting — and puts each back. It only ever runs against localhost.
`STAFF_EMAIL` / `STAFF_PASSWORD` default to the website seed's admin.

## The staff area

"Espace boutique", the last row of Mon compte, opens `/gestion`: the shop's
orders, stock, photos, family pictures and details, for the website's admin
accounts only. How it signs in and why it does not use the website's cookie:
ARCHITECTURE.md §13.

## The other repo

The website, the database and the admin live in
`Youssef4doll/automotive-pieces-auto`. The app reads the same catalogue and
the same stock through a JSON API that repo exposes; it never gets its own
copy of the data.

The app's endpoints are listed in `ARCHITECTURE.md` §4: vehicles (and the
make from a VIN), the catalogue, search, a product, the public settings, a
basket quote, orders with a device token, and order recovery. What is left —
sign-in and the account endpoints — is in §12, in the order it should land.
