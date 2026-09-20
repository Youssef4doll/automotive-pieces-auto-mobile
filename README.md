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
npx expo start --web          # leave running in one terminal
npm run e2e                   # in another
```

`npm run e2e` opens the app in Chromium, puts a car in the garage through the
real picker, and measures the result: layout at seven viewport widths, the
home screen's discovery arc, and Arabic mirroring. `e2e/README.md` says why
each check is there — every one of them is something that shipped broken
once and was invisible to a clean typecheck.

## The other repo

The website, the database and the admin live in
`Youssef4doll/automotive-pieces-auto`. The app reads the same catalogue and
the same stock through a JSON API that repo exposes; it never gets its own
copy of the data.

Built so far: `/api/v1/vehicles/{makes,models,engines}` behind the garage,
`/api/v1/catalogue/{families,products}` behind the catalogue and behind
`Pièces compatibles` (which uses its `fits=1` filter), and
`/api/v1/promotions` behind the banner space. The rest of the
endpoints in `BRIEF.md` §6 — search, a single product, orders, the account —
are not written yet, and `ARCHITECTURE.md` §12 says in which order they have
to land.
