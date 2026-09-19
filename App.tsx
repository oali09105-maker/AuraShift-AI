/**
 * AuraShift AI — Daily Affirmations, Mindset Sanctuary & Subconscious Reprogramming
 * PRODUCTION build — single-file React Native / Expo (TypeScript) implementation.
 * Studio: ZeeU Creative Studio
 * Package: com.zeeucreativestudio.aurashiftai
 * Official Website: https://zeeu-creative-studio-e-book-vault.ai.studio
 * Tagline: "Your Mind • Your Power • Your Future"
 *
 * ─────────────────────────────────────────────────────────────────
 * ⚠️ REQUIRES A CUSTOM DEV CLIENT / EAS BUILD.
 * react-native-google-mobile-ads and expo-av contain native code and
 * CANNOT run inside the plain "Expo Go" app. Use:
 *   npx expo prebuild
 *   npx expo run:android, OR
 *   eas build --profile development --platform android
 * ─────────────────────────────────────────────────────────────────
 *
 * REQUIRED DEPENDENCIES (see package.json):
 *   @react-native-async-storage/async-storage
 *   react-native-google-mobile-ads
 *   lucide-react-native + react-native-svg (lucide's peer dependency)
 *   expo-av            — plays the on-device synthesized frequency tones
 *   expo-file-system    — writes the synthesized WAV data to a temp file
 * ─────────────────────────────────────────────────────────────────
 *
 * ON-DEVICE AUDIO SYNTHESIS — NOT bundled audio files:
 * The three "Frequency Sounds" are generated as real PCM sine-wave /
 * binaural-beat WAV data entirely in JavaScript at runtime (see the
 * "AUDIO SYNTHESIS ENGINE" section below), base64-encoded, written to
 * a cache file, and looped via expo-av. Nothing is downloaded and no
 * audio asset ships in the app bundle — this is genuine, if simple,
 * offline sound synthesis, not a pre-recorded loop.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  Animated,
  Easing,
  StatusBar,
  Platform,
  Modal,
  Linking,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
  AdsConsent,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import {
  Sparkles,
  Wind,
  Music2,
  BookHeart,
  Settings as SettingsIcon,
  Share2,
  RefreshCw,
  Lock,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  Flame,
  Crown,
  Volume2,
  VolumeX,
  X,
  Check,
  ChevronRight,
  Gem,
  Brain,
  Focus,
  HeartHandshake,
} from 'lucide-react-native';

// ═════════════════════════════════════════════════════════════════
// OFFICIAL APP / STUDIO CONFIGURATION
// ═════════════════════════════════════════════════════════════════
const APP_CONFIG = {
  appName: 'AuraShift AI',
  studioName: 'ZeeU Creative Studio',
  packageName: 'com.zeeucreativestudio.aurashiftai',
  versionName: '1.0.0',
  versionCode: 1,
  officialWebsite: 'https://zeeu-creative-studio-e-book-vault.ai.studio',
  tagline: 'Your Mind • Your Power • Your Future',
  watermark: 'ZeeU Creative Studio • AuraShift AI',
};

// ═════════════════════════════════════════════════════════════════
// ADMOB — REAL PRODUCTION IDS
// ═════════════════════════════════════════════════════════════════
// Real production ad unit IDs are ONLY used in a release build
// (__DEV__ === false). During development, Google's official TEST
// IDs are used automatically — this is mandatory AdMob policy
// hygiene, not optional polish.
const IS_DEV = __DEV__;

const ADMOB_APP_ID = 'ca-app-pub-5206710449803910~7844438176';

const AD_UNIT_IDS = {
  banner: IS_DEV ? TestIds.BANNER : 'ca-app-pub-5206710449803910/3634117463',
  interstitial: IS_DEV ? TestIds.INTERSTITIAL : 'ca-app-pub-5206710449803910/8068186494',
  rewarded: IS_DEV ? TestIds.REWARDED : 'ca-app-pub-5206710449803910/7956118818',
};

// Show an interstitial after every 3rd affirmation drawn.
const INTERSTITIAL_DRAW_INTERVAL = 3;

// ═════════════════════════════════════════════════════════════════
// THEME — Astral Indigo · Cosmic Violet · Celestial Gold
// ═════════════════════════════════════════════════════════════════
const COLORS = {
  bg: '#0B0F19',
  surface: '#1E1035',
  surfaceAlt: '#281647',
  border: '#3A245C',
  gold: '#F59E0B',
  goldSoft: '#FBBF6B',
  violet: '#8B5CF6',
  textPrimary: '#F4F2FA',
  textSecondary: '#B7ACD4',
  textMuted: '#7C6FA0',
  danger: '#F87171',
  success: '#34D399',
};

// ═════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════
type CategoryId = 'wealth' | 'confidence' | 'peace' | 'focus' | 'wealthRoyal';

interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  locked?: boolean;
}

interface JournalEntry {
  id: string;
  text: string;
  date: string; // ISO string
}

type SoundKey = '432hz' | 'alpha' | 'delta';

interface SoundPreset {
  key: SoundKey;
  label: string;
  description: string;
  leftFreq: number;
  rightFreq: number;
}

type TabId = 'home' | 'meditate' | 'journal' | 'settings';
type MeditateSubTab = 'breathe' | 'frequencies';

// ═════════════════════════════════════════════════════════════════
// CATEGORIES
// ═════════════════════════════════════════════════════════════════
const CATEGORIES: CategoryDef[] = [
  { id: 'wealth', label: 'Wealth & Abundance', icon: Gem, color: COLORS.gold },
  { id: 'confidence', label: 'Unshakable Confidence', icon: Sparkles, color: COLORS.violet },
  { id: 'peace', label: 'Inner Peace', icon: HeartHandshake, color: COLORS.success },
  { id: 'focus', label: 'Laser Focus', icon: Focus, color: '#60A5FA' },
];

const ROYAL_CATEGORY: CategoryDef = {
  id: 'wealthRoyal',
  label: 'Royal Celestial Wealth',
  icon: Crown,
  color: COLORS.gold,
  locked: true,
};

// ═════════════════════════════════════════════════════════════════
// AFFIRMATIONS — 100+ across 4 free categories + a locked Royal pack
// ═════════════════════════════════════════════════════════════════
const AFFIRMATIONS: Record<CategoryId, string[]> = {
  wealth: [
    'I am a magnet for wealth, opportunity, and abundance.',
    'Money flows to me easily, consistently, and generously.',
    'I am worthy of financial freedom and prosperity.',
    'Every day, my income grows in new and unexpected ways.',
    'I release all fear around money and welcome abundance.',
    'I make wise decisions that multiply my wealth.',
    'Opportunities to prosper surround me everywhere I look.',
    'I am grateful for the abundance already present in my life.',
    'My mindset of abundance attracts abundant results.',
    'I deserve to live a life of financial ease and comfort.',
    'Wealth flows to me from expected and unexpected sources.',
    'I am building a life of lasting financial security.',
    'I trust myself to create the prosperity I desire.',
    'Every challenge I face is building my financial wisdom.',
    'I am aligned with the energy of limitless abundance.',
    'My bank account grows because my confidence grows.',
    'I welcome wealth with an open, grateful heart.',
    'I am becoming wealthier in mind, body, and spirit.',
    'Success and prosperity are my natural state of being.',
    'I release scarcity thinking and embrace true abundance.',
    'My actions today are building the wealth of tomorrow.',
    'I am worthy of every good thing that comes my way.',
    'Financial abundance flows through me effortlessly.',
    'I am a powerful creator of my own prosperity.',
    'Every dollar I spend returns to me multiplied.',
  ],
  confidence: [
    'I am confident, capable, and completely in control.',
    'I believe in myself and my ability to succeed.',
    'I speak with clarity, strength, and self-assurance.',
    'I trust my instincts and act with quiet confidence.',
    'I am proud of who I am and who I am becoming.',
    'My confidence grows stronger with every step I take.',
    'I stand tall and carry myself with unshakable poise.',
    'I release self-doubt and embrace my full potential.',
    'I am worthy of respect, success, and happiness.',
    'I handle challenges with calm, grounded confidence.',
    'I trust my own judgment and decisions completely.',
    'I radiate confidence in every room I walk into.',
    'My voice matters, and I use it with courage.',
    'I am not defined by my mistakes — I am defined by my growth.',
    'I choose courage over comfort, every single day.',
    'I am enough, exactly as I am, right now.',
    'I face uncertainty with unwavering self-belief.',
    'My self-worth is not up for negotiation.',
    'I am resilient, capable, and unstoppable.',
    'I trust the process of becoming my best self.',
    'I own my achievements without guilt or hesitation.',
    'I walk through life with quiet, powerful confidence.',
    'I am capable of far more than I once believed.',
    'I celebrate my wins, big and small, without apology.',
    'I am becoming the most confident version of myself.',
  ],
  peace: [
    'I am calm, centered, and completely at peace.',
    'I release what I cannot control and trust the process.',
    'My mind is quiet, and my heart is at ease.',
    'I breathe in peace and breathe out tension.',
    'I choose serenity over stress in this moment.',
    'I am safe, grounded, and deeply at peace within.',
    'I let go of yesterday and welcome today with calm.',
    'Peace begins with me, and I carry it wherever I go.',
    'I forgive myself and others, and I feel lighter for it.',
    'My inner world is calm, no matter what surrounds me.',
    'I am exactly where I need to be right now.',
    'I release anxious thoughts and return to stillness.',
    'I trust that everything is unfolding as it should.',
    'I am gentle with myself as I move through this day.',
    'My breath is my anchor to peace and presence.',
    'I choose ease over struggle whenever I can.',
    'I am at home in my own mind and body.',
    'I allow myself to rest without guilt.',
    'Stillness is always available to me, right here, right now.',
    'I release tension from my body with every exhale.',
    'I am grounded like a mountain, calm like still water.',
    'My peace does not depend on outside circumstances.',
    'I welcome quiet moments as gifts to myself.',
    'I am gentle, patient, and kind with my own heart.',
    'I trust myself to navigate life with calm clarity.',
  ],
  focus: [
    'My mind is sharp, clear, and completely focused.',
    'I direct my attention with purpose and precision.',
    'Distractions fade as my focus grows stronger.',
    'I complete what I start with clarity and discipline.',
    'My concentration deepens with every breath I take.',
    'I am fully present in whatever I am doing right now.',
    'I choose depth over distraction in my work.',
    'My mind is a clear, still lake — nothing disturbs it.',
    'I finish tasks with focus, ease, and confidence.',
    'I protect my attention like the valuable resource it is.',
    'One task at a time, I move forward with clarity.',
    'My focus is a muscle, and I strengthen it daily.',
    'I am disciplined, driven, and deeply focused.',
    'Clarity of mind brings clarity of action.',
    'I eliminate noise and tune into what truly matters.',
    'My productivity flows from my inner stillness.',
    'I am capable of deep, sustained concentration.',
    'Every distraction I release brings me closer to my goals.',
    'I am the architect of my own attention.',
    'My mind follows where I choose to place it.',
    'I work with intention, not with scattered energy.',
    'I am building an unshakable habit of deep focus.',
    'My thoughts are organized, purposeful, and clear.',
    'I trust my ability to concentrate when it matters most.',
    'I am present, focused, and fully engaged right now.',
  ],
  wealthRoyal: [
    'I am royalty in mindset — abundance is my birthright.',
    'I command wealth with the quiet authority of a sovereign mind.',
    'Celestial abundance flows through me without limit.',
    'I am aligned with the highest frequency of prosperity.',
    'My wealth consciousness has no ceiling and no limit.',
    'I attract opportunities reserved for those who think in abundance.',
    'I am the architect of a legacy of lasting prosperity.',
    'Money bows to the clarity and confidence of my intentions.',
    'I move through the world as one already wealthy in spirit.',
    'My prosperity ripples outward, blessing all it touches.',
    'I am worthy of extraordinary, limitless abundance.',
    'Every cell in my body vibrates with the frequency of wealth.',
    'I claim my place among those who create true abundance.',
    'My mind is a royal treasury of confidence and prosperity.',
    'I am the embodiment of celestial wealth and grace.',
  ],
};

function getCategory(id: CategoryId): CategoryDef {
  if (id === 'wealthRoyal') return ROYAL_CATEGORY;
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

// ═════════════════════════════════════════════════════════════════
// FREQUENCY SOUND PRESETS
// ═════════════════════════════════════════════════════════════════
const SOUND_PRESETS: SoundPreset[] = [
  {
    key: '432hz',
    label: '432Hz Miracle Tone',
    description: 'A pure, calming sine tone tuned to 432Hz.',
    leftFreq: 432,
    rightFreq: 432,
  },
  {
    key: 'alpha',
    label: 'Alpha Mind Waves',
    description: 'A gentle ~10Hz binaural beat for relaxed alertness.',
    leftFreq: 200,
    rightFreq: 210,
  },
  {
    key: 'delta',
    label: 'Deep Rest Delta',
    description: 'A soothing ~2Hz binaural beat for deep rest.',
    leftFreq: 100,
    rightFreq: 102,
  },
];

// ═════════════════════════════════════════════════════════════════
// STORAGE (100% OFFLINE — AsyncStorage)
// ═════════════════════════════════════════════════════════════════
const STORAGE_KEYS = {
  journal: 'aurashift_journal_v1',
  streak: 'aurashift_streak_v1',
  lastEntryDate: 'aurashift_last_entry_date_v1',
  royalUnlocked: 'aurashift_royal_unlocked_v1',
  audioEnabled: 'aurashift_audio_enabled_v1',
};

async function loadJournal(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.journal);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveJournal(entries: JournalEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(entries));
  } catch {
    // ignore — in-memory state still works this session
  }
}

async function loadStreak(): Promise<{ streak: number; lastDate: string | null }> {
  try {
    const [streakRaw, dateRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.streak),
      AsyncStorage.getItem(STORAGE_KEYS.lastEntryDate),
    ]);
    return { streak: streakRaw ? Number(streakRaw) : 0, lastDate: dateRaw };
  } catch {
    return { streak: 0, lastDate: null };
  }
}

async function saveStreak(streak: number, lastDate: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.streak, String(streak));
    await AsyncStorage.setItem(STORAGE_KEYS.lastEntryDate, lastDate);
  } catch {
    // ignore
  }
}

async function loadRoyalUnlocked(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.royalUnlocked);
    return raw === 'true';
  } catch {
    return false;
  }
}

async function saveRoyalUnlocked(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.royalUnlocked, 'true');
  } catch {
    // ignore
  }
}

async function loadAudioEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.audioEnabled);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

async function saveAudioEnabled(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.audioEnabled, String(value));
  } catch {
    // ignore
  }
}

// ═════════════════════════════════════════════════════════════════
// AUDIO SYNTHESIS ENGINE — real PCM sine / binaural WAV, generated
// entirely on-device (no bundled or downloaded audio files)
// ═════════════════════════════════════════════════════════════════
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64EncodeBytes(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < len ? BASE64_CHARS[(triplet >> 6) & 0x3f] : '=';
    result += i + 2 < len ? BASE64_CHARS[triplet & 0x3f] : '=';
  }
  return result;
}

function writeAsciiString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Synthesizes a short, seamlessly loopable stereo sine-wave / binaural
 * WAV buffer and returns it as a base64 string. A short fade-in/out
 * envelope avoids audible clicks at the loop boundary.
 */
