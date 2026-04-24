import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import {
  Bell,
  CheckSquare,
  CircleNotch,
  Lightning,
  Microphone,
  MicrophoneSlash,
  PaperPlaneRight,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import { TaskStatus } from '@shared/domain';
import { useAppContext } from '../context/AppContext';
import { toast } from '../lib/toast';
import { StatusBadge, cx } from './ui';

const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

type AssistantMessage = { role: 'user' | 'model'; text: string };

export default function AIAssistant({ isDesktop = false }: { isDesktop?: boolean }) {
  const {
    tasks,
    partners,
    profile,
    templates,
    accentColor,
    accentHex,
    accentGradient,
    addTask,
    addPartner,
    ensurePartnerByName,
    findPartnerByName,
    updateTaskStatus,
    addContact,
    updatePartner,
  } = useAppContext();
  const isAiAvailable = Boolean(ai);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener('efi:close-ai', handler);
    return () => window.removeEventListener('efi:close-ai', handler);
  }, []);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'model',
      text: 'Hola. Soy Efi, tu asistente integrada. Puedo ayudarte a mover tareas, marcas, contactos y plantillas sin salir del workspace.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    if (!ai || chatRef.current) {
      return;
    }

    const tools: { functionDeclarations: FunctionDeclaration[] }[] = [
      {
        functionDeclarations: [
          {
            name: 'get_app_data',
            description: 'Obtiene los datos actuales de la aplicacion para responder preguntas sobre tareas, marcas, contactos, perfil y plantillas.',
            parameters: {
              type: Type.OBJECT,
              properties: {},
            },
          },
          {
            name: 'add_task',
            description: 'Anade una nueva tarea al pipeline.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Titulo de la tarea' },
                description: { type: Type.STRING, description: 'Descripcion de la tarea' },
                partnerName: { type: Type.STRING, description: 'Nombre de la marca o partner' },
                value: { type: Type.NUMBER, description: 'Valor monetario de la tarea' },
                dueDate: { type: Type.STRING, description: 'Fecha de entrega en formato YYYY-MM-DD' },
              },
              required: ['title', 'partnerName', 'value', 'dueDate'],
            },
          },
          {
            name: 'update_task_status',
            description: 'Actualiza el estado de una tarea existente.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.STRING, description: 'ID de la tarea a actualizar' },
                status: {
                  type: Type.STRING,
                  description: 'Nuevo estado: Pendiente, En Progreso, En Revision o Completada.',
                },
              },
              required: ['taskId', 'status'],
            },
          },
          {
            name: 'add_partner',
            description: 'Anade una nueva marca o partner al directorio.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Nombre de la marca' },
                status: { type: Type.STRING, description: 'Estado inicial de la marca' },
              },
              required: ['name'],
            },
          },
          {
            name: 'add_contact',
            description: 'Anade un nuevo contacto a una marca o partner existente.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                partnerName: { type: Type.STRING, description: 'Nombre de la marca' },
                name: { type: Type.STRING, description: 'Nombre del contacto' },
                role: { type: Type.STRING, description: 'Rol o cargo del contacto' },
                email: { type: Type.STRING, description: 'Correo electronico del contacto' },
                ig: { type: Type.STRING, description: 'Usuario de Instagram del contacto sin @' },
              },
              required: ['partnerName', 'name'],
            },
          },
          {
            name: 'update_partner_status',
            description: 'Actualiza el estado de una marca o partner existente.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                partnerName: { type: Type.STRING, description: 'Nombre de la marca a actualizar' },
                status: { type: Type.STRING, description: 'Nuevo estado de la marca' },
              },
              required: ['partnerName', 'status'],
            },
          },
        ],
      },
    ];

    try {
      chatRef.current = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction:
            'Eres Efi, un asistente de inteligencia artificial integrado en un CRM para freelancers. Tu objetivo es ayudar al usuario a gestionar sus tareas, clientes, contactos, plantillas y perfil. Se concisa, util, amable y profesional. Responde siempre en espanol.',
          tools,
        },
      });
    } catch (error) {
      console.error('Error initializing Gemini chat:', error);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handlePaperPlaneRight = async () => {
    if (!input.trim()) return;

    if (!chatRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'El asistente IA no esta disponible todavia. Configura GEMINI_API_KEY para activarlo.',
        },
      ]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsProcessing(true);

    try {
      let response = await chatRef.current.sendMessage({ message: userMessage });
      let functionCalls = response.functionCalls;
      let functionResponses: any[] = [];

      while (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'get_app_data') {
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result: { tasks, partners, profile, templates } },
              },
            });
          } else if (call.name === 'add_task') {
            const { title, description, partnerName, value, dueDate } = call.args as any;
            const partner = await ensurePartnerByName(partnerName);

            await addTask({
              title,
              description: description || '',
              partnerId: partner.id,
              value: Number(value),
              dueDate,
              status: 'Pendiente',
              checklistItems: [],
            });

            functionResponses.push({
              functionResponse: { name: call.name, response: { result: 'Tarea anadida con exito.' } },
            });
          } else if (call.name === 'update_task_status') {
            const { taskId, status } = call.args as any;
            await updateTaskStatus(taskId, status as TaskStatus);
            functionResponses.push({
              functionResponse: { name: call.name, response: { result: 'Estado actualizado.' } },
            });
          } else if (call.name === 'add_partner') {
            const { name, status } = call.args as any;
            await addPartner({ name, status: status || 'Prospecto', contacts: [] });
            functionResponses.push({
              functionResponse: { name: call.name, response: { result: 'Cliente añadido con exito.' } },
            });
          } else if (call.name === 'add_contact') {
            const { partnerName, name, role, email, ig } = call.args as any;
            const partner = await ensurePartnerByName(partnerName);

            await addContact(partner.id, { name, role: role || '', email: email || '', ig: ig || '' });
            functionResponses.push({
              functionResponse: { name: call.name, response: { result: 'Contacto anadido con exito.' } },
            });
          } else if (call.name === 'update_partner_status') {
            const { partnerName, status } = call.args as any;
            const partner = findPartnerByName(partnerName);

            if (partner) {
              await updatePartner(partner.id, { status: status as any });
              functionResponses.push({
                functionResponse: { name: call.name, response: { result: 'Estado del cliente actualizado con exito.' } },
              });
            } else {
              functionResponses.push({
                functionResponse: { name: call.name, response: { error: 'Cliente no encontrado.' } },
              });
            }
          }
        }

        response = await chatRef.current.sendMessage({ message: functionResponses as any });
        functionCalls = response.functionCalls;
        functionResponses = [];
      }

      if (response.text) {
        setMessages((prev) => [...prev, { role: 'model', text: response.text || '' }]);
      }
    } catch (error) {
      console.error('Error calling Gemini:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Lo siento, ha ocurrido un error al procesar tu solicitud.' },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotifyMe = () => {
    toast.success('Listo. Te avisaremos en cuanto Efi IA esté disponible.');
    setIsOpen(false);
  };

  const panelGradient =
    'bg-[radial-gradient(circle_at_top_left,rgba(201,111,91,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,243,0.96))]';
  const messageBase =
    'max-w-[88%] rounded-[1rem] px-4 py-3.5 text-sm leading-6 shadow-[0_12px_24px_-22px_rgba(63,43,33,0.25)]';

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
          {!isAiAvailable ? (
            isDesktop ? (
              <span className="ml-1 rounded-full border border-[color:var(--line-soft)] bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
                Pronto
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 flex h-5 items-center rounded-full border border-white bg-[var(--text-primary)] px-1.5 text-[9px] font-bold tracking-[0.12em] text-white uppercase shadow-[0_6px_14px_-8px_rgba(63,43,33,0.45)]">
                Pronto
              </span>
            )
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
                    <StatusBadge tone="accent" className="shrink-0">
                      {isAiAvailable ? 'Workspace' : 'Beta pronto'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    {isAiAvailable
                      ? 'Asistencia contextual para tareas, marcas y contactos'
                      : 'Tu asistente IA llegará en una próxima actualización'}
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

            {!isAiAvailable ? (
              <div className="relative flex-1 overflow-y-auto px-5 py-6">
                <div className="space-y-5">
                  <div className="flex flex-col items-center text-center">
                    <img
                      src="/brand/isotipo.png?v=2"
                      alt=""
                      draggable={false}
                      width={64}
                      height={64}
                      className="h-16 w-16 select-none"
                    />
                    <StatusBadge tone="accent" className="mt-4">
                      Próximamente
                    </StatusBadge>
                    <h4 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                      Efi IA está en camino
                    </h4>
                    <p className="mt-2 max-w-[22rem] text-sm leading-6 text-[var(--text-secondary)]">
                      Tu asistente personal para mover tareas, crear marcas y responder al instante sin salir del workspace. Estamos puliendo los últimos detalles.
                    </p>
                  </div>

                  <ul className="space-y-2.5">
                    {[
                      {
                        icon: <CheckSquare size={16} weight="bold" />,
                        title: 'Crea y mueve tareas por voz',
                        desc: 'Dicta una tarea y Efi la suma al pipeline con marca, valor y fecha.',
                      },
                      {
                        icon: <Lightning size={16} weight="bold" />,
                        title: 'Suma marcas y contactos al vuelo',
                        desc: 'Pídele que registre una marca nueva o un contacto y listo.',
                      },
                      {
                        icon: <Sparkle size={16} weight="bold" />,
                        title: 'Respuestas con contexto real',
                        desc: 'Consulta estados, plantillas o cifras de tu propio workspace.',
                      },
                    ].map((item) => (
                      <li
                        key={item.title}
                        className="flex items-start gap-3 rounded-[1.1rem] border border-[color:var(--line-soft)] bg-white/80 px-4 py-3"
                      >
                        <div
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem]"
                          style={{
                            background: accentGradient,
                            color: 'var(--accent-foreground)',
                          }}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
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
                      <span className="text-xs font-medium">Efi esta pensando...</span>
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>
            )}

            {!isAiAvailable ? (
              <div className="relative border-t border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,244,239,0.98))] p-4">
                <button
                  type="button"
                  onClick={handleNotifyMe}
                  className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] px-4 py-3 text-sm font-bold shadow-[0_16px_32px_-22px_var(--accent-glow)] transition-transform active:scale-[0.99]"
                  style={{
                    background: accentGradient,
                    color: 'var(--accent-foreground)',
                  }}
                >
                  <Bell size={16} weight="bold" />
                  Avísame cuando esté listo
                </button>
                <p className="mt-2 text-center text-[11px] text-[var(--text-secondary)]">
                  Te escribiremos en cuanto abramos el acceso.
                </p>
              </div>
            ) : (
            <div className="relative border-t border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,244,239,0.98))] p-4">
              <div className="flex items-center gap-2 rounded-[1.1rem] border border-[color:var(--line-soft)] bg-white/88 p-1.5 shadow-[0_16px_28px_-28px_rgba(63,43,33,0.2)] focus-within:border-[color:var(--accent-color)] focus-within:bg-white">
                {'SpeechRecognition' in window || 'webkitSpeechRecognition' in window ? (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-[0.9rem] transition-colors',
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
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void handlePaperPlaneRight()}
                  placeholder="Escribe o habla con Efi..."
                  className="flex-1 border-none bg-transparent px-2 text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => void handlePaperPlaneRight()}
                  disabled={!input.trim() || isProcessing}
                  className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] transition-transform active:scale-95 disabled:opacity-50"
                  style={{
                    background: accentGradient,
                    color: 'var(--accent-foreground)',
                  }}
                >
                  <PaperPlaneRight size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
