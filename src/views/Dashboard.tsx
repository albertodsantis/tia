import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar, DollarSign, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { profile, tasks, partners, accentColor } = useAppContext();

  const activePipelineValue = tasks
    .filter(t => t.status !== 'Cobro')
    .reduce((sum, t) => sum + t.value, 0);

  const tasksToday = tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).length;

  const upcomingTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 4);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mt-4">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">Good morning,</p>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{profile.name.split(' ')[0]}</h1>
        </div>
        <img src={profile.avatar} alt="Avatar" className="w-14 h-14 rounded-full border-4 border-white shadow-sm object-cover" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col gap-4">
          <div className="p-3 rounded-full w-fit" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">Active Pipeline</p>
            <p className="text-2xl font-extrabold text-slate-800">${activePipelineValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col gap-4">
          <div className="p-3 rounded-full w-fit" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">Tasks Today</p>
            <p className="text-2xl font-extrabold text-slate-800">{tasksToday}</p>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold text-slate-800">Upcoming Deliverables</h2>
        </div>
        <div className="space-y-4">
          {upcomingTasks.map(task => {
            const partner = partners.find(p => p.id === task.partnerId);
            return (
              <div key={task.id} className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-white/60 flex items-center gap-4 transition-transform active:scale-95">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                  {partner?.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base truncate mb-0.5">{task.title}</h3>
                  <p className="text-xs text-slate-400 font-semibold truncate">{partner?.name} • {task.status}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {new Date(task.dueDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                  </span>
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center">
                    {task.status === 'Cobro' && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />}
                  </div>
                </div>
              </div>
            );
          })}
          {upcomingTasks.length === 0 && (
            <p className="text-sm text-slate-400 font-medium text-center py-8 bg-white/50 rounded-[2rem] border border-white/60 border-dashed">No upcoming deliverables.</p>
          )}
        </div>
      </div>
    </div>
  );
}