function synthesizeToneBase64(leftFreq: number, rightFreq: number): string {
  const sampleRate = 8000;
  const durationSeconds = 4;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAsciiString(view, 8, 'WAVE');
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const amplitude = 0.22; // gentle volume, avoids harsh clipping
  const fadeSamples = Math.floor(sampleRate * 0.08);
  let offset = 44;

  for (let i = 0; i < numSamples; i++) {
    let envelope = 1;
    if (i < fadeSamples) envelope = i / fadeSamples;
    else if (i > numSamples - fadeSamples) envelope = (numSamples - i) / fadeSamples;

    const t = i / sampleRate;
    const sampleLeft = Math.sin(2 * Math.PI * leftFreq * t) * amplitude * envelope;
    const sampleRight = Math.sin(2 * Math.PI * rightFreq * t) * amplitude * envelope;

    view.setInt16(offset, Math.round(sampleLeft * 0x7fff), true);
    offset += 2;
    view.setInt16(offset, Math.round(sampleRight * 0x7fff), true);
    offset += 2;
  }

  return base64EncodeBytes(new Uint8Array(buffer));
}

async function writeToneToCache(key: SoundKey, base64Data: string): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}aurashift_tone_${key}.wav`;
  await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

// ═════════════════════════════════════════════════════════════════
// GDPR / UMP CONSENT + ADMOB INITIALIZATION
// ═════════════════════════════════════════════════════════════════
async function initializeAdsWithConsent(): Promise<void> {
  try {
    const consentInfo = await AdsConsent.requestInfoUpdate();
    if (consentInfo.isConsentFormAvailable && consentInfo.status === AdsConsentStatus.REQUIRED) {
      await AdsConsent.showForm();
    }
  } catch {
    // Proceed even if the consent flow fails (e.g. no network on first launch).
  } finally {
    try {
      await mobileAds().initialize();
    } catch {
      // Ads simply won't show this session — the rest of the app must
      // keep working regardless (safe fallback, never crash on ad init).
    }
  }
}

// ═════════════════════════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════════════════════════
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═════════════════════════════════════════════════════════════════
// REUSABLE UI PIECES
// ═════════════════════════════════════════════════════════════════
function Watermark() {
  return (
    <View style={styles.watermarkWrap} pointerEvents="none">
      <Text style={styles.watermarkText}>{APP_CONFIG.watermark}</Text>
    </View>
  );
}

function CategoryChip({
  category,
  selected,
  onPress,
}: {
  category: CategoryDef;
  selected: boolean;
  onPress: () => void;
}) {
  const Icon = category.icon;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.categoryChip,
        {
          backgroundColor: selected ? category.color + '26' : COLORS.surfaceAlt,
          borderColor: selected ? category.color : COLORS.border,
        },
      ]}
    >
      <Icon size={14} color={selected ? category.color : COLORS.textSecondary} />
      <Text style={[styles.categoryChipText, { color: selected ? category.color : COLORS.textSecondary }]}>
        {category.label}
      </Text>
      {category.locked && <Lock size={11} color={COLORS.textMuted} style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );
}

// ═════════════════════════════════════════════════════════════════
// PRIVACY POLICY MODAL — accurate, Play Store & GDPR compliant text
// ═════════════════════════════════════════════════════════════════
function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={styles.policyHeader}>
          <Text style={styles.sheetTitle}>Privacy Policy</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={styles.policyMeta}>{APP_CONFIG.appName} · by {APP_CONFIG.studioName}</Text>
          <Text style={styles.policyMeta}>Last updated: [Insert publish date before submitting to Play Console]</Text>

          <Text style={styles.policyHeading}>1. Overview</Text>
          <Text style={styles.policyBody}>
            AuraShift AI is a mindset and affirmations app built to work entirely on your device.
            This policy explains, plainly and accurately, what happens to your data.
          </Text>

          <Text style={styles.policyHeading}>2. Data You Enter (100% Local)</Text>
          <Text style={styles.policyBody}>
            Every gratitude journal entry, streak record, and preference you set is stored only in
            this device's local storage. {APP_CONFIG.studioName} does not operate a server for this
            app and cannot see, access, sell, or share your journal entries — we simply never
            receive them in the first place.
          </Text>

          <Text style={styles.policyHeading}>3. Advertising (Google AdMob)</Text>
          <Text style={styles.policyBody}>
            This app displays ads served by Google AdMob to support free access to the app. Google's
            AdMob SDK — a third party, not {APP_CONFIG.studioName} — may collect technical and
            advertising data such as your device's advertising identifier, IP address, general
            device information, and ad interaction data, in order to serve and measure ads. This
            collection is performed by Google under Google's own Privacy Policy
            (https://policies.google.com/privacy), independently of anything {APP_CONFIG.studioName}
            stores.
          </Text>

          <Text style={styles.policyHeading}>4. Your Consent Choices (GDPR / UK)</Text>
          <Text style={styles.policyBody}>
            If you are located in the European Economic Area or the UK, a Google-provided consent
            form appears on first launch, letting you choose whether ads are personalized. You can
            change your device's overall ad preferences at any time via your device's system
            settings (Android: Settings → Google → Ads).
          </Text>

          <Text style={styles.policyHeading}>5. Children's Privacy</Text>
          <Text style={styles.policyBody}>
            AuraShift AI is not directed at children under 13 and we do not knowingly collect data
            from children. Ads shown in this app are not configured for child-directed treatment.
          </Text>

          <Text style={styles.policyHeading}>6. Data Retention & Deletion</Text>
          <Text style={styles.policyBody}>
            Because your data never leaves your device, uninstalling the app permanently removes
            everything AuraShift AI has stored.
          </Text>

          <Text style={styles.policyHeading}>7. Support & Contact</Text>
          <Text style={styles.policyBody}>
            We do not publish a direct support email. All developer support and contact is routed
            through our official website below.
          </Text>
          <Text
            style={[styles.policyBody, { color: COLORS.gold, fontWeight: '600' }]}
            onPress={() => Linking.openURL(APP_CONFIG.officialWebsite)}
          >
            {APP_CONFIG.officialWebsite}
          </Text>

          <Text style={[styles.policyMeta, { marginTop: 24 }]}>{APP_CONFIG.watermark}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════
// HOME TAB — Daily Oracle
// ═════════════════════════════════════════════════════════════════
function HomeScreen({
  royalUnlocked,
  onRequestUnlockRoyal,
  onAffirmationDrawn,
}: {
  royalUnlocked: boolean;
  onRequestUnlockRoyal: () => void;
  onAffirmationDrawn: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('wealth');
  const [currentAffirmation, setCurrentAffirmation] = useState<string>(AFFIRMATIONS.wealth[0]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const availableCategories = useMemo(() => {
    return royalUnlocked ? [...CATEGORIES, ROYAL_CATEGORY] : CATEGORIES;
  }, [royalUnlocked]);

  const drawAffirmation = useCallback(
    (categoryId: CategoryId) => {
      if (categoryId === 'wealthRoyal' && !royalUnlocked) {
        onRequestUnlockRoyal();
        return;
      }
      const pool = AFFIRMATIONS[categoryId];
      const next = pickRandom(pool);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setCurrentAffirmation(next);
      onAffirmationDrawn();
    },
    [royalUnlocked, fadeAnim, onRequestUnlockRoyal, onAffirmationDrawn],
  );

  const handleCategoryPress = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    drawAffirmation(categoryId);
  };

  const handleRefresh = () => {
    drawAffirmation(selectedCategory);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${currentAffirmation}"\n\n${APP_CONFIG.tagline}\n${APP_CONFIG.watermark}`,
      });
    } catch {
      // Sharing was cancelled or failed — nothing to do.
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>TODAY'S ORACLE</Text>
        <Animated.Text style={[styles.heroText, { opacity: fadeAnim }]}>
          "{currentAffirmation}"
        </Animated.Text>
        <View style={styles.heroActionsRow}>
          <TouchableOpacity style={styles.heroIconButton} onPress={handleRefresh}>
            <RefreshCw size={18} color={COLORS.bg} />
            <Text style={styles.heroIconButtonText}>New Oracle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroIconButton, styles.heroIconButtonGhost]} onPress={handleShare}>
            <Share2 size={18} color={COLORS.gold} />
            <Text style={[styles.heroIconButtonText, { color: COLORS.gold }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Choose Your Focus</Text>
      <View style={styles.categoryGrid}>
        {availableCategories.map((cat) => (
          <CategoryChip
            key={cat.id}
            category={cat}
            selected={selectedCategory === cat.id}
            onPress={() => handleCategoryPress(cat.id)}
          />
        ))}
        {!royalUnlocked && (
          <CategoryChip category={ROYAL_CATEGORY} selected={false} onPress={onRequestUnlockRoyal} />
        )}
      </View>

      {!royalUnlocked && (
        <TouchableOpacity style={styles.royalUnlockCard} onPress={onRequestUnlockRoyal}>
          <Crown size={22} color={COLORS.gold} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.royalUnlockTitle}>Unlock Royal Celestial Wealth</Text>
            <Text style={styles.royalUnlockSubtitle}>Watch a short ad to unlock 15 exclusive affirmations</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ═════════════════════════════════════════════════════════════════
// MEDITATE TAB — Zen Breath + Frequency Sounds
// ═════════════════════════════════════════════════════════════════
function ZenBreathView() {
  const [isActive, setIsActive] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('Ready');
  const [secondsLeft, setSecondsLeft] = useState(120);
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runBreathCycle = useCallback(() => {
    const cycle = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 4000, // hold — value unchanged
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.6,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    loopRef.current = Animated.loop(cycle);
    loopRef.current.start();
  }, [scaleAnim]);

  const updatePhaseLabel = useCallback(() => {
    // A full cycle is 12s: 0-4 Inhale, 4-8 Hold, 8-12 Exhale.
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed = (elapsed + 1) % 12;
      if (elapsed < 4) setPhaseLabel('Inhale');
      else if (elapsed < 8) setPhaseLabel('Hold');
      else setPhaseLabel('Exhale');
    }, 1000);
    return interval;
  }, []);

  useEffect(() => {
    let phaseInterval: ReturnType<typeof setInterval> | null = null;

    if (isActive) {
      setPhaseLabel('Inhale');
      runBreathCycle();
      phaseInterval = updatePhaseLabel();

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 120;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      loopRef.current?.stop();
      scaleAnim.setValue(0.6);
      setPhaseLabel('Ready');
    }

    return () => {
      if (phaseInterval) clearInterval(phaseInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const toggleSession = () => {
    if (isActive) {
      setIsActive(false);
      setSecondsLeft(120);
    } else {
      setIsActive(true);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <View style={styles.breathContainer}>
      <View style={styles.breathCircleOuter}>
        <Animated.View
          style={[
            styles.breathCircleInner,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />
        <View style={styles.breathLabelWrap}>
          <Text style={styles.breathPhaseText}>{phaseLabel}</Text>
          <Text style={styles.breathTimerText}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      <Text style={styles.breathInstructions}>
        A gentle 4-4-4 rhythm: inhale for 4 seconds, hold for 4, exhale for 4. Follow the circle.
      </Text>

      <TouchableOpacity style={styles.breathButton} onPress={toggleSession}>
        {isActive ? <Pause size={18} color={COLORS.bg} /> : <Play size={18} color={COLORS.bg} />}
        <Text style={styles.breathButtonText}>{isActive ? 'Pause Session' : 'Begin 2-Minute Session'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function FrequencySoundsView({ audioEnabled }: { audioEnabled: boolean }) {
  const [playingKey, setPlayingKey] = useState<SoundKey | null>(null);
  const [loadingKey, setLoadingKey] = useState<SoundKey | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {
      // Non-fatal — playback will still attempt to work with defaults.
    });

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const stopCurrent = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
    setPlayingKey(null);
  }, []);

  const playPreset = useCallback(
    async (preset: SoundPreset) => {
      if (!audioEnabled) {
        Alert.alert('Audio Disabled', 'Enable audio in Settings to play frequency tones.');
        return;
      }

      if (playingKey === preset.key) {
        await stopCurrent();
        return;
      }

      await stopCurrent();
      setLoadingKey(preset.key);

      try {
        const base64Wav = synthesizeToneBase64(preset.leftFreq, preset.rightFreq);
        const uri = await writeToneToCache(preset.key, base64Wav);
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { isLooping: true, volume: 0.5, shouldPlay: true },
        );
        soundRef.current = sound;
        setPlayingKey(preset.key);
      } catch {
        Alert.alert(
          'Playback unavailable',
          'This frequency tone could not be generated on this device right now. Please try again.',
        );
      } finally {
        setLoadingKey(null);
      }
    },
    [audioEnabled, playingKey, stopCurrent],
  );

  return (
    <View style={{ paddingHorizontal: 4 }}>
      {SOUND_PRESETS.map((preset) => {
        const isPlaying = playingKey === preset.key;
        const isLoading = loadingKey === preset.key;
        return (
          <View key={preset.key} style={styles.soundCard}>
            <View style={[styles.soundIconWrap, isPlaying && { backgroundColor: COLORS.gold + '30' }]}>
              <Music2 size={20} color={isPlaying ? COLORS.gold : COLORS.textSecondary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.soundLabel}>{preset.label}</Text>
              <Text style={styles.soundDescription}>{preset.description}</Text>
            </View>
            <TouchableOpacity
              style={[styles.soundPlayButton, isPlaying && { backgroundColor: COLORS.gold }]}
              onPress={() => playPreset(preset)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.soundPlayButtonText}>…</Text>
              ) : isPlaying ? (
                <Pause size={16} color={COLORS.bg} />
              ) : (
                <Play size={16} color={isPlaying ? COLORS.bg : COLORS.gold} />
              )}
            </TouchableOpacity>
          </View>
        );
      })}
      <Text style={styles.soundFootnote}>
        Tones are synthesized live on your device and loop seamlessly — nothing is downloaded.
      </Text>
    </View>
  );
}

function MeditateScreen({ audioEnabled }: { audioEnabled: boolean }) {
  const [subTab, setSubTab] = useState<MeditateSubTab>('breathe');

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTabButton, subTab === 'breathe' && styles.subTabButtonActive]}
          onPress={() => setSubTab('breathe')}
        >
          <Wind size={16} color={subTab === 'breathe' ? COLORS.bg : COLORS.textSecondary} />
          <Text style={[styles.subTabText, subTab === 'breathe' && styles.subTabTextActive]}>Zen Breath</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabButton, subTab === 'frequencies' && styles.subTabButtonActive]}
          onPress={() => setSubTab('frequencies')}
        >
          <Music2 size={16} color={subTab === 'frequencies' ? COLORS.bg : COLORS.textSecondary} />
          <Text style={[styles.subTabText, subTab === 'frequencies' && styles.subTabTextActive]}>Frequencies</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'breathe' ? <ZenBreathView /> : <FrequencySoundsView audioEnabled={audioEnabled} />}
    </ScrollView>
  );
}

