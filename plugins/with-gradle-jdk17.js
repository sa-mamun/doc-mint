const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withGradleJdk17(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const criteriaPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'gradle',
        'gradle-daemon-jvm.properties',
      );

      await fs.writeFile(criteriaPath, '# Expo SDK 57 Android build JVM\ntoolchainVersion=17\n');
      return modConfig;
    },
  ]);
};
