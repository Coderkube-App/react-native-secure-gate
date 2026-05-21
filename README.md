# react-native-secure-gate 🛡️

A premium, hardware-accelerated biometric (FaceID/TouchID) prompt wrapper and secure passcode shield overlay for **React Native** and **Expo**. It completely masks your app's content with a customizable overlay, triggers native biometrics, and falls back to a gorgeous PIN-pad passcode overlay when necessary.

---

## Features

- 🔒 **Privacy Shield**: Completely overlays sensitive app screens so contents are hidden when returning from background states.
- 🤖 **Expo & Bare Biometrics**: Wraps `expo-local-authentication` dynamically to request FaceID/TouchID/Fingerprint scans.
- 🔢 **Secure Passcode Keypad**: Offers a full-featured numeric entry pad with automatic passcode length matching.
- 🎨 **Modern Themes**: Choose between `dark`, `light`, or `glass` (glassmorphic translucent blur) visual backdrops.
- 📳 **Shake-to-Error Feedback**: Triggers smooth, physical error shake translations when biometric verification or passcodes fail.
- 📦 **Fallback Ready**: Gracefully auto-degrades to PIN passcode mode if biometrics hardware is absent or not enrolled.

---

## Installation

```bash
npm install react-native-secure-gate expo-local-authentication
```
or
```bash
yarn add react-native-secure-gate expo-local-authentication
```

### ⚠️ Note for Bare React Native Projects (Non-Expo)
If you are integrating this into a bare React Native project, you **must** also install the core Expo module runtime to support biometrics:

```bash
npm install expo expo-modules-core
# For iOS, remember to update cocoapods
cd ios && pod install
```

---

## Usage

### 1. Simple Biometric Overlay with PIN Fallback
Overlay the screen with a glassmorphic security wall, requesting FaceID/TouchID on start, and falling back to PIN passcode `1234` on failure:

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import { SecureGate } from 'react-native-secure-gate';

export default function SensitiveScreen() {
  const [isLocked, setIsLocked] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to your secret vault!</Text>
      <Button title="Lock App" onPress={() => setIsLocked(true)} />

      <SecureGate
        isActive={isLocked}
        fallbackPin="1234"
        theme="glass"
        title="Vault Access"
        subtitle="Please verify your identity to access vault files"
        onSuccess={() => {
          setIsLocked(false);
          console.log('App unlocked successfully!');
        }}
        onFailure={(error) => {
          console.log('Authentication failed: ', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  text: {
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 20,
  },
});
```

---

## API Properties

### `<SecureGate>`

| Parameter | Type | Default | Description |
|---|---|---|---|
| **`isActive`** | `boolean` | (Required) | Toggles the overlay active visibility state. |
| **`onSuccess`** | `() => void` | (Required) | Callback fired when biometric scan or PIN entry succeeds. |
| **`onFailure`** | `(error: string) => void` | `undefined` | Callback fired on scan failures or invalid passcode entry. |
| **`fallbackPin`** | `string` | `undefined` | The passcode string to enable fallback PIN input pad. |
| **`pinLength`** | `number` | `4` | Number of digit inputs required to validate fallback PIN. |
| **`theme`** | `'dark' \| 'light' \| 'glass'` | `'dark'` | Visual layout style theme. |
| **`title`** | `string` | `'App Locked'` | Main lock screen header text. |
| **`subtitle`** | `string` | `'Authenticate...'` | Header explanation subtitle text. |
| **`logo`** | `React.ReactNode` | (Default Shield) | Custom vector logo element at the top. |
| **`promptText`** | `string` | `'Unlock with Biometrics'` | Prompt title shown below scanning icons. |
| **`autoAuthenticate`** | `boolean` | `true` | Auto-triggers native OS biometric prompt on mount. |
| **`onHapticTrigger`** | `(type: 'success' \| 'error' \| 'selection') => void` | `undefined` | Optional callback to trigger native haptic vibrations. |
| **`style`** | `StyleProp<ViewStyle>` | `undefined` | Styling overrides for top-level overlay container. |

---

## License

MIT
