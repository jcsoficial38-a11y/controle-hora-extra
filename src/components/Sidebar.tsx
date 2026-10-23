import React from 'react';
import { 
  ListFilter, 
  Calendar, 
  User, 
  Shield, 
  Trash2, 
  BarChart3, 
  Palette, 
  X, 
  CheckCircle2,
  FileText,
  Database
} from 'lucide-react';
import { ManagerProfile } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { ActiveTab } from './Header';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  profile: ManagerProfile;
  trashCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  profile,
  trashCount = 0,
}) => {
  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-72 sm:w-80 bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800 animate-slide-right">
        
        {/* Header do Perfil no Topo do Menu Lateral */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-xs" 
                />
              ) : (
                <div className={`w-12 h-12 rounded-full ${themeConfig.lightBg} flex items-center justify-center ${themeConfig.textColor} font-black text-lg shadow-inner border border-blue-200/50`}>
                  <User className="w-6 h-6" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" title="Modo Local Ativo" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {profile.name || 'Gestor(a)'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {profile.email || 'Modo 100% Local'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Navegação (Menu com Ícones Contornados e Pill Shape) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navegação Principal
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('lancamentos');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'lancamentos'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-2 rounded-xl border ${activeTab === 'lancamentos' ? 'border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              <ListFilter className="w-4 h-4" />
            </div>
            <span>Lançamentos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('calendario');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'calendario'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-2 rounded-xl border ${activeTab === 'calendario' ? 'border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <span>Calendário Mensal</span>
          </button>

          {/* Divisor */}
          <div className="pt-3 pb-2">
            <div className="border-t border-slate-100 dark:border-slate-800 mx-3" />
          </div>

          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Configurações e Gestão
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('perfil');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'perfil'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${activeTab === 'perfil' ? 'border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
                <User className="w-4 h-4" />
              </div>
              <span>Perfil & Configurações</span>
            </div>
            {trashCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                {trashCount}
              </span>
            )}
          </button>

        </div>

        {/* Rodapé do Menu Lateral */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Armazenamento 100% Local</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Seguro
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