// ═════════════════════════════════════════════════════════════════
// JOURNAL TAB — Gratitude Vault
// ═════════════════════════════════════════════════════════════════
function JournalScreen({
  entries,
  streak,
  onAddEntry,
  onDeleteEntry,
}: {
  entries: JournalEntry[];
  streak: number;
  onAddEntry: (text: string) => void;
  onDeleteEntry: (id: string) => void;
}) {
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddEntry(trimmed);
    setDraft('');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.streakCard}>
        <Flame size={22} color={COLORS.gold} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.streakValue}>{streak} day{streak === 1 ? '' : 's'}</Text>
          <Text style={styles.streakLabel}>Gratitude streak</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>What are you grateful for today?</Text>
      <View style={styles.journalInputWrap}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="I'm grateful for..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.journalInput}
          multiline
        />
        <TouchableOpacity style={styles.journalAddButton} onPress={handleAdd}>
          <Check size={18} color={COLORS.bg} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your Gratitude Vault</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>Your journal is empty. Add your first gratitude entry above.</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.journalEntryRow}>
              <BookHeart size={16} color={COLORS.gold} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.journalEntryText}>{item.text}</Text>
                <Text style={styles.journalEntryDate}>
                  {new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onDeleteEntry(item.id)}>
                <X size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ScrollView>
  );
}

