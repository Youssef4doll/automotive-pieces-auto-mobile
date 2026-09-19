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

**The app reads a website; it has no data of its own.** In development it
looks for one at `http://localhost:3000` (`10.0.2.2:3000` on the Android
emulator), so start the website first — see its `HANDOVER.md` for
`db:migrate`, `db:seed` and `dev`. Point a build somewhere else through
`expo.extra.apiBaseUrl` in `app.json`; a real handset on Expo Go needs the
developer's LAN address there rather than `localhost`.

## Where things are

```
src/app/          screens — expo-router, file-based, like the website's App Router
src/api/          the one place the app talks to the shop
src/components/   shared UI, and the picker every garage step is built from
src/constants/    theme.ts — the shop's colours, fonts and touch sizes
src/i18n/         fr / en / ar, and the RTL handling
src/store/        the customer's cars, on this phone
```

`ARCHITECTURE.md` explains the shape and the reasoning behind each of these.

## The other repo

The website, the database and the admin live in
`Youssef4doll/automotive-pieces-auto`. The app reads the same catalogue and
the same stock through a JSON API that repo exposes; it never gets its own
copy of the data.

Built so far: `/api/v1/vehicles/{makes,models,engines}` behind the garage,
`/api/v1/catalogue/{families,products}` behind the catalogue, and
`/api/v1/promotions` behind the banner space. The rest of the
endpoints in `BRIEF.md` §6 — search, a single product, orders, the account —
are not written yet, and `ARCHITECTURE.md` §12 says in which order they have
to land.
