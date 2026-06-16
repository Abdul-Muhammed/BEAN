const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Give the Objective-C pods that AppCheckCore (a Swift pod pulled in via
// GoogleSignIn -> @react-native-google-signin/google-signin) imports a clang
// module map so they can be `import`ed from Swift when linked as static
// libraries. Without this, `pod install` aborts with:
//   "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
//    `RecaptchaInterop`, which do not define modules."
const POD_LINES = [
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
];

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      if (contents.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        return cfg; // already applied
      }

      const anchor = 'use_expo_modules!';
      const idx = contents.indexOf(anchor);
      if (idx === -1) {
        throw new Error('[withModularHeaders] could not find use_expo_modules! in Podfile');
      }
      const insertAt = contents.indexOf('\n', idx) + 1;
      contents =
        contents.slice(0, insertAt) +
        POD_LINES.join('\n') + '\n' +
        contents.slice(insertAt);

      fs.writeFileSync(podfile, contents);
      return cfg;
    },
  ]);
};
