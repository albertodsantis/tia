import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export interface CopyResult {
  isNative: boolean;
  success: boolean;
}

/**
 * Copy text to clipboard (web) or show native share sheet (native).
 * Returns { isNative, success } to allow callers to show appropriate UI feedback.
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      await Share.share({ text });
      return { isNative: true, success: true };
    } catch (err) {
      console.debug('Share dismissed by user');
      return { isNative: true, success: false };
    }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      return { isNative: false, success: true };
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return { isNative: false, success: false };
    }
  }
}

/**
 * Share or copy the EfiLink profile URL to clipboard.
 * On native platforms (Capacitor), opens the native share sheet.
 * On web, copies the URL to clipboard.
 * Returns { isNative, success } to allow callers to show appropriate UI feedback.
 */
export async function shareEfiLink(handle: string): Promise<CopyResult> {
  const cleanHandle = handle.replace(/^@/, '');
  const baseUrl = 'https://efi.app';
  const url = `${baseUrl}/@${cleanHandle}`;
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      await Share.share({
        title: 'Mira mi perfil en Efi',
        text: `Te comparto mi perfil: ${url}`,
        url,
      });
      return { isNative: true, success: true };
    } catch (err) {
      console.debug('Share dismissed by user');
      return { isNative: true, success: false };
    }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      return { isNative: false, success: true };
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return { isNative: false, success: false };
    }
  }
}
