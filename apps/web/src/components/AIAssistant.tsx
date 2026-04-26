import React, { useEffect, useRef, useState } from 'react';
import {
  CircleNotch,
  Microphone,
  MicrophoneSlash,
  PaperPlaneRight,
  X,
} from '@phosphor-icons/react';
import type { AiMessage, AiQuota } from '@shared';
import { useAppContext } from '../context/AppContext';
import { aiApi } from '../lib/api';
import { ApiError } from '../lib/api';
import { toast } from '../lib/toast';
import { StatusBadge, cx } from './ui';

const WELCOME: AiMessage = {
  role: 'model',
  text: 'Hola. Soy Efi, tu asistente integrada. Puedo ayudarte a mover tareas, marcas, contactos y plantillas — y a analizar tu pipeline.',
};

export default function AIAssistant({ isDesktop = false }: { isDesktop?: boolean }) {
  const { refreshAppData, accentGradient } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener('efi:close-ai', handler);
    return () => window.removeEventListener('efi:close-ai', handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Probe availability + load quota on first open. We only hit the endpoint
  // when the panel is opened to avoid pinging it for every page render.
  useEffect(() => {
    if (!isOpen || isAvailable !== null) return;
    let cancelled = false;
    aiApi
      .getQuota()
      .then((q) => {
        if (cancelled) return;
        setQuota(q);
        setIsAvailable(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'ai_disabled') {
          setIsAvailable(false);
          return;
        }
        // Network/server error: log and let the user retry. We treat this as
        // "available but errored" so the chat UI renders and shows an error
        // message instead of the "Próximamente" placeholder.
        console.error('Efi IA quota probe failed', err);
        setIsAvailable(true);
      });
    return () => { cancelled = true; };
  }, [isOpen, isAvailable]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    const nextMessages: AiMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await aiApi.chat({ messages: nextMessages });
      setQuota(result.quota);
      setMessages((prev) => [...prev, { role: 'model', text: result.reply || '…' }]);

      // Surface mutations as toasts and refresh app state once if anything changed.
      if (result.mutations.length > 0) {
        result.mutations.forEach((m) => toast.success(m.summary));
        await refreshAppData();
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'quota_exhausted') {
        const data = error.data as { quota?: AiQuota } | undefined;
        if (data?.quota) setQuota(data.quota);
        setMessages((prev) => [...prev, {
          role: 'model',
          text: 'Has alcanzado el límite de mensajes de este mes. Vuelve cuando se renueve tu cuota.',
        }]);
      } else if (error instanceof ApiError && error.code === 'ai_disabled') {
        setIsAvailable(false);
      } else {
        setMessages((prev) => [...prev, {
          role: 'model',
          text: 'Ha ocurrido un error al procesar tu solicitud. Inténtalo de nuevo.',
        }]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const panelGradient =
    'bg-[radial-gradient(circle_at_top_left,rgba(201,111,91,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,243,0.96))]';
  const messageBase =
    'max-w-[88%] rounded-[1rem] px-4 py-3.5 text-sm leading-6 shadow-[0_12px_24px_-22px_rgba(63,43,33,0.25)]';

  const remaining = quota ? Math.max(0, quota.limit - quota.used) : null;
  const quotaExhausted = quota ? quota.used >= quota.limit : false;
  const inputDisabled = !isAvailable || quotaExhausted || isProcessing;

  return (
    <>
      <div
        className={`z-[95] transition-all duration-300 ${
          isDesktop
            ? 'fixed right-6 bottom-6'
            : 'fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+6rem)]'
        } ${isOpen ? 'pointer-events-none translate-y-4 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}
      >
        <button
          id="efi-assistant-btn"
          type="button"
          onClick={() => setIsOpen(true)}
          className={
            isDesktop
              ? 'group relative flex h-12 items-center gap-3 rounded-[1rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 pr-4 text-[var(--text-primary)] shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-28px_rgba(63,43,33,0.24)] active:scale-95'
              : 'group relative flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95'
          }
        >
          <img
            src="/brand/isotipo.png?v=2"
            alt=""
            draggable={false}
            width={32}
            height={32}
            className="h-8 w-8 select-none"
          />
          {isDesktop ? (
            <div className="text-left">
              <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">
                Asistente
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">Efi</p>
            </div>
          ) : null}
        </button>
      </div>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar asistente"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[100] bg-[rgba(41,31,24,0.24)] backdrop-blur-[3px]"
          />

          <div
            id="efi-assistant-panel"
            className={`z-[110] flex flex-col overflow-hidden border border-[color:var(--line-soft)] shadow-[0_30px_90px_-34px_rgba(63,43,33,0.42)] animate-in fade-in slide-in-from-bottom-8 duration-300 ${panelGradient} ${
              isDesktop
                ? 'fixed right-6 bottom-24 h-[min(560px,calc(100dvh-8rem))] w-[min(420px,calc(100vw-2rem))] rounded-[1.45rem]'
                : 'fixed inset-x-3 top-[max(env(safe-area-inset-top,0px)+0.75rem,0.75rem)] bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] rounded-[1.55rem]'
            }`}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(201,111,91,0.16),transparent_68%)]" />
              <div className="absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(93,141,123,0.12),transparent_68%)]" />
            </div>

            <div
              className="relative flex items-center justify-between gap-4 border-b border-black/5 px-5 py-4"
              style={{
                background:
                  'linear-gradient(135deg, rgba(201,111,91,0.18), rgba(255,255,255,0.72) 42%, rgba(93,141,123,0.08))',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/brand/isotipo.png?v=2"
                  alt=""
                  draggable={false}
                  width={40}
                  height={40}
                  className="h-10 w-10 select-none"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-wide text-[var(--text-primary)]">Efi</h3>
                    {isAvailable && remaining !== null ? (
                      <StatusBadge tone="accent" className="shrink-0">
                        {remaining}/{quota!.limit}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    {isAvailable === false
                      ? 'Tu asistente IA llegará en una próxima actualización'
                      : 'Asistencia contextual para tareas, marcas y contactos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            {isAvailable === false ? (
              <div className="relative flex-1 overflow-y-auto px-5 py-6">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-20 w-full items-end justify-center overflow-hidden">
                    <img
                      src="/brand/isotipo.png?v=2"
                      alt=""
                      draggable={false}
                      width={64}
                      height={64}
                      className="h-16 w-16 animate-mushroom-stroll select-none [will-change:transform]"
                    />
                  </div>
                  <StatusBadge tone="accent" className="mt-4">
                    Próximamente
                  </StatusBadge>
                  <h4 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                    Efi IA está en camino
                  </h4>
                  <p className="mt-2 max-w-[22rem] text-sm leading-6 text-[var(--text-secondary)]">
                    Estamos trabajando en tu asistente personal. Te contaremos más cuando esté listo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className={cx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cx(
                          messageBase,
                          message.role === 'user'
                            ? 'rounded-tr-[0.4rem] border border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(201,111,91,0.95),rgba(201,111,91,0.86))] text-[var(--accent-foreground)]'
                            : 'rounded-tl-[0.4rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[var(--text-primary)]',
                        )}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}

                  {isProcessing ? (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-[1rem] rounded-tl-[0.4rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-4 py-3 text-[var(--text-secondary)] shadow-[0_12px_24px_-24px_rgba(63,43,33,0.24)]">
                        <CircleNotch size={16} className="animate-spin" />
                        <span className="text-xs font-medium">Efi está pensando...</span>
                      </div>
                    </div>
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            <div className="relative border-t border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,244,239,0.98))] p-4">
              <div
                className={cx(
                  'flex items-center gap-2 rounded-[1.1rem] border border-[color:var(--line-soft)] bg-white/88 p-1.5 shadow-[0_16px_28px_-28px_rgba(63,43,33,0.2)]',
                  !inputDisabled
                    ? 'focus-within:border-[color:var(--accent-color)] focus-within:bg-white'
                    : 'opacity-60',
                )}
              >
                {'SpeechRecognition' in window || 'webkitSpeechRecognition' in window ? (
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={inputDisabled}
                    className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-[0.9rem] transition-colors disabled:cursor-not-allowed',
                      isListening
                        ? 'bg-rose-100 text-rose-600'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    {isListening ? <Microphone size={18} className="animate-pulse" /> : <MicrophoneSlash size={18} />}
                  </button>
                ) : null}

                <input
                  type="text"
                  value={inputDisabled && quotaExhausted ? '' : input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void send()}
                  placeholder={
                    quotaExhausted
                      ? 'Cuota agotada hasta el próximo mes'
                      : isAvailable
                      ? 'Escribe o habla con Efi...'
                      : ''
                  }
                  disabled={inputDisabled}
                  className="flex-1 border-none bg-transparent px-2 text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none disabled:cursor-not-allowed"
                />

                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={inputDisabled || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: accentGradient, color: 'var(--accent-foreground)' }}
                >
                  <PaperPlaneRight size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
