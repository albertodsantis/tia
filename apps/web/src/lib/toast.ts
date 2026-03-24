export type ToastType = 'success' | 'error' | 'info';

export const toast = (message: string, type: ToastType = 'success') => {
  const event = new CustomEvent('tia-toast', {
    detail: { id: Math.random().toString(36).substring(2, 9), message, type },
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
};

toast.success = (msg: string) => toast(msg, 'success');
toast.error = (msg: string) => toast(msg, 'error');
toast.info = (msg: string) => toast(msg, 'info');