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
  Calendar as CalendarIcon, 
  Plus, 
  ArrowUpDown, 
  Clock 
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
}

export const OvertimeList: React.FC<OvertimeListProps> = ({
  records,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  onToggleStatus,
  knownEmployees,
  profile,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('todos');
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

  const years = [2024, 2025, 2026, 2027];

  // Map to calculate employee total accumulated balance across all records
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

  // Filtering records
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
    <div className="space-y-4 animate-fade-in">
      
      {/* Barra Única e Limpa de Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Campo de Busca Rápida */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por colaborador, motivo ou data..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Filtros em linha e botão principal */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mês */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={0}>Todos os Meses</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={0}>Todos os Anos</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Funcionário */}
          <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="todos">Todos Funcionários</option>
              {knownEmployees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="todos">Status: Todos</option>
              <option value="pendente">Status: Pendente</option>
              <option value="pago">Status: Pago</option>
            </select>
          </div>

          {/* Botão de Adicionar Lançamento */}
          <button
            type="button"
            onClick={onAddRecord}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition cursor-pointer active:scale-95 ${themeConfig.bgButton}`}
          >
            <Plus className="w-4 h-4" />
            <span>Lançar HE</span>
          </button>
        </div>

      </div>

      {/* ÁREA / TABELA ÚNICA DE LANÇAMENTOS COM: Data, Nome do Funcionário, Horas Extras, Status e Saldo */}
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
                      {/* 1. Data (DD/MM/AAAA) */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDateBr(rec.date)}
                      </td>

                      {/* 2. Nome do Funcionário */}
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

                      {/* 3. Horas Extras (ex: 08 hs, 04 hs, 12 hs) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl font-extrabold text-xs border ${themeConfig.badgeStyle}`}>
                          {formatHours(rec.hours)}
                        </span>
                      </td>

                      {/* 4. Status (Pendente / Pago com badges coloridos e legíveis) */}
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

                      {/* 5. Saldo (Saldo Acumulado do Funcionário) */}
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

                      {/* 6. Ações (Editar e Lixeira funcional com confirmação in-app) */}
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
                          
                          {/* Ícone da Lixeira funcional com Confirmação e Exclusão imediata */}
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

        {/* Rodapé da tabela com contagem total de registros */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Mostrando <strong>{filteredRecords.length}</strong> de <strong>{records.length}</strong> lançamentos
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Total do Filtro: <strong>{formatHours(filteredRecords.reduce((acc, r) => acc + r.hours, 0))}</strong>
          </span>
        </div>

      </div>

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
