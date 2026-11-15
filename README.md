# babiApp – Mirëmbajtja e Oborrit

Expo (SDK 58) app for tracking the yearly yard-maintenance fee (35 € per person) and extra donations. UI is in Albanian.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone. `npx expo start --web` runs it in the browser.

## How it works

- **Ballina (Home)** – collected amount vs. the season goal (default 2.500 €), people paid, unpaid tickets, donations, last 3 payments, and the "Pagesë e re" button. Arrows switch between seasons.
- **Pagesat** – debounced search by name / father's name / surname (accent-insensitive: `celaj` finds `Çelaj`), filters by paid/unpaid, register new people. Tap a person for their card with all tickets sorted by date; tap a ticket for details, mark paid/unpaid, print, delete.
- **Cilësimet (Settings)** – your name, receipt title, goal, yearly fee, season start month + year, payment reasons, printer paper width (58/80 mm).

### Seasons and yearly tickets

Starting a season creates one unpaid yearly ticket for every registered person. A season starts in one of two ways:

- **Automatically** on the 1st of the chosen month (default **1 Tetor 2027**). The app checks when it opens and when it comes back to the foreground.
- **Manually** with **Cilësimet → Fillo sezonin … tani**, which starts it immediately.

After the first season, the next season's year is filled in automatically (2027/28 → 2028/29). Only its start month can be changed, e.g. one month later, and months that have already begun are disabled. People registered mid-season get the current season's ticket immediately. A deleted yearly ticket is remembered and not recreated.

### Printing

Receipts print through the phone's print system (`expo-print`): AirPrint on iOS, Android print services on Android. For a Bluetooth thermal printer on Android, install the printer's print-service app (e.g. RawBT) and pick it in the print dialog. Use **Cilësimet → Printo një fletëpagesë prove** to test.

### Data

Everything is stored locally on the device (AsyncStorage). Each phone has its own data.

## Code map

- `src/app/` – screens (Expo Router): `(tabs)/index|payments|settings`, `person/[id]`, `person/new`, `ticket/[id]`, `payment/new`
- `src/store/useStore.ts` – persisted zustand store and yearly ticket generation
- `src/store/selectors.ts` – stats and derived data
- `src/lib/` – formatting, seasons, search, receipt HTML
- `src/components/` – UI kit, tab bar, rows, forms
