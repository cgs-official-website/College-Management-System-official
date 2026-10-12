import type { LinkingOptions } from '@react-navigation/native';

/**
 * Deep links (optional - needs the Android intent-filter / iOS URL scheme "zuna"):
 *   zuna://login?college=my-college
 *   zuna://reset-password?token=XXXX&id=USER_ID
 */
export const linking: LinkingOptions<any> = {
  prefixes: ['zuna://'],
  config: {
    screens: {
      Login: 'login',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
    },
  },
};
