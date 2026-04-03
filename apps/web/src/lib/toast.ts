export type ToastType = 'success' | 'error' | 'info';

export const toast = (message: string, type: ToastType = 'success', pointsEarned?: number) => {
  const event = new CustomEvent('efi-toast', {
    detail: { id: Math.random().toString(36).substring(2, 9), message, type, pointsEarned },
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
};

toast.success = (msg: string, pts?: number) => toast(msg, 'success', pts);
toast.error = (msg: string) => toast(msg, 'error');
toast.info = (msg: string) => toast(msg, 'info');
