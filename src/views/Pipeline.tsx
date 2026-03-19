import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List as ListIcon, Trello, RefreshCw, CheckCircle2, DownloadCloud } from 'lucide-react';
import { TaskStatus, Task } from '../types';

const STATUSES: TaskStatus[] = ['En Negociación', 'Producción', 'Revisión', 'Cobro'];

export default function Pipeline() {
  const { tasks, partners, accentColor, addTask, addPartner, updateTask } = useAppContext();
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [currentStatusIdx, setCurrentStatusIdx] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [isSyncingDown, setIsSyncingDown] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // New Task State
  const [newTask, setNewTask] = useState({ title: '', description: '', partnerName: '', value: '', dueDate: '' });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    let partnerId = partners.find(p => p.name.toLowerCase() === newTask.partnerName.toLowerCase())?.id;

    if (!partnerId) {
      partnerId = addPartner({ name: newTask.partnerName, status: 'En Negociación', contacts: [] });
    }

    addTask({
      title: newTask.title,
      description: newTask.description,
      partnerId,
      status: STATUSES[currentStatusIdx],
      dueDate: newTask.dueDate || new Date().toISOString().split('T')[0],
      value: Number(newTask.value) || 0,
    });

    setIsAdding(false);
    setNewTask({ title: '', description: '', partnerName: '', value: '', dueDate: '' });
  };

  const syncToCalendar = async (task: Task) => {
    setSyncingTaskId(task.id);
    try {
      const partner = partners.find(p => p.id === task.partnerId);
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: { ...task, partnerName: partner?.name } })
      });
      
      if (response.ok) {
        const data = await response.json();
        updateTask(task.id, { gcalEventId: data.eventId });
      } else {
        alert('Error al sincronizar. ¿Conectaste tu cuenta en Ajustes?');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setSyncingTaskId(null);
    }
  };

  const syncDownFromCalendar = async () => {
    setIsSyncingDown(true);
    try {
      const eventIds = tasks.filter(t => t.gcalEventId).map(t => t.gcalEventId);
      if (eventIds.length === 0) {
        setIsSyncingDown(false);
        return;
      }

      const response = await fetch('/api/calendar/sync-down', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.updatedEvents) {
          data.updatedEvents.forEach((updatedEvent: any) => {
            const task = tasks.find(t => t.gcalEventId === updatedEvent.eventId);
            if (task && task.dueDate !== updatedEvent.dueDate) {
              updateTask(task.id, { dueDate: updatedEvent.dueDate });
            }
          });
        }
      } else {
        alert('Error al sincronizar desde Google Calendar.');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión al sincronizar.');
    } finally {
      setIsSyncingDown(false);
    }
  };

  const currentStatus = STATUSES[currentStatusIdx];
  const columnTasks = tasks.filter(t => t.status === currentStatus);

  // Calendar Logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Tabs */}
      <div className="p-6 pb-2 bg-gray-50 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-6 mt-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pipeline</h1>
          <div className="flex gap-2">
            <button
              onClick={syncDownFromCalendar}
              disabled={isSyncingDown}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white text-gray-600 shadow-sm border border-gray-200 transition-transform active:scale-95 disabled:opacity-50"
              title="Sincronizar desde Google Calendar"
            >
              <DownloadCloud size={20} className={isSyncingDown ? "animate-bounce" : ""} />
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={28} />
            </button>
          </div>
        </div>

        <div className="flex bg-gray-200/60 p-1.5 rounded-2xl mb-4">
          {[
            { id: 'kanban', icon: Trello, label: 'Kanban' },
            { id: 'list', icon: ListIcon, label: 'Lista' },
            { id: 'calendar', icon: CalendarIcon, label: 'Mes' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${view === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <t.icon size={18} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto hide-scrollbar">
        {view === 'kanban' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
              <button
                onClick={() => setCurrentStatusIdx(Math.max(0, currentStatusIdx - 1))}
                disabled={currentStatusIdx === 0}
                className="p-3 text-gray-400 disabled:opacity-30 active:scale-90 transition-transform"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-center flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fase {currentStatusIdx + 1} de {STATUSES.length}</span>
                <h2 className="text-lg font-bold" style={{ color: accentColor }}>{currentStatus}</h2>
              </div>
              <button
                onClick={() => setCurrentStatusIdx(Math.min(STATUSES.length - 1, currentStatusIdx + 1))}
                disabled={currentStatusIdx === STATUSES.length - 1}
                className="p-3 text-gray-400 disabled:opacity-30 active:scale-90 transition-transform"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {columnTasks.map(task => {
                const partner = partners.find(p => p.id === task.partnerId);
                return (
                  <div key={task.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">
                        {partner?.name}
                      </span>
                      <span className="text-sm font-black text-gray-900">${task.value.toLocaleString()}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1.5 text-lg leading-tight">{task.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 font-medium">{task.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <CalendarIcon size={14} />
                        {new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <button 
                        onClick={() => syncToCalendar(task)}
                        disabled={syncingTaskId === task.id}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors ${task.gcalEventId ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                        {syncingTaskId === task.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : task.gcalEventId ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <CalendarIcon size={12} />
                        )}
                        {task.gcalEventId ? 'Sincronizado' : 'Sync'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {columnTasks.length === 0 && (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50">
                  <p className="font-medium">No hay tareas en esta fase</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="space-y-3">
            {tasks.map(task => {
              const partner = partners.find(p => p.id === task.partnerId);
              return (
                <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{task.title}</h3>
                      <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">{partner?.name || 'Sin Marca'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-gray-900 block">${task.value.toLocaleString()}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md mt-1.5 inline-block ${
                        task.status === 'Completado' ? 'bg-emerald-50 text-emerald-600' :
                        task.status === 'Producción' ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 font-medium">{task.description}</p>
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <CalendarIcon size={14} />
                      {new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <button 
                      onClick={() => syncToCalendar(task)}
                      disabled={syncingTaskId === task.id}
                      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors ${task.gcalEventId ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      {syncingTaskId === task.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : task.gcalEventId ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <CalendarIcon size={12} />
                      )}
                      {task.gcalEventId ? 'Sincronizado' : 'Sync'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'calendar' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-gray-900 capitalize">
                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={nextMonth} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="aspect-square p-1" />;
                
                const dateString = date.toISOString().split('T')[0];
                const dayTasks = tasks.filter(t => t.dueDate === dateString);
                const isToday = dateString === new Date().toISOString().split('T')[0];
                
                return (
                  <div 
                    key={dateString} 
                    onClick={() => dayTasks.length > 0 && setSelectedDate(dateString)}
                    className={`aspect-square p-1 flex flex-col rounded-xl border transition-colors ${isToday ? 'border-gray-300 bg-gray-50' : 'border-transparent hover:border-gray-100'} ${dayTasks.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <span className={`text-xs font-bold mb-1 ${isToday ? 'text-gray-900' : 'text-gray-500'} ${dayTasks.length > 0 ? 'w-5 h-5 flex items-center justify-center rounded-full text-white' : ''}`} style={dayTasks.length > 0 ? { backgroundColor: accentColor } : {}}>
                      {date.getDate()}
                    </span>
                    <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
                      {dayTasks.map(task => (
                        <div key={task.id} className="w-full h-1.5 rounded-full bg-gray-300" title={task.title} style={{ backgroundColor: task.gcalEventId ? '#10b981' : accentColor, opacity: 0.7 }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {selectedDate && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:rounded-3xl rounded-t-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {new Date(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">✕</button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {tasks.filter(t => t.dueDate === selectedDate).map(task => {
                const partner = partners.find(p => p.id === task.partnerId);
                return (
                  <div key={task.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{task.title}</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{partner?.name || 'Sin Marca'}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                        task.status === 'Completado' ? 'bg-emerald-100 text-emerald-700' :
                        task.status === 'Producción' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mb-3">{task.description}</p>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => syncToCalendar(task)}
                        disabled={syncingTaskId === task.id}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors ${task.gcalEventId ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {syncingTaskId === task.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : task.gcalEventId ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <CalendarIcon size={12} />
                        )}
                        {task.gcalEventId ? 'Sincronizado' : 'Sync'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAdding && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:rounded-3xl rounded-t-[2rem] p-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva Tarea</h2>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">✕</button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Título</label>
                <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Ej. Reel de TikTok" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Partner / Marca</label>
                <input required value={newTask.partnerName} onChange={e => setNewTask({...newTask, partnerName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="Ej. Nike (Se creará si no existe)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Valor ($)</label>
                  <input type="number" required value={newTask.value} onChange={e => setNewTask({...newTask, value: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': accentColor } as any} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha</label>
                  <input type="date" required value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all text-gray-700" style={{ '--tw-ring-color': accentColor } as any} />
                </div>
              </div>
              <button type="submit" className="w-full text-white font-bold py-4 rounded-2xl mt-4 transition-opacity hover:opacity-90 active:scale-[0.98] shadow-md" style={{ backgroundColor: accentColor }}>
                Crear Tarea
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
