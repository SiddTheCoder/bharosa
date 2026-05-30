# Bharosa Merchant — React Native (Expo) App · Build Plan

> **Handoff doc.** Everything a fresh session needs to build the mobile app without prior context.
> Read this top-to-bottom, then start at **§11 Phase A checklist**.

---

## 0. Context

Monorepo `JunctionXHackathon/`:
- **`server/`** — FastAPI + MongoDB. The trust-scoring brain (Bayesian Beta engine, seasonality, relationships, graph, interview). Already built & tested. **The mobile app uses this same server.**
- **`web/`** — Next.js merchant + lender web app. Reference implementation for API usage, auth, and the `Passport` data shape.
- **`mobile/`** — **this app** (was `app/`, renamed). A fresh Expo app goes at the root of this dir.
- **`mobile/design-reference/`** — the source of truth for the UI:
  - `Merchant App.html` — the full, pixel-faithful mockup (3 tabs + voice modal + tab bar).
  - `app.css` — the design system (tokens, pills, buttons, cards, ring).
  - `op.md` — backend auto-ingestion strategy (payment webhooks + SMS parsing). Informs Phase E only.

**Decisions already made by the user:**
1. New Expo app inside `mobile/`. Reuse web/server freely.
2. **Build the UI first with mock data.** Mark every data point with `// TODO: server API — currently mocked`. Bind APIs in a later phase.
3. Android build with `READ_SMS` is in scope **later** (Phase E, native module). UI first.
4. **Real auth** = Firebase Google, done by **redirecting to the web app in Android Chrome**, which signs in and hands a token back to the app via deep link. (Same Firebase project/key as web.)
5. **Real mic recording** → upload audio to server → server transcribes (Nepali STT) → show transcript in the UI.

---

## 1. Goal & phasing

| Phase | Outcome |
|-------|---------|
| **A. UI (mock)** | Pixel-faithful port of Home / Passport / Grow + Voice modal + tab bar, design tokens, fonts, score rings, bars. All data mocked, `TODO` markers everywhere. |
| **B. API binding** | API client + data hooks; replace mocks with real `/me/passport` etc.; loading/error states. |
| **C. Auth** | Firebase Google via web-redirect deep-link; store idToken; attach as Bearer. |
| **D. Voice** | expo mic recording → base64 → `/me/interview/answer` → render transcript + updated score. |
| **E. SMS ingestion** | Android native module (READ_SMS, custom dev build) parsing bank SMS → backend. + note payment-gateway webhooks (server-side). |

Ship A fully before B. Do not block A on backend.

---

## 2. Tech stack (recommended)

