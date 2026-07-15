import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.salvaquincena.app',
  appName: 'SalvaQuincena',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
