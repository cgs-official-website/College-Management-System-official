import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/navigation';
import LandingScreen from '../screens/auth/LandingScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const LOGOUT_NO_SPLASH_KEY = '@zuna_logout_no_splash';

type InitialRoute = React.ComponentProps<typeof Stack.Navigator>['initialRouteName'];

export default function AuthStack() {
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveInitialRoute = async () => {
      try {
        const skipLaunchSplash = await AsyncStorage.getItem(LOGOUT_NO_SPLASH_KEY);

        if (skipLaunchSplash === 'true') {
          await AsyncStorage.removeItem(LOGOUT_NO_SPLASH_KEY);
          if (mounted) setInitialRoute('Login');
          return;
        }
      } catch {
        // Fall through to the normal launch flow.
      }

      // Every cold start begins with the Splash; it decides Onboarding (first install) or Login.
      if (mounted) setInitialRoute('Splash');
    };

    resolveInitialRoute();

    return () => {
      mounted = false;
    };
  }, []);

  if (!initialRoute) return null;

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Splash" component={LandingScreen} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Onboarding" component={WelcomeScreen} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}