- **Expo (latest SDK) + TypeScript**, **Expo Router** (file-based routing).
- **react-native-svg** — score rings, QR, custom icons.
- **lucide-react-native** — icon set (matches web's `lucide-react`; HTML uses the same Feather-style strokes).
- **Fonts:** `@expo-google-fonts/plus-jakarta-sans` + `@expo-google-fonts/noto-sans-devanagari` via `expo-font`. (Devanagari is required — the UI is bilingual EN/नेपाली.)
- **react-native-reanimated** — ring fill, waveform, sheet slide (ships with Expo).
- **Styling:** plain `StyleSheet` + a `constants/theme.ts` token file (port of `app.css`). *Dependency-light and faithful.* (Alternative: NativeWind to mirror web's Tailwind — only if the team prefers; not required.)
- **Data (Phase B):** TanStack Query (`@tanstack/react-query`) for `/me/passport`.
- **Audio (Phase D):** `expo-audio` (current) — `useAudioRecorder`. (`expo-av` is the older API; prefer `expo-audio`.) Records `.m4a` on Android.
- **Auth (Phase C):** `expo-web-browser` (`openAuthSessionAsync`) + `expo-linking` (deep link) + `expo-secure-store` (token).
- **SMS (Phase E):** custom dev build (NOT Expo Go) + a config plugin / native BroadcastReceiver. Library candidate: a maintained Android SMS-listener; otherwise a small custom Expo module.

---

## 3. Final directory structure (target)

```
mobile/
  app/                          # expo-router routes
    _layout.tsx                 # root stack; load fonts; providers (Query, Auth)
    (tabs)/
      _layout.tsx               # bottom tab bar: Home / Passport / Grow
      index.tsx                 # Home screen
      passport.tsx              # Passport screen
      grow.tsx                  # Grow screen
    voice.tsx                   # Voice-check modal (presentation: 'modal' or full-screen)
  components/
    ui/                         # Pill, Btn, Card, ScoreRing, Meter, SegBar, WeightBar, StatusRow, ListRow, Timeline
    home/   passport/   grow/   voice/
  constants/theme.ts            # tokens ported from app.css (§4)
  lib/
    mockData.ts                 # mock Passport (§6) — Phase A
    api.ts                      # API client — Phase B (mirror web/lib/api.ts)
    passport.ts                 # normalize/tier helpers (mirror web logic, §5)
    auth.tsx                    # Firebase web-redirect auth — Phase C
  assets/fonts/
  design-reference/             # html/css/op.md (already here)
  plan.md                       # this file
  app.json  package.json  tsconfig.json  babel.config.js  ...
```

> **Scaffold gotcha:** `mobile/` is NOT empty (has `design-reference/`, `plan.md`). `create-expo-app .` may refuse a non-empty dir. Options: (a) scaffold into a temp dir then move files in, or (b) `npx create-expo-app@latest bharosa-tmp` then move its contents up and delete the temp folder. Keep `design-reference/` and `plan.md` intact.

---

## 4. Design tokens (port `design-reference/app.css` → `constants/theme.ts`)

```ts
export const color = {
  ink: '#15211C', ink2: '#46554E', muted: '#7E8C84', faint: '#A7B2AB',
  line: '#E7EBE6', hair: '#EFF2EE', bg: '#F1F3EE', card: '#FFFFFF',
  g800: '#094E38', g700: '#0B6E4C', g600: '#0E8A5F' /* primary */, g500: '#16A06D',
  g400: '#3CB98A', g100: '#DCF1E7', g50: '#ECF8F2',
  amber700: '#9A6510', amber600: '#B5780F', amber100: '#FBEAC9', amber50: '#FBF3E1',
  red600: '#C0413A', red100: '#F7D9D6', red50: '#FBEBE9',
  blue600: '#2D6CCB', blue50: '#E9F1FB',
};
export const radius = { sm: 10, md: 16, lg: 22, xl: 28 };
// Shadows: map sh-1/2/3 to RN shadow* / elevation.
export const font = {
  sans: 'PlusJakartaSans',          // weights 400/500/600/700/800
  deva: 'NotoSansDevanagari',       // for .np Devanagari text
};
```
- **Score-ring band color** (from HTML `band()`): `<400 → amber600`, `<700 → g500`, `else → g700`.
- Bilingual text: render Nepali (`text_ne`) in the Devanagari font, English subtitle in sans muted.

---

## 5. Screen-by-screen inventory + data source

> Every field below is **mocked in Phase A**. The "API" column is the Phase-B source.
> Tier logic & score-driver matching: **mirror `web/components/passport/PassportView.tsx`** (`TIERS`, `FACTORS`, `factorState`, `tierOf`).

### Home (`app/(tabs)/index.tsx`)
| UI element | Data | API (Phase B) |
|---|---|---|
| Greeting "Namaste, {name} नमस्ते" + business·city | profile/merchant | profile store / merchant doc |
| Hero **ScoreRing** 712/1000 + band color | `score` | `/me/passport`.score |
| Pills "Growing" / "Low risk" | tier + fraud_risk | `.fraud_risk`, tier from score |
| Confidence meter 74% | `confidence` (0–1) | `.confidence` (note: backend sends 0–100; web divides) |
| Delta "+24 this week" | **no backend field** | mock / TODO: derive from history |
| Borrow card "NPR 120,000" + schedule | loan | `.loan.amount_npr`, `.loan.schedule_note` |
| Next step | `next_steps[0]` | `.next_steps` |
| "What's lifting your score" list | positive `evidence[]` | `.evidence` (impact>0) |
| Recent activity timeline | **no endpoint** | mock / TODO |

### Passport (`app/(tabs)/passport.tsx`)
| UI element | Data | API |
|---|---|---|
| Credit Passport header: name, "Kirana · Bhaktapur · since 2019", score ring, tags (Low risk, 74% confidence) | merchant + score + confidence | `/me/passport` + merchant doc |
| Status rows (vouches / on-time bills / QR sales / interview — each ✓) | `evidence[]` matched to 4 factors | `.evidence` via `FACTORS` match |
| QR code footer | static for demo | (later: a verify URL) |
| "Share with a lender" | RN `Share` API | shares passport link/text |

### Grow (`app/(tabs)/grow.tsx`)
| UI element | Data | API |
|---|---|---|
| Band progress 712 → next 750 "Strong" | score + tier thresholds | tier math (web `TIERS`) |
| "Ways to add points" checklist (done/active/todo + points) | derive from evidence presence + next_steps | mock states Phase A |
| Voice-check card → opens `/voice` | — | navigates to modal |
| Score-weighting bars (Community 30 / Bills 25 / Sales 25 / Behavior 20) | **illustrative weights** | static; TODO confirm vs engine |
| **"Good & slow months" 628 / 712 / 806** | **seasonality** | `/me/passport`.`season` + `.cashflow` (map lean→slow, current→typical, boom→good). This is the seasonality engine output. |

### Voice modal (`app/voice.tsx`) — Phase D
- Question progress dots (n of 5–6), bilingual question + (optional) multiple-choice chips.
- **Questions:** `GET /interview/questions` → `{ questions: Question[] }`, `Question = { id, trait, reverse_coded, text_en, text_ne }`. (6 questions, see `server/app/interview/state_machine.py`.)
- Mic button → record → base64 → `POST /me/interview/answer { question_id, audio_b64, audio_mime }` → returns `{ transcript, score, reliability, passport }`. Show `transcript`; advance question; update score.
- "Type instead" fallback → `POST /me/interview/answer { question_id, text }`.
- Animate waveform (reanimated) while recording.

---

## 6. Mock strategy (Phase A)

- `lib/mockData.ts` exports one `Passport`-shaped object. **Reuse `web/types/passport.ts` as the shape** (copy the type into `mobile/lib/passport.ts`): `score, confidence, interval{p5,p50,p95}, fraud_risk, evidence[], next_steps[], loan{amount_npr,schedule_note}, relationships{...}, why`. Add `season`/`cashflow` for the Grow "slow/typical/good" tiles.
- A `useMockPassport()` hook returns it. Each screen reads from the hook.
- At every call site add: `// TODO: server API — replace useMockPassport() with GET /me/passport`.

---

## 7. Server API reference (Phase B)

**Base URL:** env `EXPO_PUBLIC_API_URL`. Server default `http://localhost:8000`.
- Android **emulator** → `http://10.0.2.2:8000`.
- Physical device → host LAN IP `http://192.168.x.x:8000`.

**Auth header:** `Authorization: Bearer <firebaseIdToken>` (see web/lib/api.ts; same scheme). KYC-gated writes use `require_kyc` server-side.

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| GET | `/me/passport` | Bearer | full passport (score, confidence, p5/p95, recommended_loan, fraud_risk, evidence[], schedule_note, **cashflow[]**, **season{}**, **relationships{}**, loan{}, why, next_steps) |
| POST | `/me/event` | `{kind, amount?, on_time?, counterparty_name?, direction?}` (kinds incl. `qr_revenue`, `supplier_payment`, bills, airtime, vouch) | passport |
| POST | `/me/bill` | multipart: `kind, amount, on_time, receipt(file)` | passport |
| GET | `/me/bills` | Bearer | `{bills:[...]}` |
| GET | `/interview/questions` | Bearer | `{questions: Question[]}` |
| POST | `/me/interview/answer` | `{question_id, text? \| audio_b64, audio_mime}` | `{transcript, score, reliability, passport}` |
| GET | `/merchant/{id}/passport` · `/explain` | — | passport / explanation |
| POST | `/merchant/{id}/vouch` | `{kind}` | passport |

Mirror `web/lib/api.ts` (`apiGet`/`apiPost`/`ApiError`) almost verbatim — swap `process.env.NEXT_PUBLIC_API_URL` → `process.env.EXPO_PUBLIC_API_URL`.

---

## 8. Auth plan (Phase C) — Firebase Google via web redirect

User decision: **don't do native Google sign-in; redirect to the web app in Chrome, sign in there, hand the token back.**

Flow:
1. App: `WebBrowser.openAuthSessionAsync(authUrl, redirectUri)` where `redirectUri = Linking.createURL('auth')` (scheme e.g. `bharosa://auth`).
2. **Web (needs a new route — build later):** `web/app/auth/mobile` — runs Firebase Google sign-in, gets the Firebase **ID token**, then redirects to `redirectUri?token=<idToken>` (and ideally a refresh mechanism).
3. App: parse `token` from the deep link, store in `expo-secure-store`, attach as Bearer on all requests.

Setup needed: app `scheme` in `app.json`; `expo-web-browser`, `expo-linking`, `expo-secure-store`. Reuse the **same Firebase project/web API key** as web.

> ⚠️ **Web edit caveat:** `web/AGENTS.md` says "This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code." When adding the `/auth/mobile` route, read those docs first.
> ⚠️ Firebase ID tokens expire ~1h. For the demo, re-auth on 401; document a refresh-token path as TODO.

---

## 9. Voice plan (Phase D)

- Permission: mic (`app.json` → iOS `NSMicrophoneUsageDescription`, Android `RECORD_AUDIO`).
- Record with `expo-audio` → `.m4a` (Android). Read file → base64 (`expo-file-system`).
- `POST /me/interview/answer { question_id, audio_b64, audio_mime: 'audio/m4a' }`.
- Server STT is ElevenLabs Nepali (`server/app/interview/voice_elevenlabs.py`). **TODO/verify:** confirm it accepts `m4a`; web sends `audio/webm`. If m4a unsupported, transcode or record a supported format.
- Render returned `transcript`; advance; refresh passport from the returned `passport`.

---

## 10. SMS ingestion (Phase E, Android, later) — from `op.md`

- **`op.md` #2 (mobile):** read bank-shortcode transaction SMS → forward payload to backend → regex/NLP extracts amount/date/txn id → feeds the ledger.
  - Requires `READ_SMS`/`RECEIVE_SMS`, a **custom dev build** (Expo Go can't), and a native BroadcastReceiver via a config plugin or custom Expo module.
  - Backend target: reuse `POST /me/event` (kind `qr_revenue`, with parsed amount/counterparty) **or** add a dedicated `POST /webhooks/sms` ingestion endpoint (server work).
  - Per-bank regex; explicit user consent screen; privacy note.
- **`op.md` #1 (server, not mobile):** Khalti/Fonepay/eSewa webhooks → backend updates trust matrix. Separate backend task; note it but it's out of the app's scope.

---

## 11. Phase A checklist (do this first)

- [ ] Scaffold Expo (TS + Expo Router) into `mobile/` (mind the non-empty-dir gotcha, §3).
- [ ] Add deps: `react-native-svg`, `lucide-react-native`, `react-native-reanimated`, google fonts (Jakarta + Noto Devanagari), `expo-font`.
- [ ] `constants/theme.ts` — port tokens (§4). Load fonts in root `_layout.tsx`.
- [ ] `components/ui/`: `ScoreRing` (svg circle + dashoffset, band color), `Pill`, `Btn` (primary/ghost/line/sm), `Card`, `Meter`, `SegBar`, `WeightBar`, `StatusRow`, `ListRow`, `Timeline`.
- [ ] Bottom tab bar `(tabs)/_layout.tsx` — Home / Passport / Grow (icons + active color `g700`).
- [ ] **Home** screen — greeting, hero ring, pills, confidence meter, borrow card, next-step, "what's lifting", timeline.
- [ ] **Passport** screen — green gradient passport card, verified badge, ring, tags, 4 status rows, QR, share button.
- [ ] **Grow** screen — band progress, "ways to add points" checklist, voice card, weighting bars, **"good & slow months"** tiles.
- [ ] **Voice modal** `app/voice.tsx` — UI only: progress dots, bilingual question, chips, animated mic/waveform, type-fallback (wire recording in Phase D).
- [ ] `lib/mockData.ts` + `useMockPassport()`; wire all screens to it with `// TODO: server API` markers.
- [ ] Polish: safe-area insets, scroll, status bar; match spacing/typography to the HTML.

**Then:** Phase B (API), C (auth), D (voice), E (SMS) per §7–§10.

---

## 12. Run / commands / gotchas

- Dev: `cd mobile && npx expo start` → press `a` (Android emulator) or scan with Expo Go (until a custom dev build is needed for Phase C/E).
- Backend for the app: run `server` (`uvicorn`), point `EXPO_PUBLIC_API_URL` at `http://10.0.2.2:8000` (emulator) or LAN IP (device).
- Reference files live in `mobile/design-reference/` — open `Merchant App.html` in a browser to compare pixel-for-pixel while porting.
- Mirror, don't reinvent: tier/score/factor logic already exists in `web/components/passport/PassportView.tsx`; the `Passport` type in `web/types/passport.ts`; the API client in `web/lib/api.ts`.

---

## 13. Status

- [x] `app/` → `mobile/`; reference files in `mobile/design-reference/`.
- [x] This plan written.
- [ ] Phase A not started — **start here next session.**
