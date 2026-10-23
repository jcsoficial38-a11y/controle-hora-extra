import React, { useState, useMemo } from 'react';
import { OvertimeRecord, OvertimeStatus, ManagerProfile } from '../types/overtime';
import { formatDateBr, formatHours } from '../utils/storage';
import { COLOR_THEMES } from '../utils/theme';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft,
  ChevronRight,
  Plus, 
  ArrowUpDown, 
  Clock,
  User,
  X
} from 'lucide-react';

interface OvertimeListProps {
  records: OvertimeRecord[];
  onAddRecord: () => void;
  onEditRecord: (record: OvertimeRecord) => void;
  onDeleteRecord: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenExportModal?: (defaultType?: 'pdf' | 'whatsapp') => void;
  knownEmployees: string[];
  profile: ManagerProfile;
  selectedEmployee: string;
  setSelectedEmployee: (emp: string) => void;
  isEmployeeModalOpen: boolean;
  setIsEmployeeModalOpen: (open: boolean) => void;
}

export const OvertimeList: React.FC<OvertimeListProps> = ({
  records,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  onToggleStatus,
  knownEmployees,
  profile,
  selectedEmployee,
  setSelectedEmployee,
  isEmployeeModalOpen,
  setIsEmployeeModalOpen,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'pendente' | 'pago'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [recordToDelete, setRecordToDelete] = useState<OvertimeRecord | null>(null);

  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const employeeBalances = useMemo(() => {
    const balances = new Map<string, { total: number; pending: number; paid: number }>();
    records.forEach((r) => {
      const cur = balances.get(r.employeeName) || { total: 0, pending: 0, paid: 0 };
      cur.total += r.hours;
      if (r.status === 'pago') cur.paid += r.hours;
      else cur.pending += r.hours;
      balances.set(r.employeeName, cur);
    });
    return balances;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((rec) => {
        const [recYear, recMonth] = rec.date.split('-').map(Number);
        if (selectedMonth !== 0 && recMonth !== selectedMonth) return false;
        if (selectedYear !== 0 && recYear !== selectedYear) return false;

        if (selectedEmployee !== 'todos' && rec.employeeName !== selectedEmployee) return false;

        if (selectedStatus !== 'todos' && rec.status !== selectedStatus) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = rec.employeeName.toLowerCase().includes(q);
          const matchReason = rec.reason ? rec.reason.toLowerCase().includes(q) : false;
          const matchDate = formatDateBr(rec.date).includes(q);
          if (!matchName && !matchReason && !matchDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        return sortOrder === 'asc'
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      });
  }, [records, selectedMonth, selectedYear, selectedEmployee, selectedStatus, searchQuery, sortOrder]);

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      
      {/* Container de Filtros e Organização em Sequência Vertical Exata */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        
        {/* 1º: Linha de Status (Chips Seletores) [ Todos | Pendente | Pago ] */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
            {(['todos', 'pendente', 'pago'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`flex-1 sm:flex-initial px-5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer capitalize ${
                  selectedStatus === st
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'todos' ? 'Todos' : st === 'pendente' ? 'Pendente' : 'Pago'}
              </button>
            ))}
          </div>

          {selectedEmployee !== 'todos' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
              <span>Filtrado por: {selectedEmployee}</span>
              <button
                type="button"
                onClick={() => setSelectedEmployee('todos')}
                className="hover:text-rose-600 cursor-pointer"
                title="Limpar filtro de funcionário"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 2º: Seletor de Mês e Ano [ < Outubro 2026 > ] (Centralizado) */}
        <div className="flex items-center justify-center py-1">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white px-4 min-w-[150px] text-center tracking-tight">
              {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3º: Barra de Pesquisa [ 🔍 Buscar por colaborador, motivo ou data... ] */}
        <div className="relative pt-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por colaborador, motivo ou data..."
            className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4 pointer-events-none" />
        </div>

      </div>

      {/* 4º: Área de Lista (Inicia imediatamente abaixo da barra de pesquisa) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition select-none"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <div className="flex items-center gap-1">
                    <span>Data</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Nome do Funcionário</th>
                <th className="py-3.5 px-4 text-center">Horas Extras</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Saldo Acumulado</th>
                <th className="py-3.5 px-4 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum lançamento encontrado</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Cadastre uma nova hora extra para o período selecionado ou redefina os filtros.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isPaid = rec.status === 'pago';
                  const empBalance = employeeBalances.get(rec.employeeName);
                  const totalEmpHours = empBalance ? empBalance.total : rec.hours;
                  const pendingEmpHours = empBalance ? empBalance.pending : 0;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDateBr(rec.date)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${themeConfig.bgButton}`}>
                            {rec.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{rec.employeeName}</div>
                            {rec.reason && (
                              <div className="text-[11px] font-normal text-slate-400 truncate max-w-xs">
                                {rec.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl font-extrabold text-xs border ${themeConfig.badgeStyle}`}>
                          {formatHours(rec.hours)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(rec.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 border ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                          }`}
                          title="Clique para alternar entre Pendente e Pago"
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Pago</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                            {formatHours(totalEmpHours)}
                          </span>
                          <span className={`text-[10px] font-semibold ${pendingEmpHours > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {pendingEmpHours > 0 ? `(${formatHours(pendingEmpHours)} pend.)` : 'Quitado'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditRecord(rec)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRecordToDelete(rec);
                            }}
                            className="p-2 rounded-xl text-rose-500 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition-all cursor-pointer shadow-2xs active:scale-90"
                            title="Excluir lançamento"
                            aria-label={`Excluir lançamento de ${rec.employeeName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Mostrando <strong>{filteredRecords.length}</strong> de <strong>{records.length}</strong> lançamentos
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Total do Filtro: <strong>{formatHours(filteredRecords.reduce((acc, r) => acc + r.hours, 0))}</strong>
          </span>
        </div>

      </div>

      {/* Modal de Filtro por Funcionário (Aberto pelo ícone ⋮ / Filter no Header) */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Filtrar por Funcionário
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee('todos');
                  setIsEmployeeModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  selectedEmployee === 'todos'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>👤 Todos os Funcionários</span>
                {selectedEmployee === 'todos' && <CheckCircle2 className="w-4 h-4" />}
              </button>

              {knownEmployees.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setSelectedEmployee(name);
                    setIsEmployeeModalOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    selectedEmployee === name
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{name}</span>
                  {selectedEmployee === name && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${themeConfig.bgButton}`}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão in-app */}
      <ConfirmDeleteModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        record={recordToDelete}
        onConfirm={() => {
          if (recordToDelete) {
            onDeleteRecord(recordToDelete.id);
            setRecordToDelete(null);
          }
        }}
      />

    </div>
  );
};
