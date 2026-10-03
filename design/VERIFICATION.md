# Verification — 3 October 2026

The completed local-first app follows the approved sketchbook design. All live screenshots use isolated test profiles; they do not contain the user's private journal.

## Passed

- Expo lint and strict TypeScript checking.
- Nine Node tests: local dates, week starts, leap years, record/settings/capsule validation, unsaved changes, search combinations, actual monthly statistics, portable backups, and audio codec/base64 handling.
- Expo SDK dependency compatibility and pnpm peer checks.
- Production exports for web, iOS and Android.
- Production Chrome end-to-end flows: onboarding; save/reload/edit; tags/doodles; photo picker/viewer; past-day backfill and draft recovery; search; rewind and recap download; preferences; backup/restore with photos; repeat imports preserving existing drafts and capsule IDs; invalid backup rejection; sealed/open capsules and immutable snapshots; confirmation before deletion; original deletion leaving capsule copies intact.
- Simulated Chrome camera capture/confirmation and microphone recording/playback/reload. Camera startup readiness is bounded and retried only for the SDK's frame-not-ready error.
- Storage quota failure retains the draft and never falsely marks it saved. Malformed records stay unchanged, editing is disabled for affected days, and raw recovery exports preserve them.
- No browser runtime/console errors in the successful end-to-end run.
- Layout checks at 375×812, 844×390 and 1024×768; no horizontal overflow. Reduced motion is enabled. The app intentionally uses the approved light palette only.

## Not claimed

These exports are not signed installable binaries. No store submission or public deployment has occurred. No account/cloud sync/encryption is implemented.

Physical iOS/Android checks remain for real camera/microphone and audio-format compatibility, notifications, device authentication, native backup sharing/import, maximum Dynamic Type, keyboard and system safe areas. Cross-tab simultaneous editing is not conflict-resolved. Browser WebM audio can be retained in backups even when a native device cannot play that format.

## Reproduce

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm exec expo install --check`, `pnpm peers check`, and `pnpm export`. Start `pnpm preview`, then run `pnpm verify` with Google Chrome installed. Test downloads and generated private fixtures remain in the Git-ignored `test-results/` directory.
