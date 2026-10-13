# Batch 1 - Setup + Auth + UI foundation

## 1. Extra packages (in addition to the ones already installed)
npm install @react-native-async-storage/async-storage cross-env
cd ios && pod install && cd ..        # Mac only

## 2. react-native-config (Android) - REQUIRED
Open  android/app/build.gradle  and add this line at the very bottom:

    apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"

## 3. package.json -> "scripts"  (add these)
    "android": "react-native run-android",
    "android:prod": "cross-env ENVFILE=.env.production react-native run-android --mode release",
    "start": "react-native start",
    "start:reset": "react-native start --reset-cache"

## 4. NEW files not in the first tree (create them)
    src/components/layout/AuthShell.tsx
    src/components/layout/Banner.tsx

## 5. .gitignore  -> add
    .env
    .env.production

## 6. Run
    cd ../Backend && npm run dev                 (terminal 1)
    adb reverse tcp:5000 tcp:5000                (physical phone via USB)
    adb reverse tcp:8081 tcp:8081
    npx react-native start                       (terminal 2, Metro)
    npx react-native run-android                 (terminal 3)

After editing .env you MUST rebuild:  npx react-native start --reset-cache  and run-android again.

## 7. Production
Edit .env.production -> API_URL=https://<your-live-backend>/api/v1
Build with:  npm run android:prod

## 8. Optional deep links (reset-password link opens the app)
Add inside <activity> of android/app/src/main/AndroidManifest.xml:
    <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="zuna" />
    </intent-filter>
