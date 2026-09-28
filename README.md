# DocMint: PDF Scanner

Android-first Expo SDK 57 / React Native / TypeScript application, located at
`D:\Practice_Project\React_Native\doc-mint`.

## Start

```powershell
cd D:\Practice_Project\React_Native\doc-mint
npm install
npm start
```

Use a compatible Expo Go client, or build the Android development app with `npm run android` (Android SDK/JDK required).
Android builds use JDK 17, Gradle 9.3.1, and CMake 4.1.2 as configured by Expo prebuild.
`npm run web` is a UI preview: camera, native PDF generation, app file storage, printing and file sharing require Android/iOS.
For iOS builds, use macOS or EAS. No backend or API keys are required.

## Included

- Selected **Sapphire & Silver** light/dark palettes, plus follow-system mode. Theme preference persists locally.
- Bundled Bengali font; DocMint English branding; reduced-motion-aware press animations.
- Camera capture with the system crop UI and multi-image gallery import.
- Draft editor: name, add/remove/reorder/rotate pages; up to 20 pages.
- On-device image-to-PDF generation, bounded image resolution, A4 output.
- Import existing PDFs (maximum 50 MB); app-owned copies and metadata stored locally.
- Search, favorites, rename, delete with confirmation, share/export and native printing.
- Expo Router screens and empty states. No seeded files or mock success actions.

## Commands

```powershell
npm run typecheck
npm run lint
npm run doctor
npm run bundle:android
```

## Structure

- `src/app/`: routes and screens.
- `src/components/`: themed controls, workspace, document rows.
- `src/state/AppProvider.tsx`: library, theme, draft and serialized persistence.
- `src/services/`: local document repository and PDF generation.
- `src/theme.ts`: approved design tokens.

## Current scope and next steps

This is a functioning project foundation, not a store-ready release. Automatic document-edge detection,
perspective correction, filters, OCR, PDF merging/compression, signatures, folders and monetization
remain separate implementation work. Camera capture currently uses the system camera/crop UI.
The UI preview cannot verify native camera/gallery/PDF behavior; these require device testing.
Use the share action to save a backup outside app storage. Uninstalling clears app-owned documents.
Cloud accounts, advertising, analytics, cloud sync, release signing and store publishing are not configured.
The bundle identifiers are provisional and should be reviewed before the first store release.

Generated native directories are managed by Expo config/plugins; avoid editing generated native files.
See `AGENTS.md` before making changes. Existing Daily Spend projects are separate and untouched.
