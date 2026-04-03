import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Confetti() {
  useEffect(() => {
    const handler = () => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    };
    window.addEventListener('efi-confetti', handler);
    return () => window.removeEventListener('efi-confetti', handler);
  }, []);

  return null;
}
