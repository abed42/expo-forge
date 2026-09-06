# Chat

A streamed mock chat over a port of react-native-motion's
[chatgpt-attachments](https://github.com/SchroederNathan/react-native-motion)
composer: a glass panel grows out of the + button into a menu, morphs into a
photo grid or the camera, and the picked photos fly into the composer strip.
The thread and the mock model are ours; the composer, panel, grid, camera and
flights are the reference's, with colours moved into the design-system theme
(`theme.colors.chat`) and icons drawn from SF Symbols.

Everything the feature needs is in this folder plus one route file. Nothing
else in the app imports from it.

## Layout

| Path | What |
| --- | --- |
| `chat-screen.tsx` | The screen: thread, composer, over-keyboard sheet |
| `use-mock-chat.ts` | Thread state + word-at-a-time mock stream. Swap for a real endpoint here. |
| `use-sheet-geometry.ts` | Keyboard-driven positions (composer lift, sheet frame) |
| `use-attachment-panel.ts` | Panel state machine: closed ⇄ menu ⇄ photos/camera |
| `use-attachment-flights.ts` | Attachments + the photos flying into the composer |
| `constants.ts` | Every measured size, spring and duration |
| `glass.tsx` | Liquid glass with `expo-blur` fallback below iOS 26 |
| `icon.tsx` | SF Symbol glyphs by role |
| `panel/` `composer/` `photos/` `camera/` | The pieces, one concern each |

Route: `src/app/chat.tsx` wraps `ChatScreen` in `KeyboardProvider`. It is a
full-screen stack route pushed over the tabs — no tab bar, the composer docks
on the home indicator, a back button sits top-left. The Chat item in the tab
bar is the entry point: its trigger (`(tabs)/_layout.tsx`) is `disabled` so
the native selection never happens, and its `tabPress` listener pushes
`/chat`; `(tabs)/chat-tab.tsx` is the empty route that trigger requires.

## Removing the feature

Every touch point outside this folder is marked with a `chat:` comment.

1. `rm -r apps/mobile/src/components/chat apps/mobile/src/app/chat.tsx "apps/mobile/src/app/(tabs)/chat-tab.tsx"`
2. `apps/mobile/src/app/(tabs)/_layout.tsx` — drop the `chat-tab`
   `NativeTabs.Trigger` (and the `useRouter` import if nothing else uses it).
3. `apps/mobile/src/app/_layout.tsx` — drop the `chat` `Stack.Screen`.
4. `packages/design-system/src/tokens.ts` — drop `chatColors` and the two
   `chat: chatColors` entries.
5. `apps/mobile/app.json` — drop the `expo-image`, `expo-camera` and
   `expo-media-library` plugin entries and `android.permissions`.
6. `apps/mobile/package.json` — drop `expo-blur`, `expo-camera`,
   `expo-haptics`, `expo-image`, `expo-media-library` and
   `react-native-keyboard-controller` (nothing else uses them), then
   `bun install`.
7. Rebuild the dev client (`cd apps/mobile && bun ios`) — native modules left.

`bunx turbo lint typecheck test` should pass with no other edits.

## Platform notes

- Real glass needs iOS 26; below that the panel is an `expo-blur` material
  and on Android a flat fill (a blur can't sample across the keyboard window).
- Icons are SF Symbols via `expo-symbols`; Android renders nothing for them
  until a Material fallback is added in `icon.tsx`.
- The photo grid and camera need the permissions declared in `app.json`, so
  they only work in a rebuilt dev client, not Expo Go.
- `expo-image` is pinned to exactly `57.0.1`: later patches call an
  `expo-modules-core` API that is still `internal` in the core version the
  rest of the SDK 57 pins resolve to, and the iOS build fails. Lift the pin
  only together with a core bump validated against `tooling/pins.json`.
- `expo-camera` and `expo-media-library` are why iOS builds Expo modules
  from source (`ios.usePrecompiledModules: false` in `app.json`): Expo's
  precompiled binaries for these patches were linked against a newer core
  than the pinned one and the dev client aborted in dyld at launch. See the
  version-pins section of `AGENTS.md`.
