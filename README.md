# Little Days

A local-first journal for iOS, Android, and web. Expo SDK 57 / React Native / Expo Router, in the approved paper-and-fineliner sketchbook style.

## Run

```sh
pnpm install
pnpm web
```

For mobile: `pnpm start` with an SDK 57-compatible Expo Go client or native development build. Windows cannot run an iOS simulator. No account, API key, or backend is needed.

Production web preview:

```sh
pnpm export
pnpm preview
```

Open http://127.0.0.1:8082. The local-only server supports direct Expo Router URLs.

## Included

- Onboarding and returning-sketchbook import.
- Today: four moods, journal text, up to three photos, custom camera capture/confirmation, a 60-second voice note, playback/removal and a real weekly strip.
- Calendar: month/year browsing, Monday/Sunday preference, past-day backfill and opening saved memories. Future writing is disabled.
- Memory detail/editor: one entry per date, tags, original doodles, full-size photo viewing and confirmed deletion.
- Search: combine text/dates/tags, mood, photos and voice; recent queries stay local.
- Rewind: real monthly counts, mood distribution, recurring tags and saved moments. Downloadable text recaps use your own words.
- Time capsules: letters, memory snapshots, future opening dates, preserved detail and separate deletion.
- Settings: writing style, default doodle, calendar preferences, backup/restore, privacy information, feedback link, mobile reminders and device-authentication lock.
- About and missing-page recovery.

Four main destinations: Today, Year, Rewind, Settings. Original SVG sketch icons, pastel mood stamps, paper grain, wobbly borders and cobalt actions are shared. No fake entries are preloaded. The app icon is original vector artwork.

## Storage and privacy

Native records use versioned AsyncStorage; attachments use app document files. Web records use IndexedDB, with read-through migration of original first-page AsyncStorage data. Immediate serialized draft writes preserve text when navigating. Explicit saving updates the same daily memory.

**No account, cloud sync, advertising, analytics or journal uploads.** Data is not encrypted by Little Days. Device authentication gates the app UI, not the files. Time-capsule date locks are a ritual, not a secure vault: changing the device date or reading local storage can bypass them.

Uninstalling or clearing browser data may erase the sketchbook. Export a backup regularly. JSON backups embed photos/audio, drafts and capsules. Imports validate the file and add missing dates only; existing entries, drafts and capsule IDs are preserved. A failed large import can be retried; already-added days remain safe. Reminder/lock preferences are not transferred.

Unreadable/future-version records are not overwritten. A raw recovery export preserves them for manual repair and is not a regular importable backup. Storage failures retain current text and never report false saves. Backups contain private memories and sealed capsules: keep them carefully.

Limits: three photos/day (2 MB each on web), one 60-second voice note/day, browser/device storage quotas, and 80 MB/import file. Removed native attachments may remain until uninstall; no destructive filesystem cleanup runs. Use one active editing tab at a time; cross-tab conflicts are not resolved.

Imported audio retains its original format. Browser WebM recordings may not play on every native device; the original recording remains available in exported backups.

## Check

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm exec expo install --check
pnpm peers check
pnpm export
```

With production preview running and Google Chrome installed: `pnpm verify`.

The browser test uses isolated profiles, simulated camera/microphone devices, and never touches the user's browser journal. It covers save/reload/edit, photo upload/viewing, tags/doodles, draft navigation/backfill, search, rewind/recap download, preferences, portable backups, repeated imports with conflicts, invalid backup rejection, capsule opening/snapshots, deletion, audio persistence, quota failure and corrupt-record protection. Layouts are checked at 375×812, 844×390 and 1024×768 with reduced motion enabled.

Generated backups/private test artifacts are ignored by Git. Screenshots in `design/live/` contain test data only. The UI/UX and React review shaped accessibility labels/states, safe areas, shared components, actual-data empty states, bounded lists and serialized storage.

`scripts/render-icon.cjs` regenerates committed PNGs from `assets/sketchbook-icon.svg` with an installed `sharp` package supplied as its argument. Normal app use does not require it.

## Before a mobile release

Web/iOS/Android production JavaScript bundles export; these are **not signed installable binaries**. No public hosting or app-store submission is included.

A physical iOS/Android pass is still needed for real camera/microphone/playback, notifications (timezone/permission changes), biometric/passcode lock, native sharing/import, keyboard/safe areas and maximum Dynamic Type. Face ID requires a configured native build, not only Expo Go. Reminders and device authentication are explicitly unavailable in the web UI. The approved design is intentionally light-mode only.
