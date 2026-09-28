const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withSmootherDocumentScanner(config) {
  return withDangerousMod(config, [
    'android',
    async modConfig => {
      const sourcePath = path.join(
        modConfig.modRequest.projectRoot,
        'node_modules',
        'react-native-document-scanner-plugin',
        'android',
        'src',
        'main',
        'java',
        'com',
        'documentscanner',
        'DocumentScannerModule.kt',
      );
      let source = await fs.readFile(sourcePath, 'utf8');
      const fullMode = '.setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)';
      const baseMode = '.setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE)';
      const filterMode = '.setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE_WITH_FILTER)';

      if (!source.includes(filterMode)) {
        if (source.includes(baseMode)) {
          source = source.replace(baseMode, filterMode);
        } else if (source.includes(fullMode)) {
          source = source.replace(fullMode, filterMode);
        } else {
          throw new Error('Document scanner source changed; review the scanner config plugin patch.');
        }
        await fs.writeFile(sourcePath, source);
      }
      return modConfig;
    },
  ]);
};
