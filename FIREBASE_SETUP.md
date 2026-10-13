# Cloud sync setup (Firebase)

HabitQuest works without any of this: with no Firebase config, data stays in the browser
and the Settings page says cloud sync isn't set up. Follow these steps once to enable
sync across your phone and computer. The Firebase **Spark (free)** plan is enough; no
credit card is needed. Check Firebase's pricing page for the current quotas.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Name it (e.g. `habit-quest`). Google Analytics is not needed; you can turn it off.

## 2. Turn on email/password login

1. **Build -> Authentication -> Get started**.
2. **Sign-in method -> Email/Password -> Enable -> Save**.

## 3. Create the database

1. **Build -> Firestore Database -> Create database**.
2. Choose a location close to you and start in **production mode**.
3. Open the **Rules** tab, replace everything with the contents of
   [`firestore.rules`](firestore.rules), and click **Publish**.
   These rules let each user read and write only their own document.

## 4. Get the web app config

1. **Project settings (gear icon) -> General -> Your apps -> Web (`</>`)**.
2. Register an app (hosting setup not needed). Copy these four values from `firebaseConfig`:

| Firebase field | Environment variable |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

These values are not secrets. They identify your project; the Firestore rules in step 3
are what protect the data.

## 5. Allow your website's domain

**Authentication -> Settings -> Authorized domains -> Add domain**, and add your Render
domain (e.g. `habit-quest.onrender.com`). `localhost` is already allowed.

## 6. Provide the values to the build

Vite reads `VITE_*` variables **at build time**, so they must exist when the site is built.

- **Local development:** create a `.env.local` file (it is git-ignored) with the four
  variables above, then run `npm run dev`.
- **Render (Static Site):** **Environment -> Add Environment Variable** for each of the four
  variables, then redeploy. Changing them later needs a new build.

## 7. Use it

Open **Settings -> Cloud Sync** on each device, then **Create account** (first time) or
**Sign in**. Whatever is already on a device is merged into the account, so nothing is lost
when you sign in on a second device.

## How it behaves

- **Local-first.** The app keeps working offline. Changes upload when you are back online.
- **Merging.** Habits and completions from all devices are combined. If the same day was
  changed on two devices, the most recent action wins. Archived habits stay archived.
  Streak shields never go back up once spent.
- **Reset and Import** replace the data on all your devices. This is deliberate, so a reset
  isn't undone by a device that still holds old data.
- **Sign out** uploads your latest changes, then clears this device. Your data stays in the
  cloud and returns when you sign in again.
- **XP caveat.** Bonus XP (perfect day, streak milestones) is stored only as a running total.
  If two devices earn different bonuses while both are offline, the combined XP can come out
  slightly lower than expected. It is never double counted.
- **Size limit.** All data is one Firestore document (1 MiB maximum), roughly several thousand
  completions. This is far beyond normal use, but a very long history could reach it.

## Android app

The Capacitor build bundles the same web code. Add the four variables before running
`npm run build`, then `npx cap sync`. Sign-in works in the Android webview, but add
`localhost` and `capacitor://localhost` to Authorized domains if sign-in is rejected there.
This path has not been tested.
