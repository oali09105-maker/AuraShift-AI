# AuraShift AI — Expo Project (by ZeeU Creative Studio)

Daily Affirmations, Mindset Sanctuary & Subconscious Reprogramming.
Tagline: "Your Mind • Your Power • Your Future"

## Setup
```bash
npm install
npx expo prebuild
```

## Local Android APK build (uses credentials.json keystore)
1. Place your real ZeeU production keystore file at the project root, named exactly `zeeu-keystore.jks`.
2. Edit `credentials.json` — replace the two password placeholders with your real values (keystore alias is already set to `zeeu`).
3. Run:
```bash
eas build --profile production-apk-local --platform android --local
```

## Assets
See `assets/README.md` — drop in `icon.png`, `splash.png`, and `banner.png` before building.

## Package / Branding
- Package name: com.zeeucreativestudio.aurashiftai
- Studio: ZeeU Creative Studio
- Official Website: https://zeeu-creative-studio-e-book-vault.ai.studio
- Zero public email policy — all support routed through the official website.

## What's inside App.tsx
- **Home (Daily Oracle)**: 115+ affirmations across 5 categories (Wealth &
  Abundance, Unshakable Confidence, Inner Peace, Laser Focus, Royal Celestial
  Wealth) — 100% free and unlocked by default for all users. Refresh + share
  (with watermark) built in.
- **Meditate**: Zen Breath (4-4-4 animated breathing circle, 2-minute session)
  and Frequency Sounds (432Hz Miracle Tone, Alpha Mind Waves, Deep Rest Delta)
  — all three tones are **synthesized live on-device** as real PCM WAV data
  (see the "AUDIO SYNTHESIS ENGINE" section in App.tsx), not bundled audio
  files.
- **Journal**: offline Gratitude Vault with a consecutive-day streak counter.
- **Settings**: audio toggle, "Visit Studio Website" link, and an in-app
  Privacy Policy modal (GDPR/AdMob-consent-aware, accurate about what AdMob
  itself collects — see the policy text for details).

## AdMob
Real production IDs are wired in and automatically swapped for Google's
official TEST IDs whenever `__DEV__` is true, so you never risk invalid
traffic during development. Every ad call (banner/interstitial/rewarded) is
wrapped in safe fallback handling — a failed or slow-loading ad never
crashes the app or blocks the core experience.

## Important
`react-native-google-mobile-ads` and `expo-av` contain native code — this
project CANNOT run inside the plain "Expo Go" app. Use `npx expo run:android`
or an EAS development build.
