# Firebase & Firestore Migration Strategy

## 1. Overview
This document outlines the current usage of Firebase and Firestore in the codebase and provides a high-level migration strategy to NextAuth (for authentication) and Express (for business logic and data storage).

---

## 2. Current Usage Summary

### Initialization & Core Usage
- **Electron Main Process**: `src/features/common/services/firebaseClient.js` initializes Firebase App, Auth, and Firestore. Used throughout backend.
- **Web Frontend**: `pickleglass_web/utils/firebase.ts` initializes Firebase for React/Next.js.

### Authentication (Firebase Auth)
- **Electron**: `src/features/common/services/authService.js` manages login/logout, user state, and deep link login via Firebase Auth.
- **Web**: `pickleglass_web/utils/auth.ts`, `pickleglass_web/app/login/page.tsx` handle Google sign-in and user state.
- **IPC/Preload**: `src/preload.js`, `src/bridge/featureBridge.js` expose auth actions to renderer.

### Firestore (Database)
- **Repositories**: All Firestore access is abstracted via `firebase.repository.js` files for users, sessions, presets, provider settings, AI messages, summaries, and STT data.
- **Frontend**: `pickleglass_web/utils/firestore.ts` and related hooks/classes for CRUD operations.

### Cloud Functions
- **File**: `functions/index.js` implements a Cloud Function for exchanging Firebase ID token for a custom token (used in Electron login flow).

### Data Migration
- **File**: `src/features/common/services/migrationService.js` migrates user data from local SQLite to Firestore.

### Other
- **Encryption**: Firestore data is encrypted/decrypted using custom converters and `encryptionService.js`.
- **Persistence**: Electron uses a custom persistence class with `electron-store` for Firebase Auth session storage.

---

## 3. Migration Guidance

### What Needs to Change?
1. **Authentication**
   - Replace all Firebase Auth logic with NextAuth logic in both Electron and web.
   - Update IPC and preload logic to use NextAuth endpoints or session state.
2. **Firestore Data**
   - Replace all Firestore CRUD operations in repositories and frontend with Express API endpoints.
   - Migrate data models and encryption logic to Express backend.
   - Update React hooks and service classes to use new API endpoints.
   
3. **Cloud Functions**
   - Move any business logic from Firebase Cloud Functions to Express routes.
4. **Data Migration**
   - Update migration logic to sync data with new Express backend instead of Firestore.
5. **Persistence**
   - Replace custom Firebase Auth persistence with NextAuth session management.

---

## 4. File/Module Reference Table

| Area                | File(s) / Module(s)                                                                 | What/Why/How                                                                                  |
|---------------------|-------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Firebase Init       | `src/features/common/services/firebaseClient.js`, `pickleglass_web/utils/firebase.ts` | Initializes Firebase, provides singleton access                                               |
| Auth Logic          | `src/features/common/services/authService.js`, `pickleglass_web/utils/auth.ts`, `src/preload.js`, `src/bridge/featureBridge.js`, `pickleglass_web/app/login/page.tsx` | Handles login, logout, user state, deep link, Google sign-in                                  |
| Firestore Repos     | `src/features/common/repositories/*/firebase.repository.js`, `src/features/ask/repositories/firebase.repository.js`, `src/features/listen/summary/repositories/firebase.repository.js`, `src/features/settings/repositories/firebase.repository.js`, `src/features/listen/stt/repositories/firebase.repository.js` | CRUD for users, sessions, presets, provider settings, AI messages, summaries, STT             |
| Firestore Frontend  | `pickleglass_web/utils/firestore.ts`, `pickleglass_web/utils/useUserRole.ts`        | Firestore service classes and hooks for React/Next.js                                         |
| Cloud Functions     | `functions/index.js`                                                                | Auth callback, token exchange                                                                 |
| Data Migration      | `src/features/common/services/migrationService.js`                                   | Migrates user data from SQLite to Firestore                                                   |
| Persistence         | `src/features/common/services/firebaseClient.js` (custom persistence)                | Electron-store for Firebase Auth session                                                      |

---

## 5. Summary Table: What to Replace

| Firebase/Firestore Usage         | Replace With (Migration Target)         |
|----------------------------------|----------------------------------------|
| Firebase Auth (login/logout)     | NextAuth (session, JWT, providers)     |
| Firestore CRUD (all collections) | Express API + SQL/NoSQL DB             |
| Cloud Functions                  | Express routes                         |
| Firestore batch writes           | Express API batch endpoints/transactions|
| Firestore queries (where/order)  | Express API query params + DB queries  |
| Firestore encryption converters  | Express middleware or model logic      |
| Electron custom persistence      | NextAuth session or custom store       |

---

## 6. Next Steps
1. Implement NextAuth in both Electron and web.
2. Build Express endpoints for all Firestore collections and business logic.
3. Update React/Next.js hooks and service classes to use new API.
4. Update preload and IPC logic to use new auth/session and API endpoints.
5. Write scripts to migrate existing Firestore data to new backend if needed. 