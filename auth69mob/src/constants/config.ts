import { Platform } from 'react-native';

export const SERVER_CONFIG = {
  getBaseUrl: () => {
    if (Platform.OS === 'android') {
      return 'http://192.168.29.67:5000';
    }
    return 'http://localhost:5000';
  },
  getSocketUrl: () => {
    if (Platform.OS === 'android') {
      return 'http://192.168.29.67:5002';
    }
    return 'http://localhost:5002';
  },
  APP_NAME: 'Auth69 Authenticator',
  DEVICE_NAME: `auth69mob-${Platform.OS}`,
};
