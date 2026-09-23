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

**Layout, at 320 / 360 / 375 / 390 / 393 / 414 / 430 / 768 / 1024 on the home
screen, and at 320 / 390 / 768 on search, compatible parts, the product page,
the basket, the delivery step, Compte, the VIN screen and the make picker.**
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

**The eight journeys** (`journeys.mjs`). The redesign brief's shoppers —
knows the car not the part; knows it is brake pads; has a reference; does not
know the name; has a saved car; has two cars; wants to buy again; wants to
check an order — each walked end to end. The last two place a real order and
track it, which is why the file refuses to run against anything but a local
shop.

**The order API, from outside.** A name that is an e-mail is refused by
field; a price in the body is ignored; the token opens its order; no token is
401; a forged token, a real token for the order next door and a wrong phone
on recovery are all the same 404.

**Two things this suite got wrong before the app did,** both from the tab
navigator keeping every tab mounted: a text match picked the app's root
<div> and clicked the middle of the screen, and "scroll to the bottom" moved
the hidden home screen instead of the visible one. `lib/drive.mjs` now tries
the innermost match first and scrolls only the scroller that is on top. A
check that passes by acting on the wrong element is the failure mode this
whole folder exists to avoid.

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

## The staff screens (`e2e/staff.mjs`)

Signs in through "Espace boutique" with a wrong password first (the refusal
must not say which half was wrong), then the right one; moves an order it
placed itself to Confirmée and cancels it through the confirmation sheet;
counts a part up one and back; adds a photo through the file chooser and
deletes it; replaces a family's drawing with a picture and restores it;
edits the opening hours, checks the public settings changed, and puts them
back. Layout at 320 / 390 / 768 on each staff screen. Then it signs out and
proves the token is dead on the shop, and attacks the staff API from outside:
no token, a forged token, the website's cookie, a stock write smuggled through
the product edit, a negative price, an unknown setting.

What it verifies against is durable state — the "N en stock" tag, the number
of photos, the "Revenir au dessin" buttons — never the confirmation toast,
which is gone before a two-second wait ends.

