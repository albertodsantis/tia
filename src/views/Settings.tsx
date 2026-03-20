import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Bell, Calendar as CalendarIcon, Shield, LogOut, Check, MessageSquare, Plus, Trash2, ChevronDown, Moon, Sun } from 'lucide-react';
import { HexColorPicker } from "react-colorful";

export default function Settings() {
  const { accentColor, setAccentColor, profile, updateProfile, templates, addTemplate, deleteTemplate, theme, setTheme } = useAppContext();
  const [gcalConnected, setGcalConnected] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '' });
  const [hexInput, setHexInput] = useState(accentColor.replace('#', '').toUpperCase());

  useEffect(() => {
    setHexInput(accentColor.replace('#', '').toUpperCase());
  }, [accentColor]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace('#', '').toUpperCase();
    setHexInput(val);
    if (val.length === 6) {
      setAccentColor('#' + val);
    }
  };

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setGcalConnected(data.connected))
      .catch(err => console.error('Failed to fetch gcal status', err));
  }, []);

  const toggleNotifications = async () => {
    if (!profile.notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          updateProfile({ notificationsEnabled: true });
        } else {
          alert('Debes permitir las notificaciones en tu navegador.');
        }
      } else {
        alert('Tu navegador no soporta notificaciones.');
      }
    } else {
      updateProfile({ notificationsEnabled: false });
    }
  };

  const connectGoogleCalendar = async () => {
    if (gcalConnected) {
      await fetch('/api/auth/logout', { method: 'POST' });
      setGcalConnected(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          setGcalConnected(true);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    addTemplate(newTemplate);
    setIsAddingTemplate(false);
    setNewTemplate({ name: '', subject: '', body: '' });
  };

  return (
    <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 mt-2 tracking-tight">Configuración</h1>

      <div className="mb-10">
        <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 ml-2">Tema de la App</h2>
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden custom-color-picker-container">
          <HexColorPicker color={accentColor} onChange={setAccentColor} />
          
          <div className="p-5 pt-0">
            <div className="flex items-center gap-3 mt-5">
              <div className="flex items-center justify-between bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-[15px] font-bold text-gray-700 dark:text-gray-200 shadow-sm w-28">
                <span>Hex</span>
                <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
              </div>
              <input 
                type="text"
                value={hexInput}
                onChange={handleHexChange}
                maxLength={6}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-[15px] font-bold text-gray-700 dark:text-gray-200 shadow-sm flex-1 text-center focus:outline-none focus:ring-2 uppercase tracking-wider"
                style={{ '--tw-ring-color': accentColor } as any}
              />
              <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-[15px] font-bold text-gray-700 dark:text-gray-200 shadow-sm w-24 text-center">
                100%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 ml-2">Ajustes Generales</h2>
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-slate-700/50 active:bg-gray-50 dark:active:bg-slate-700/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">Modo Oscuro</span>
            </div>
            <div className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${theme === 'dark' ? '' : 'bg-gray-200 dark:bg-slate-600'}`} style={theme === 'dark' ? { backgroundColor: accentColor } : {}}>
              <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-all ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </div>

          <div onClick={toggleNotifications} className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-slate-700/50 active:bg-gray-50 dark:active:bg-slate-700/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <Bell size={20} />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">Notificaciones Push</span>
            </div>
            <div className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${profile.notificationsEnabled ? '' : 'bg-gray-200 dark:bg-slate-600'}`} style={profile.notificationsEnabled ? { backgroundColor: accentColor } : {}}>
              <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-all ${profile.notificationsEnabled ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </div>

          <div onClick={connectGoogleCalendar} className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-slate-700/50 active:bg-gray-50 dark:active:bg-slate-700/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <CalendarIcon size={20} />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">Sincronizar Calendar</span>
            </div>
            <div className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${gcalConnected ? '' : 'bg-gray-200 dark:bg-slate-600'}`} style={gcalConnected ? { backgroundColor: accentColor } : {}}>
              <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-all ${gcalConnected ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 active:bg-gray-50 dark:active:bg-slate-700/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <Shield size={20} />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">Privacidad y Seguridad</span>
            </div>
            <span className="text-gray-300 dark:text-gray-600 font-bold text-xl">›</span>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="flex justify-between items-center mb-4 ml-2 pr-2">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plantillas de Mensajes</h2>
          <button onClick={() => setIsAddingTemplate(true)} className="text-gray-500 hover:text-gray-900 transition-colors">
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-3">
          {templates.map(template => (
            <div key={template.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{template.name}</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">{template.subject}</p>
                </div>
              </div>
              <button onClick={() => deleteTemplate(template.id)} className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4 bg-white rounded-2xl border border-gray-100 border-dashed">No hay plantillas.</p>
          )}
        </div>
      </div>

      <button className="w-full py-4 rounded-2xl font-bold text-rose-500 bg-rose-50 flex items-center justify-center gap-2 transition-colors hover:bg-rose-100 active:scale-[0.98]">
        <LogOut size={20} strokeWidth={2.5} />
        Cerrar Sesión
      </button>

      {/* Add Template Modal */}
      {isAddingTemplate && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:rounded-3xl rounded-t-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva Plantilla</h2>
              <button onClick={() => setIsAddingTemplate(false)} className="text-gray-400 p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">✕</button>
            </div>
            <form onSubmit={handleAddTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre de la Plantilla</label>
                <input required value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Ej. Primer Contacto" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asunto</label>
                <input required value={newTemplate.subject} onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Usa {{brandName}}, {{creatorName}}" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cuerpo del Mensaje</label>
                <textarea required value={newTemplate.body} onChange={e => setNewTemplate({...newTemplate, body: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all min-h-[120px]" style={{ '--tw-ring-color': accentColor } as any} placeholder="Hola {{contactName}}..." />
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Variables: {'{{brandName}}, {{contactName}}, {{creatorName}}, {{deliverable}}'}</p>
              </div>
              <button type="submit" className="w-full text-white font-bold py-4 rounded-2xl mt-2 transition-opacity hover:opacity-90 active:scale-[0.98] shadow-md" style={{ backgroundColor: accentColor }}>
                Guardar Plantilla
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
