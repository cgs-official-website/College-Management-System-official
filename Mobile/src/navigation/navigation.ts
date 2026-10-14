export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: { college?: string; successMessage?: string } | undefined;
  ForgotPassword: undefined;
  Register: undefined;
  ResetPassword: { token?: string; id?: string; userId?: string } | undefined;
};

export type StatusStackParamList = {
  PendingApproval: undefined;
  Rejected: undefined;
};

export type AppStackParamList = {
  Home: undefined;
};