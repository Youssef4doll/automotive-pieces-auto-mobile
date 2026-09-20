# Driving the app

`npm run e2e` opens the real app in Chromium, puts a car in the garage
through the picker a customer uses, and measures what came out.

```bash
npx expo start --web          # in one terminal, leave it running
npm run e2e                   # in another
```

Two environment variables, both optional: `APP_URL` (default
`http://localhost:8081`) and `CHROMIUM_PATH`, which Playwright needs when the
browser is not in its own cache.

## What it checks, and why each one is here

Every check below exists because the opposite shipped at least once. None of
them would have been caught by `tsc`, and all of them were obvious the moment
somebody looked at a screenshot.

**Layout, at 320 / 360 / 375 / 390 / 414 / 430 / 768.**
Sideways page scroll, text clipped inside its own box, anything past the right
edge that is not inside a horizontal scroller, and every button smaller than
the 44pt floor. The tab bar's height was wrong three times — labels sheared,
then absent while the bar still looked deliberate, then sheared again when the
glyphs grew. A chip row was squeezed to nothing by a sibling claiming `flex`.

**The discovery arc.** That the active card is upright and full strength while
its neighbours drop and dim, that a slide is narrower than the viewport so the
next card peeks, that the row snaps, and that the dome travels when the arc is
scrolled. A flat row and a working arc are the same DOM; only the computed
transforms tell them apart.

**Arabic.** That the arc reverses so card 01 sits where an Arabic reader
starts, and that the logo is not still pinned to the left of a right-aligned
screen. `flexDirection: row-reverse` mirrors a row; it does nothing for a
child of a column that is narrower than its parent, and three of those shipped
wrong in one afternoon.

## What it does not check

Web is not a shipping target — the app is iOS and Android — so this proves
layout, text fitting, target size and direction, not platform behaviour.
Where the two genuinely differ, it is stated at the point it matters:
`snapToInterval` is a real ScrollView prop on the phones and a no-op on
react-native-web, so `DiscoveryArc` also sets CSS scroll-snap and the check
asserts the half it can see.

A missing precondition is a failure, not a skip. A check that cannot find the
arc says so and the run goes red; one that passed quietly because it measured
nothing would be worse than having no check at all.
