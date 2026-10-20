import React from 'react';
import { 
  Calendar, 
  ListFilter, 
  User 
} from 'lucide-react';
import { ManagerProfile } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { User as FirebaseUser } from 'firebase/auth';

export type ActiveTab = 'lancamentos' | 'calendario' | 'perfil';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onBackToSplash: () => void;
  profile: ManagerProfile;
  cloudUser?: FirebaseUser | null;
  isCloudSyncing?: boolean;
  onOpenReportModal?: () => void;
  onOpenDataModal?: () => void;
  onToggleTheme?: () => void;
  onOpenTrashModal?: () => void;
  trashCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onBackToSplash,
  profile,
  cloudUser,
}) => {
  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToSplash}
              type="button"
              className="flex items-center gap-2.5 group text-left cursor-pointer transition focus:outline-none"
              title="Voltar para a tela de abertura"
            >
              <div className={`w-10 h-10 rounded-2xl ${themeConfig.bgButton} text-white flex items-center justify-center font-black text-sm shadow-md group-hover:scale-105 transition-transform`}>
                <span>HE</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-slate-900 dark:text-white text-base tracking-tight block leading-tight">
                  Controle de Hora Extra
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  {profile.name || 'Gestão da Equipe'}
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('lancamentos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'lancamentos'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Lançamentos</span>
            </button>

            <button
              onClick={() => setActiveTab('calendario')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'calendario'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendário</span>
            </button>

            <button
              onClick={() => setActiveTab('perfil')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span>Perfil do Gestor</span>
            </button>
          </nav>



        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden border-t border-slate-100 dark:border-slate-800 py-2 justify-around gap-1">
          <button
            onClick={() => setActiveTab('lancamentos')}
            className={`flex-1 flex flex-col items-center py-1.5 px-2 rounded-xl text-[11px] font-semibold transition ${
              activeTab === 'lancamentos' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-900/30 font-bold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ListFilter className="w-4 h-4 mb-0.5" />
            <span>Lançamentos</span>
          </button>
          <button
            onClick={() => setActiveTab('calendario')}
            className={`flex-1 flex flex-col items-center py-1.5 px-2 rounded-xl text-[11px] font-semibold transition ${
              activeTab === 'calendario' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-900/30 font-bold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-4 h-4 mb-0.5" />
            <span>Calendário</span>
          </button>
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex-1 flex flex-col items-center py-1.5 px-2 rounded-xl text-[11px] font-semibold transition relative ${
              activeTab === 'perfil' ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-900/30 font-bold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="relative">
              <User className="w-4 h-4 mb-0.5" />
              {cloudUser && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </div>
            <span>Perfil</span>
          </button>
        </div>

      </div>
    </header>
  );
};