// ═════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═════════════════════════════════════════════════════════════════
function SettingsScreen({
  audioEnabled,
  onToggleAudio,
  onShowPrivacyPolicy,
}: {
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onShowPrivacyPolicy: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingsRow} onPress={onToggleAudio}>
          {audioEnabled ? (
            <Volume2 size={18} color={COLORS.gold} />
          ) : (
            <VolumeX size={18} color={COLORS.textMuted} />
          )}
          <Text style={styles.settingsRowText}>Frequency Audio</Text>
          <View style={[styles.toggleTrack, audioEnabled && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, audioEnabled && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => Linking.openURL(APP_CONFIG.officialWebsite)}
        >
          <ExternalLink size={18} color={COLORS.gold} />
          <Text style={styles.settingsRowText}>Visit Studio Website</Text>
          <ChevronRight size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.settingsRow} onPress={onShowPrivacyPolicy}>
          <ShieldCheck size={18} color={COLORS.gold} />
          <Text style={styles.settingsRowText}>Privacy Policy</Text>
          <ChevronRight size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { alignItems: 'center' }]}>
        <Brain size={26} color={COLORS.gold} />
        <Text style={styles.brandTitle}>{APP_CONFIG.appName}</Text>
        <Text style={styles.brandTagline}>{APP_CONFIG.tagline}</Text>
        <Text style={styles.brandMeta}>
          {APP_CONFIG.packageName} · v{APP_CONFIG.versionName} ({APP_CONFIG.versionCode})
        </Text>
        <Text style={[styles.brandMeta, { marginTop: 6, color: COLORS.gold }]}>{APP_CONFIG.watermark}</Text>
      </View>
    </ScrollView>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [lastEntryDate, setLastEntryDate] = useState<string | null>(null);
  const [royalUnlocked, setRoyalUnlocked] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const drawCountRef = useRef(0);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const rewardedRef = useRef<RewardedAd | null>(null);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  // ---- Load persisted data + init ads/consent on mount ----
  useEffect(() => {
    (async () => {
      const [entries, streakData, unlocked, audioPref] = await Promise.all([
        loadJournal(),
        loadStreak(),
        loadRoyalUnlocked(),
        loadAudioEnabled(),
      ]);
      setJournalEntries(entries);
      setStreak(streakData.streak);
      setLastEntryDate(streakData.lastDate);
      setRoyalUnlocked(unlocked);
      setAudioEnabled(audioPref);
      setLoaded(true);

      await initializeAdsWithConsent();
      preloadInterstitial();
      preloadRewarded();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Interstitial: preload + listeners (safe fallback hooks) ----
  const preloadInterstitial = useCallback(() => {
    try {
      const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
        requestNonPersonalizedAdsOnly: false,
      });
      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        setInterstitialLoaded(false);
        preloadInterstitial();
      });
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => setInterstitialLoaded(false));
      ad.load();
      interstitialRef.current = ad;
      return () => {
        unsubLoaded();
        unsubClosed();
        unsubError();
      };
    } catch {
      // Ad SDK unavailable/misconfigured — app must keep working regardless.
      return () => {};
    }
  }, []);

  const maybeShowInterstitial = useCallback(() => {
    drawCountRef.current += 1;
    const shouldShow = drawCountRef.current % INTERSTITIAL_DRAW_INTERVAL === 0;
    if (shouldShow && interstitialLoaded && interstitialRef.current) {
      try {
        interstitialRef.current.show();
      } catch {
        // Never let an ad failure interrupt the affirmation experience.
      }
    }
  }, [interstitialLoaded]);

  // ---- Rewarded: preload + listeners (unlocks Royal Celestial pack) ----
  const preloadRewarded = useCallback(() => {
    try {
      const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, {
        requestNonPersonalizedAdsOnly: false,
      });
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => setRewardedLoaded(false));
      ad.load();
      rewardedRef.current = ad;
      return () => {
        unsubLoaded();
        unsubError();
      };
    } catch {
      return () => {};
    }
  }, []);

  const handleRequestUnlockRoyal = useCallback(() => {
    if (royalUnlocked) return;

    if (!rewardedLoaded || !rewardedRef.current) {
      Alert.alert(
        'Ad not ready',
        'The unlock ad is still loading. Please try again in a few seconds.',
      );
      return;
    }

    try {
      const unsubEarned = rewardedRef.current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        setRoyalUnlocked(true);
        saveRoyalUnlocked();
      });
      const unsubClosed = rewardedRef.current.addAdEventListener(AdEventType.CLOSED, () => {
        setRewardedLoaded(false);
        preloadRewarded();
        unsubEarned();
        unsubClosed();
      });
      rewardedRef.current.show();
    } catch {
      Alert.alert('Ad unavailable', 'The unlock ad could not be shown right now. Please try again later.');
    }
  }, [royalUnlocked, rewardedLoaded, preloadRewarded]);

  // ---- Journal / streak logic ----
  const handleAddJournalEntry = useCallback(
    (text: string) => {
      const entry: JournalEntry = { id: generateId(), text, date: new Date().toISOString() };
      const updated = [entry, ...journalEntries];
      setJournalEntries(updated);
      saveJournal(updated);

      const today = todayDateKey();
      if (lastEntryDate !== today) {
        let newStreak = 1;
        if (lastEntryDate) {
          const last = new Date(lastEntryDate);
          const diffDays = Math.round((new Date(today).getTime() - last.getTime()) / 86400000);
          newStreak = diffDays === 1 ? streak + 1 : 1;
        }
        setStreak(newStreak);
        setLastEntryDate(today);
        saveStreak(newStreak, today);
      }
    },
    [journalEntries, lastEntryDate, streak],
  );

  const handleDeleteJournalEntry = useCallback(
    (id: string) => {
      const updated = journalEntries.filter((e) => e.id !== id);
      setJournalEntries(updated);
      saveJournal(updated);
    },
    [journalEntries],
  );

  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    saveAudioEnabled(next);
  }, [audioEnabled]);

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <Sparkles size={32} color={COLORS.gold} />
        <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Awakening your sanctuary…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Sparkles size={20} color={COLORS.gold} />
          <Text style={styles.headerTitle}>{APP_CONFIG.appName}</Text>
        </View>
        <Text style={styles.headerVersion}>v{APP_CONFIG.versionName}</Text>
      </View>

      {activeTab === 'home' && (
        <HomeScreen
          royalUnlocked={royalUnlocked}
          onRequestUnlockRoyal={handleRequestUnlockRoyal}
          onAffirmationDrawn={maybeShowInterstitial}
        />
      )}
      {activeTab === 'meditate' && <MeditateScreen audioEnabled={audioEnabled} />}
      {activeTab === 'journal' && (
        <JournalScreen
          entries={journalEntries}
          streak={streak}
          onAddEntry={handleAddJournalEntry}
          onDeleteEntry={handleDeleteJournalEntry}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsScreen
          audioEnabled={audioEnabled}
          onToggleAudio={handleToggleAudio}
          onShowPrivacyPolicy={() => setShowPrivacyPolicy(true)}
        />
      )}

      <Watermark />

      {/* Bottom Banner Ad — docked above the tab bar, safe fallback if unavailable */}
      <View style={styles.bannerWrap}>
        <BannerAd
          unitId={AD_UNIT_IDS.banner}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdFailedToLoad={() => {
            // Silently ignore — the rest of the sanctuary must stay usable.
          }}
        />
      </View>

      <View style={styles.bottomNav}>
        {(
          [
            { id: 'home', label: 'Home', icon: Sparkles },
            { id: 'meditate', label: 'Meditate', icon: Wind },
            { id: 'journal', label: 'Journal', icon: BookHeart },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ] as { id: TabId; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => setActiveTab(tab.id)}>
              <Icon size={22} color={isActive ? COLORS.gold : COLORS.textMuted} />
              <Text style={[styles.navLabel, { color: isActive ? COLORS.gold : COLORS.textMuted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <PrivacyPolicyModal visible={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: 12,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  headerVersion: { color: COLORS.textMuted, fontSize: 11 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroEyebrow: { color: COLORS.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  heroText: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', lineHeight: 30, marginBottom: 18 },
  heroActionsRow: { flexDirection: 'row', gap: 10 },
  heroIconButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 12,
  },
  heroIconButtonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.gold },
  heroIconButtonText: { color: COLORS.bg, fontWeight: '700', fontSize: 13 },

  sectionLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },

  royalUnlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
    marginBottom: 16,
  },
  royalUnlockTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  royalUnlockSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  subTabRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subTabButtonActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  subTabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  subTabTextActive: { color: COLORS.bg },

  breathContainer: { alignItems: 'center', paddingVertical: 20 },
  breathCircleOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  breathCircleInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.gold + '33',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  breathLabelWrap: { alignItems: 'center' },
  breathPhaseText: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  breathTimerText: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  breathInstructions: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 20,
  },
  breathButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  breathButtonText: { color: COLORS.bg, fontWeight: '700', fontSize: 14 },

  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  soundIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  soundDescription: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  soundPlayButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundPlayButtonText: { color: COLORS.gold, fontWeight: '700' },
  soundFootnote: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8, paddingHorizontal: 10 },

  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streakValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  streakLabel: { color: COLORS.textMuted, fontSize: 11 },
  journalInputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 20 },
  journalInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  journalAddButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalEntryRow: { flexDirection: 'row', paddingVertical: 12 },
  journalEntryText: { color: COLORS.textPrimary, fontSize: 13.5, lineHeight: 19 },
  journalEntryDate: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
  separator: { height: 1, backgroundColor: COLORS.border },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 24 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  settingsRowText: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: { backgroundColor: COLORS.gold + '55', borderColor: COLORS.gold },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.textMuted },
  toggleThumbActive: { backgroundColor: COLORS.gold, alignSelf: 'flex-end' },

  brandTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10 },
  brandTagline: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  brandMeta: { color: COLORS.textMuted, fontSize: 10, marginTop: 10 },

  watermarkWrap: { alignItems: 'center', paddingBottom: 2 },
  watermarkText: { color: COLORS.textMuted, fontSize: 9, opacity: 0.5 },

  bannerWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  navItem: { alignItems: 'center', gap: 2 },
  navLabel: { fontSize: 10, fontWeight: '600' },

  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  policyMeta: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
  policyHeading: { color: COLORS.gold, fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  policyBody: { color: COLORS.textSecondary, fontSize: 12.5, lineHeight: 19 },
});
