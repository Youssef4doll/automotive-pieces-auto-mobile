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


## The interactions (`e2e/interactions.mjs`) and the sweep (`e2e/sweep.mjs`)

`npm run e2e:interactions` drives what the redesign added: the product
page's pinned bar confirming an add without a toast over the part, the
basket re-priced by the shop when a quantity changes, an incompatible part
explaining itself and asking before it is added
and their empty state, search ranking what fits first and the "only what
fits" switch, compatible-first family pages and quick add, the catalogue
filter, the four ways in, the guided picker ("Étape n sur 3", the saved-car
confirmation), the garage carousel and "Rendre principal", removing a car
through its sheet, the VIN counter / disabled button / success state, and
emptying the basket. It never places an order.

`npm run e2e:sweep` loads all 28 shopper screens at 320, 360, 375, 390, 393,
414 and 430, in French and in Arabic, with a car in the garage and a part
in the basket, and fails on sideways scroll, clipped text, anything past the
edge, a control under 44pt, or a console error. `WIDTHS=` and `LOCALES=`
narrow it.


## Accounts (`e2e/account.mjs`) and the first launch (`e2e/welcome.mjs`)

`npm run e2e:account` places a guest order, creates an account on the same
phone (checking the form's own errors first), proves through the API that the
order joined the account by its token, refuses the same address twice, signs
out (the phone keeps the order it placed), then signs in on a second phone —
a wrong password is one sentence — lists and opens the order through the
account, and deletes the account: wrong password refused, then gone, then
the order still recoverable by reference and phone. Local shop only; it
spends one signup from the shop's hourly budget of twenty.

`npm run e2e:welcome` opens the app as a phone that has never run it
(`open({ firstLaunch: true })` — every other suite starts past the welcome):
the three steps in order, guest before sign-in, "Plus tard" and "Passer"
landing home, never again after, the car step opening the picker with the
back arrow labelled "Retour", and a link on a first launch opening what it
points at.

## The launch screen (`e2e/launch.mjs`)

`npm run e2e:launch` opens the app as a person would — every other suite
skips the launch screen, because Playwright sets `navigator.webdriver` — and
checks that it is up on the first frames, on the shop's navy `#081633`,
covers the screen, has the name 360 wide and centred where the native
splash leaves it, is announced as a progress indicator, draws the red
swoosh in (sampled until it completes, only ever growing), stays at least
its 1 s minimum and goes within its cap (both timed inside the page), and
that the home is underneath. Then again with reduced motion: the swoosh is
whole from the start, and it still leaves. Screenshots go to `SHOTS` (default
`/tmp/apa-launch-*.png`).

## Returns (`e2e/returns.mjs`)

`npm run e2e:returns` places an order on the local shop, delivers it with the
staff API and walks a return through the app: no return before delivery;
"Retours et garantie" on the delivered order; the request screen with each
reason's deadline and "à notre charge" for the shop's own errors; the 14-day
conditions; the refusal to send without the "never fitted" declaration; the
request sent and named; shown on the order and withdrawn; a second one
accepted from the staff screens (`/gestion/retours/[id]`, with the policy's
line); the customer reading the acceptance and the shop's message; and the
guarantee page opened from a product's tiles, with the shop's own figures.
Screenshots go to `SHOTS` (default `/tmp/apa-returns-*.png`). Local shop only.

## After delivery (`e2e/after-delivery.mjs`)

Places an order over the API as the app would, moves it to DELIVERED with the
staff API, then checks the tracking screen asks for a rating (and says it is
not published), that the push switch is absent where push cannot work (the
web), that the rating is sent, and that the staff side reads it on the
order. It writes an order and moves it, so it refuses anything but a local
shop. Push itself cannot be driven from a browser: it is covered by the
website's `lib/push-copy` tests and, on a phone, by hand.
