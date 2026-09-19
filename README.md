# Automotive Pièces Auto — mobile

The phone app for [automotive-pieces-auto.vercel.app](https://automotive-pieces-auto.vercel.app),
a car-parts shop in Tunisia. Expo / React Native, TypeScript, expo-router.

**Read [`BRIEF.md`](./BRIEF.md) first.** It carries the brand tokens, the
domain rules the screens have to respect, the API the website still has to
expose, and — importantly — what data the shop does *not* have yet, so the app
does not invent it.

## Run it

```bash
npm install
npx expo start          # then scan the QR code with Expo Go
npx expo start --web    # or in a browser
```

Nothing has been installed in this repo yet: it was scaffolded and committed
without `node_modules`, so `npm install` is the first command.

## Where things are

```
src/app/          screens — expo-router, file-based, like the website's App Router
src/components/   shared UI
src/constants/    theme.ts — the shop's colours, fonts and touch sizes
```

## The other repo

The website, the database and the admin live in
`Youssef4doll/automotive-pieces-auto`. The app reads the same catalogue and
the same stock through a JSON API that repo exposes; it never gets its own
copy of the data.
