/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Home, LayoutDashboard, Users, User, Settings as SettingsIcon } from 'lucide-react';
import Dashboard from './views/Dashboard';
import Pipeline from './views/Pipeline';
import Directory from './views/Directory';
import Profile from './views/Profile';
import Settings from './views/Settings';
import AIAssistant from './components/AIAssistant';

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { accentColor } = useAppContext();

  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Inicio' },
    { id: 'pipeline', icon: LayoutDashboard, label: 'Pipeline' },
    { id: 'directory', icon: Users, label: 'Directorio' },
    { id: 'profile', icon: User, label: 'Perfil' },
    { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
  ];

  return (
    <div className="flex justify-center bg-slate-100 dark:bg-slate-900 min-h-screen sm:p-6 font-sans transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 sm:rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col relative transition-colors duration-300" style={{ height: '100dvh', maxHeight: '900px' }}>
        
        {/* Soft Background Gradient */}
        <div 
          className="absolute top-0 left-0 right-0 h-80 opacity-60 pointer-events-none transition-colors duration-700" 
          style={{ background: `linear-gradient(to bottom right, ${accentColor}33, ${accentColor}11, transparent)` }}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-28 hide-scrollbar relative z-10">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'pipeline' && <Pipeline />}
          {activeTab === 'directory' && <Directory />}
          {activeTab === 'profile' && <Profile />}
          {activeTab === 'settings' && <Settings />}
        </div>
        
        <AIAssistant />

        {/* Bottom Navigation */}
        <div className="absolute bottom-6 left-6 right-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 flex justify-around py-4 px-4 z-50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors duration-300">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center w-14 gap-1.5 transition-all duration-300 active:scale-90 relative ${isActive ? '' : 'text-slate-300 dark:text-slate-500'}`}
                style={isActive ? { color: accentColor } : {}}
              >
                {isActive && (
                  <div className="absolute -top-3 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                )}
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'transform -translate-y-0.5 transition-transform' : 'transition-transform'} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
