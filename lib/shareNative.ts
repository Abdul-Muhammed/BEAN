import { TurboModuleRegistry } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Availability-checked access to the native modules the Share Review screen needs.
 *
 * Why this file exists: all five packages resolve their native side at *module
 * scope* — `react-native-share` and `react-native-view-shot` via
 * `TurboModuleRegistry.getEnforcing(...)`, the three expo packages via
 * `requireNativeModule(...)` — and every one of them throws when that side is
 * missing. Expo Router eagerly evaluates route files to build its route tree, so
 * importing any of them from `app/share-review/[id].tsx` breaks the app on a dev
 * client built before these packages were added.
 *
 * Note that wrapping the import in `try/catch` does NOT help, which is easy to
 * assume and wrong. Metro's `guardedLoadModule` catches a module-initialisation
 * throw itself, reports it through `ErrorUtils.reportFatalError` — that is what
 * paints the red box — and returns `undefined` instead of rethrowing, so a
 * surrounding `catch` never runs and the error surfaces regardless.
 *
 * The only thing that works is to not `require()` the package at all unless its
 * native module is already registered. Hence: probe first, require second.
 */

export type ShareModuleName =
  | 'react-native-view-shot'
  | 'react-native-share'
  | 'expo-clipboard'
  | 'expo-media-library'
  | 'expo-sharing';

/**
 * `typeof import(...)` is type-only and erased at compile time, so the call sites
 * stay fully typed without anything being pulled in at runtime.
 */
export interface ShareNatives {
  captureRef: typeof import('react-native-view-shot').captureRef;
  RNShare: typeof import('react-native-share').default;
  // An enum — its *values* have to come from the require, not from `import type`.
  Social: typeof import('react-native-share').Social;
  Clipboard: typeof import('expo-clipboard');
  MediaLibrary: typeof import('expo-media-library');
  Sharing: typeof import('expo-sharing');
}

/**
 * Exactly the condition under which `TurboModuleRegistry.getEnforcing(name)` would
 * succeed: `getEnforcing` is `requireModule(name)` plus an invariant that the
 * result is non-null, and `get` is that same `requireModule(name)` unguarded.
 * `requireModule` also falls back to `NativeModules[name]` for the legacy bridge,
 * so this covers both architectures.
 */
function hasTurboModule(name: string): boolean {
  return TurboModuleRegistry.get(name) != null;
}

/** `requireOptionalNativeModule` returns null rather than throwing when absent. */
function hasExpoModule(name: string): boolean {
  return requireOptionalNativeModule(name) != null;
}

/**
 * Package name paired with a probe for the native module it needs. Deliberately
 * only touches the registry — nothing here loads any JavaScript from these
 * packages, which is what keeps the degraded path silent.
 */
const PROBES: { pkg: ShareModuleName; present: () => boolean }[] = [
  { pkg: 'react-native-view-shot', present: () => hasTurboModule('RNViewShot') },
  { pkg: 'react-native-share', present: () => hasTurboModule('RNShare') },
  { pkg: 'expo-clipboard', present: () => hasExpoModule('ExpoClipboard') },
  { pkg: 'expo-media-library', present: () => hasExpoModule('ExpoMediaLibrary') },
  { pkg: 'expo-sharing', present: () => hasExpoModule('ExpoSharing') },
];

/** Probe results are stable for the life of the JS context, so memoise them. */
let missingCache: ShareModuleName[] | null = null;

/**
 * Which share packages are absent from the running binary, by name.
 *
 * Reported per-module rather than as a single boolean because the linking
 * mechanisms are independent — `react-native-share` and `react-native-view-shot`
 * come in through React Native autolinking, the `expo-*` packages through
 * expo-modules — so a build can genuinely pick up one group and miss the other.
 * Naming them makes that diagnosable instead of indistinguishable from "no
 * rebuild yet".
 */
export function getMissingShareModules(): ShareModuleName[] {
  if (!missingCache) {
    missingCache = PROBES.filter((probe) => !probe.present()).map((probe) => probe.pkg);
  }
  return missingCache;
}

/**
 * The share stack, or null when any part of it is missing from this binary.
 *
 * The requires below are only reached once every probe has passed, so they cannot
 * hit the module-scope throw described at the top of this file.
 */
export function getShareNatives(): ShareNatives | null {
  if (getMissingShareModules().length > 0) return null;

  /* eslint-disable @typescript-eslint/no-require-imports --
     Deliberate: a static import would evaluate these at route-tree build time,
     before we have had any chance to check whether the native side exists. */
  const viewShot = require('react-native-view-shot') as typeof import('react-native-view-shot');
  const share = require('react-native-share') as typeof import('react-native-share');
  const clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
  const mediaLibrary = require('expo-media-library') as typeof import('expo-media-library');
  const sharing = require('expo-sharing') as typeof import('expo-sharing');
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    captureRef: viewShot.captureRef,
    RNShare: share.default,
    Social: share.Social,
    Clipboard: clipboard,
    MediaLibrary: mediaLibrary,
    Sharing: sharing,
  };
}
