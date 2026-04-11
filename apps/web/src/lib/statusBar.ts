import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initializeStatusBar() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#09090b' });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (error) {
    console.warn('Failed to initialize StatusBar:', error);
  }
}

export async function updateStatusBarColor(color: string) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setBackgroundColor({ color });
  } catch (error) {
    console.warn('Failed to update StatusBar color:', error);
  }
}
