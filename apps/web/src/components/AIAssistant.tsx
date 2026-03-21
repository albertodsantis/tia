import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Loader2, Mic, MicOff, Send, Sparkles, X } from 'lucide-react';
import { TaskStatus } from '@shared/domain';
import { useAppContext } from '../context/AppContext';

const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export default function AIAssistant({ isDesktop = false }: { isDesktop?: boolean }) {
  const {
    tasks,
    partners,
    profile,
    templates,
    accentColor,
    addTask,
    addPartner,
    updateTaskStatus,
    addContact,
    updatePartner,
  } = useAppContext();
  const isAiAvailable = Boolean(ai);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: '¡Hola! Soy Tía, tu asistente de inteligencia artificial. ¿En qué puedo ayudarte hoy?',
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
            description: 'Obtiene los datos actuales de la aplicación para responder preguntas sobre tareas, marcas, contactos, perfil y plantillas.',
            parameters: {
              type: Type.OBJECT,
              properties: {},
            },
          },
          {
            name: 'add_task',
            description: 'Añade una nueva tarea al pipeline.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Título de la tarea' },
                description: { type: Type.STRING, description: 'Descripción de la tarea' },
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
                  description: 'Nuevo estado: Pendiente, En Progreso, En Revisión o Completada.',
                },
              },
              required: ['taskId', 'status'],
            },
          },
          {
            name: 'add_partner',
            description: 'Añade una nueva marca o partner al directorio.',
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
            description: 'Añade un nuevo contacto a una marca o partner existente.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                partnerName: { type: Type.STRING, description: 'Nombre de la marca' },
                name: { type: Type.STRING, description: 'Nombre del contacto' },
                role: { type: Type.STRING, description: 'Rol o cargo del contacto' },
                email: { type: Type.STRING, description: 'Correo electrónico del contacto' },
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
            'Eres Tía, un asistente de inteligencia artificial integrado en un CRM para creadores de contenido. Tu objetivo es ayudar al usuario a gestionar sus tareas, marcas, contactos, plantillas y perfil. Sé concisa, útil, amable y profesional. Responde siempre en español.',
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

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!chatRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'El asistente IA no está disponible todavía. Configura GEMINI_API_KEY para activarlo.',
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
            let partnerId = partners.find((partner) => partner.name.toLowerCase() === partnerName.toLowerCase())?.id;

            if (!partnerId) {
              partnerId = await addPartner({ name: partnerName, status: 'Prospecto', contacts: [] });
            }

            await addTask({
              title,
              description: description || '',
              partnerId,
              value: Number(value),
              dueDate,
              status: 'Pendiente',
            });

            functionResponses.push({
              functionResponse: { name: call.name, response: { result: 'Tarea añadida con éxito.' } },
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
              functionResponse: { name: call.name, response: { result: 'Marca añadida con éxito.' } },
            });
          } else if (call.name === 'add_contact') {
            const { partnerName, name, role, email, ig } = call.args as any;
            let partnerId = partners.find((partner) => partner.name.toLowerCase() === partnerName.toLowerCase())?.id;

            if (!partnerId) {
              partnerId = await addPartner({ name: partnerName, status: 'Prospecto', contacts: [] });
            }

            await addContact(partnerId, { name, role: role || '', email: email || '', ig: ig || '' });
            functionResponses.push({
              functionResponse: { name: call.name, response: { result: 'Contacto añadido con éxito.' } },
            });
          } else if (call.name === 'update_partner_status') {
            const { partnerName, status } = call.args as any;
            const partner = partners.find((item) => item.name.toLowerCase() === partnerName.toLowerCase());

            if (partner) {
              await updatePartner(partner.id, { status: status as any });
              functionResponses.push({
                functionResponse: { name: call.name, response: { result: 'Estado de la marca actualizado con éxito.' } },
              });
            } else {
              functionResponses.push({
                functionResponse: { name: call.name, response: { error: 'Marca no encontrada.' } },
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

  if (!isAiAvailable) {
    return null;
  }

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
          id="tia-assistant-btn"
          type="button"
          onClick={() => setIsOpen(true)}
          className={
            isDesktop
              ? 'group flex h-12 items-center gap-2.5 rounded-[1rem] border border-white/60 bg-slate-900/92 px-3 pr-4 text-white shadow-[0_16px_40px_-18px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 dark:border-slate-700/60'
              : 'group flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-slate-900/92 text-white shadow-[0_18px_45px_-18px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 dark:border-slate-700/60'
          }
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[0.8rem]"
            style={{
              backgroundColor: accentColor || '#8b5cf6',
              color: 'var(--accent-foreground)',
            }}
          >
            <Sparkles size={14} />
          </div>
          {isDesktop ? (
            <div className="text-left">
              <p className="text-[11px] font-bold tracking-[0.16em] text-white/70 uppercase">Asistente</p>
              <p className="text-sm font-bold">Tía</p>
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
            className="fixed inset-0 z-[100] bg-slate-950/42 backdrop-blur-[2px]"
          />

          <div
            className={`z-[110] flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300 dark:border-slate-700 dark:bg-slate-900 ${
              isDesktop
                ? 'fixed right-6 bottom-24 h-[min(560px,calc(100dvh-8rem))] w-[min(420px,calc(100vw-2rem))] rounded-[1.35rem]'
                : 'fixed inset-x-3 top-[max(env(safe-area-inset-top,0px)+0.75rem,0.75rem)] bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] rounded-[1.5rem]'
            }`}
          >
            <div
              className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-4"
              style={{
                backgroundColor: accentColor || '#8b5cf6',
                color: 'var(--accent-foreground)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/10">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Tía</h3>
                  <p className="text-[11px] opacity-80">Asistente integrada del workspace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/10 transition-colors hover:bg-black/15"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/80 p-5 dark:bg-slate-950/40">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-[1rem] px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-tr-[0.35rem] bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'rounded-tl-[0.35rem] border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {isProcessing ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-[1rem] rounded-tl-[0.35rem] border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-medium">Tía está pensando…</span>
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 p-1.5 focus-within:border-slate-300 focus-within:bg-white dark:border-slate-700 dark:bg-slate-950/50 dark:focus-within:bg-slate-900">
                {'SpeechRecognition' in window || 'webkitSpeechRecognition' in window ? (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      isListening
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                  </button>
                ) : null}

                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void handleSend()}
                  placeholder="Escribe o habla con Tía..."
                  className="flex-1 border-none bg-transparent px-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                />

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isProcessing}
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: accentColor || '#8b5cf6',
                    color: 'var(--accent-foreground)',
                  }}
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
