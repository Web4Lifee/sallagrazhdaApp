# sallagrazhdaApp – Mirëmbajtja e Oborrit

Expo (SDK 58) app for tracking the yearly yard-maintenance fee (35 € per person) and extra donations. UI is in Albanian.

The data is saved on a server: the **sallagrazhdaBackend** project (Node.js + PostgreSQL, see its README). The app signs in to it and keeps a cached copy for fast, offline reading.

## Run

1. Start the backend (in the `sallagrazhdaBackend` folder): `docker compose up -d`, and create an account once:
   `docker compose exec -it api node dist/cli/create-admin.js admin`
2. Point the app at it and start the app:

```bash
npm install
cp .env.example .env.local
npx expo start
```

`npx expo start --web` runs it in the browser (the local backend already allows `http://localhost:8081`).

**On a phone with Expo Go:** `localhost` means the phone itself, so start the backend with `API_BIND=0.0.0.0 docker compose up -d` and set `EXPO_PUBLIC_API_URL=http://<your computer's IP>:3000` in `.env.local` (or type that address on the login screen under *Ndrysho*). Phone and computer must be on the same Wi-Fi.

**Release builds** only accept an `https://` server. Set `EXPO_PUBLIC_API_URL=https://api.your-domain` in `.env.production` or as an EAS environment variable before `eas build`.

## How it works

- **Ballina (Home)** – collected amount vs. the season goal (default 2.500 €), people paid, unpaid tickets, donations, last 3 payments, and the "Pagesë e re" button. Arrows switch between seasons.
- **Pagesat** – debounced search by name / father's name / surname (accent-insensitive: `celaj` finds `Çelaj`), filters by paid/unpaid, register new people. Tap a person for their card with all tickets sorted by date; tap a ticket for details, mark paid/unpaid, print, delete.
- **Cilësimet (Settings)** – your name, receipt title, goal, yearly fee, season start month + year, payment reasons, printer paper width (58/80 mm).

### Seasons and yearly tickets

Starting a season creates one unpaid yearly ticket for every registered person. A season starts in one of two ways:

- **Automatically** on the 1st of the chosen month (default **1 Tetor 2027**). The server does this on its own, even when nobody opens the app.
- **Manually** with **Cilësimet → Fillo sezonin … tani**, which starts it immediately.

After the first season, the next season's year is filled in automatically (2027/28 → 2028/29). Only its start month can be changed, e.g. one month later, and months that have already begun are disabled. People registered mid-season get the current season's ticket immediately. A deleted yearly ticket is remembered and not recreated.

### Printing

Receipts print through the phone's print system (`expo-print`): AirPrint on iOS, Android print services on Android. For a Bluetooth thermal printer on Android, install the printer's print-service app (e.g. RawBT) and pick it in the print dialog. Use **Cilësimet → Printo një fletëpagesë prove** to test.

### Data and sign-in

- **The server is the source of truth.** Every change (person, payment, ticket, setting, season) is sent to the server first; receipt numbers are handed out by the server, so they never repeat even with several phones.
- **Cached copy:** the app keeps the last downloaded data in AsyncStorage, so it opens instantly and can be read offline. It refreshes on launch, when coming back to the foreground, with pull-to-refresh on Ballina/Pagesat, and with **Cilësimet → Llogaria → Rifresko**. Changes need a connection; offline you get a clear message and nothing is lost.
- **Sign-in:** accounts are created on the server (no sign-up in the app). The login token is stored in the phone's secure storage (`expo-secure-store`: Keychain / Keystore). An expired or revoked session returns to the login screen. **Dil nga llogaria** signs out and removes the cached data from the phone.
- **Upgrading from the offline version:** on the first login, data saved by the old version is offered for upload to an empty server (`POST /v1/import`). If the server already has data, the server's data is used. Either way, a backup of the old data stays on the phone (`babi-app-store-backup-*` in AsyncStorage).

## Code map

- `src/app/` – screens (Expo Router): `(tabs)/index|payments|settings`, `person/[id]`, `person/new`, `ticket/[id]`, `payment/new`
- `src/store/useStore.ts` – cached data (persisted zustand store); every action calls the server
- `src/store/session.ts`, `src/store/first-sync.ts` – sign-in state, first download / upload after login
- `src/lib/api.ts` – server API client and Albanian error messages; `src/lib/credentials.ts` – secure token + server address
- `src/app/login.tsx` – login screen (other screens are protected with `Stack.Protected` in `src/app/_layout.tsx`)
- `src/store/selectors.ts` – stats and derived data
- `src/lib/` – formatting, seasons, search, receipt HTML
- `src/components/` – UI kit, tab bar, rows, forms
