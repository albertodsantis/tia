import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { MessageSquare, X, Send, Mic, MicOff, Loader2, Bot, Sparkles } from 'lucide-react';
import { TaskStatus } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function AIAssistant() {
  const { tasks, partners, profile, templates, accentColor, addTask, addPartner, updateTaskStatus, addContact, updatePartner } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: '¡Hola! Soy TIA, tu asistente de inteligencia artificial. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
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

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const tools: { functionDeclarations: FunctionDeclaration[] }[] = [
    {
      functionDeclarations: [
        {
          name: 'get_app_data',
          description: 'Obtiene todos los datos actuales de la aplicación (tareas, marcas/partners, perfil, plantillas). Úsalo para responder preguntas sobre la información almacenada.',
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
              status: { type: Type.STRING, description: 'Nuevo estado (Pendiente, En Progreso, En Revisión, Completada)' },
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
              status: { type: Type.STRING, description: 'Estado de la marca (Prospecto, Activo, En Negociación, Inactivo)' },
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
              partnerName: { type: Type.STRING, description: 'Nombre de la marca a la que pertenece el contacto' },
              name: { type: Type.STRING, description: 'Nombre del contacto' },
              role: { type: Type.STRING, description: 'Rol o cargo del contacto' },
              email: { type: Type.STRING, description: 'Correo electrónico del contacto' },
              ig: { type: Type.STRING, description: 'Usuario de Instagram del contacto (sin @)' },
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
              status: { type: Type.STRING, description: 'Nuevo estado (Prospecto, Activo, En Negociación, Inactivo, On Hold, Relación Culminada)' },
            },
            required: ['partnerName', 'status'],
          },
        },
      ],
    },
  ];

  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: 'Eres TIA, un asistente de inteligencia artificial integrado en un CRM para creadores de contenido. Tu objetivo es ayudar al usuario a gestionar sus tareas, marcas (partners), contactos y perfil. Puedes consultar la información actual y realizar acciones como añadir tareas o marcas. Sé conciso, amigable y profesional. Responde siempre en español.',
          tools: tools,
        },
      });
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
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
                response: { result: { tasks, partners, profile, templates } }
              }
            });
          } else if (call.name === 'add_task') {
            const { title, description, partnerName, value, dueDate } = call.args as any;
            let partnerId = partners.find(p => p.name.toLowerCase() === partnerName.toLowerCase())?.id;
            if (!partnerId) {
              partnerId = addPartner({ name: partnerName, status: 'Prospecto', contacts: [] });
            }
            addTask({ title, description: description || '', partnerId, value: Number(value), dueDate, status: 'Pendiente' });
            functionResponses.push({ functionResponse: { name: call.name, response: { result: 'Tarea añadida con éxito' } } });
          } else if (call.name === 'update_task_status') {
            const { taskId, status } = call.args as any;
            updateTaskStatus(taskId, status as TaskStatus);
            functionResponses.push({ functionResponse: { name: call.name, response: { result: 'Estado actualizado' } } });
          } else if (call.name === 'add_partner') {
            const { name, status } = call.args as any;
            addPartner({ name, status: status || 'Prospecto', contacts: [] });
            functionResponses.push({ functionResponse: { name: call.name, response: { result: 'Marca añadida con éxito' } } });
          } else if (call.name === 'add_contact') {
            const { partnerName, name, role, email, ig } = call.args as any;
            let partnerId = partners.find(p => p.name.toLowerCase() === partnerName.toLowerCase())?.id;
            if (!partnerId) {
              partnerId = addPartner({ name: partnerName, status: 'Prospecto', contacts: [] });
            }
            addContact(partnerId, { name, role: role || '', email: email || '', ig: ig || '' });
            functionResponses.push({ functionResponse: { name: call.name, response: { result: 'Contacto añadido con éxito' } } });
          } else if (call.name === 'update_partner_status') {
            const { partnerName, status } = call.args as any;
            const partner = partners.find(p => p.name.toLowerCase() === partnerName.toLowerCase());
            if (partner) {
              updatePartner(partner.id, { status: status as any });
              functionResponses.push({ functionResponse: { name: call.name, response: { result: 'Estado de la marca actualizado con éxito' } } });
            } else {
              functionResponses.push({ functionResponse: { name: call.name, response: { error: 'Marca no encontrada' } } });
            }
          }
        }

        response = await chatRef.current.sendMessage({ message: functionResponses as any });
        functionCalls = response.functionCalls;
        functionResponses = [];
      }

      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
      }

    } catch (error) {
      console.error('Error calling Gemini:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, ha ocurrido un error al procesar tu solicitud.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Button (Interactive Island) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`absolute bottom-[88px] left-1/2 -translate-x-1/2 h-14 pl-2 pr-6 rounded-full flex items-center gap-3 text-white transition-all duration-500 hover:scale-105 active:scale-95 z-40 group ${isOpen ? 'opacity-0 pointer-events-none translate-y-4 scale-90' : 'opacity-100 translate-y-0 scale-100'}`}
        style={{
          background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid rgba(255,255,255,0.15)`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${accentColor || '#8b5cf6'}40`
        }}
      >
        {/* Glowing orb */}
        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-inner">
          <div className="absolute inset-0 animate-[spin_4s_linear_infinite] opacity-80" style={{ background: `conic-gradient(from 0deg, transparent, ${accentColor || '#8b5cf6'}, transparent)` }} />
          <div className="absolute inset-[2px] bg-slate-900 rounded-full flex items-center justify-center z-10">
            <Sparkles size={16} style={{ color: accentColor || '#8b5cf6' }} className="animate-pulse" />
          </div>
          <div className="absolute inset-0 blur-md z-0" style={{ backgroundColor: accentColor || '#8b5cf6', opacity: 0.4 }} />
        </div>
        
        <span className="text-sm font-bold tracking-[0.2em] text-white/90 uppercase">TIA</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[380px] h-[500px] max-h-[65vh] bg-white rounded-[2rem] shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-8 fade-in duration-300 origin-bottom">
          {/* Header */}
          <div className="px-5 py-4 text-white flex justify-between items-center relative overflow-hidden" style={{ backgroundColor: accentColor || '#8b5cf6' }}>
            {/* Futuristic background overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden backdrop-blur-sm border border-white/30 shadow-sm">
                <div className="absolute inset-0 animate-[spin_4s_linear_infinite] opacity-60" style={{ background: `conic-gradient(from 0deg, transparent, white, transparent)` }} />
                <div className="absolute inset-[2px] rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor || '#8b5cf6' }}>
                  <Sparkles size={16} className="text-white animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wider">TIA</h3>
                <p className="text-[9px] text-white/90 font-medium uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse shadow-[0_0_5px_rgba(255,255,255,0.8)]"></span>
                  Sistema Activo
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-gray-900 text-white rounded-tr-sm' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-medium">TIA está pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-full p-1.5 border border-gray-200 focus-within:border-gray-300 focus-within:bg-white transition-colors">
              {('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && (
                <button 
                  onClick={toggleListening}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-rose-100 text-rose-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                >
                  {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe o habla con TIA..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-gray-700 placeholder-gray-400"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                style={{ backgroundColor: accentColor || '#8b5cf6' }}
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
