import Toast from 'react-native-toast-message';

const show = (type: 'success' | 'error' | 'info', text1: string, text2?: string) =>
  Toast.show({ type, text1, text2, visibilityTime: type === 'error' ? 4500 : 3000 });

/** Drop-in replacement for react-hot-toast: toast.success('Saved') */
export const toast = {
  success: (message: string, description?: string) => show('success', message, description),
  error: (message: string, description?: string) => show('error', message, description),
  info: (message: string, description?: string) => show('info', message, description),
  hide: () => Toast.hide(),
};

export default toast;
