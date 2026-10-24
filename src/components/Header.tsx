import React from 'react';
import { 
  Menu,
  MoreVertical,
  Filter,
  Plus,
  Save
} from 'lucide-react';
import { ManagerProfile } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';

export type ActiveTab = 'lancamentos' | 'calendario' | 'perfil';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onBackToSplash: () => void;
  onOpenSidebar: () => void;
  onAddRecord?: () => void;
  onSaveData?: () => void;
  onOpenEmployeeFilter?: () => void;
  selectedEmployee?: string;
  profile: ManagerProfile;
  trashCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onBackToSplash,
  onOpenSidebar,
  onAddRecord,
  onSaveData,
  onOpenEmployeeFilter,
  selectedEmployee,
  profile,
}) => {
  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;
  const hasActiveEmployeeFilter = selectedEmployee && selectedEmployee !== 'todos';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Left: Hamburger Sidebar Toggle + Title "Controle de Horas Extra" */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              type="button"
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95 flex items-center justify-center"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={onBackToSplash}
              type="button"
              className="flex items-center gap-2.5 group text-left cursor-pointer transition focus:outline-none"
              title="Voltar para a tela de abertura"
            >
              <div>
                <span className="font-black text-slate-900 dark:text-white text-base tracking-tight block leading-tight">
                  Controle de Horas Extra
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  {profile.name || 'Gestão da Equipe'}
                </span>
              </div>
            </button>
          </div>

          {/* Right: Employee Filter Button + Lançar HE Button */}
          <div className="flex items-center gap-2">
            {onOpenEmployeeFilter && (
              <button
                type="button"
                onClick={onOpenEmployeeFilter}
                className={`relative p-2.5 rounded-2xl border transition cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  hasActiveEmployeeFilter
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={hasActiveEmployeeFilter ? `Filtrado por: ${selectedEmployee}` : 'Filtrar por funcionário'}
              >
                <Filter className="w-4 h-4" />
                <MoreVertical className="w-4 h-4 -ml-1" />
                {hasActiveEmployeeFilter && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            )}

            {onSaveData && (
              <button
                type="button"
                onClick={onSaveData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                title="Salvar dados e baixar backup com data e hora"
              >
                <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Salvar Dados</span>
                <span className="sm:hidden">Salvar</span>
              </button>
            )}

            {onAddRecord && (
              <button
                type="button"
                onClick={onAddRecord}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-md transition cursor-pointer active:scale-95 shrink-0 ${themeConfig.bgButton}`}
                title="Lançar Nova Hora Extra"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Lançar HE</span>
                <span className="sm:hidden">Novo</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};

