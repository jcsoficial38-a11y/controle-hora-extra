import React, { useState, useMemo } from 'react';
import { OvertimeRecord, ManagerProfile } from '../types/overtime';
import { formatDateBr, formatHours } from '../utils/storage';
import { COLOR_THEMES } from '../utils/theme';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  User, 
  X,
  FileDown,
  Share2,
  Trash2
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface MonthlyCalendarProps {
  records: OvertimeRecord[];
  onAddRecordForDate: (dateString: string) => void;
  onEditRecord: (record: OvertimeRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenExportModal: (defaultType?: 'pdf' | 'whatsapp') => void;
  knownEmployees: string[];
  profile: ManagerProfile;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  records,
  onAddRecordForDate,
  onEditRecord,
  onDeleteRecord,
  onToggleStatus,
  onOpenExportModal,
  knownEmployees,
  profile,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDayModalDate, setSelectedDayModalDate] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string>('todos');
  const [recordToDelete, setRecordToDelete] = useState<OvertimeRecord | null>(null);

  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const weekDayShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const currentMonthPadded = String(currentMonth + 1).padStart(2, '0');
  const monthKeyPrefix = `${currentYear}-${currentMonthPadded}`;

  const monthRecords = useMemo(() => {
    return records.filter((r) => {
      const matchMonth = r.date.startsWith(monthKeyPrefix);
      const matchEmp = filterEmployee === 'todos' || r.employeeName === filterEmployee;
      return matchMonth && matchEmp;
    });
  }, [records, monthKeyPrefix, filterEmployee]);

  const monthStats = useMemo(() => {
    const totalHours = monthRecords.reduce((acc, r) => acc + r.hours, 0);
    const paidHours = monthRecords.filter((r) => r.status === 'pago').reduce((acc, r) => acc + r.hours, 0);
    const pendingHours = monthRecords.filter((r) => r.status === 'pendente').reduce((acc, r) => acc + r.hours, 0);
    const uniqueEmployees = new Set(monthRecords.map((r) => r.employeeName)).size;
    return { totalHours, paidHours, pendingHours, uniqueEmployees };
  }, [monthRecords]);

  const recordsByDay = useMemo(() => {
    const map = new Map<string, OvertimeRecord[]>();
    monthRecords.forEach((rec) => {
      const existing = map.get(rec.date) || [];
      existing.push(rec);
      map.set(rec.date, existing);
    });
    return map;
  }, [monthRecords]);

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
      dayOfWeek: number;
    }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: (firstDayIndex - 1 - i) % 7 === 0 || (firstDayIndex - 1 - i) % 7 === 6,
        dayOfWeek: (firstDayIndex - 1 - i) % 7,
      });
    }

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${currentMonthPadded}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
      days.push({
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayOfWeek,
      });
    }

    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = days.length % 7;
      days.push({
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayOfWeek,
      });
    }

    return days;
  }, [currentYear, currentMonth, currentMonthPadded, today]);

  const modalRecords = selectedDayModalDate ? recordsByDay.get(selectedDayModalDate) || [] : [];

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Top Header & Calendar Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Month Selector & Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              type="button"
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoToToday}
              type="button"
              className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              type="button"
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{monthNames[currentMonth]}</span>
              <span className={themeConfig.textColor}>{currentYear}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {formatHours(monthStats.totalHours)} no mês • {monthStats.uniqueEmployees} colaborador(es)
            </p>
          </div>
        </div>

        {/* Filter by Employee & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos Colaboradores</option>
              {knownEmployees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onOpenExportModal('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>PDF do Mês</span>
          </button>
        </div>

      </div>

      {/* Calendar Grid Container (Domingo a Sábado) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
          {weekDayShort.map((day, idx) => (
            <div 
              key={day} 
              className={`py-3 px-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                idx === 0 || idx === 6 ? 'text-blue-600 dark:text-blue-400' : ''
              }`}
            >
              <span className="hidden sm:inline">{weekDayNames[idx]}</span>
              <span className="sm:hidden">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar days cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-y divide-slate-100 dark:divide-slate-800">
          {calendarDays.map((day, cellIndex) => {
            const dayRecords = recordsByDay.get(day.dateString) || [];
            const hasRecords = dayRecords.length > 0;
            const totalDayHours = dayRecords.reduce((acc, r) => acc + r.hours, 0);

            return (
              <div
                key={day.dateString + cellIndex}
                className={`min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 border-r border-slate-100 dark:border-slate-800 last:border-r-0 relative group flex flex-col justify-between transition-colors ${
                  !day.isCurrentMonth
                    ? 'bg-slate-50/40 dark:bg-slate-950/40 text-slate-300 dark:text-slate-700'
                    : day.isWeekend
                    ? 'bg-slate-50/20 dark:bg-slate-850/20'
                    : 'bg-white dark:bg-slate-900'
                } ${day.isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/15 dark:bg-blue-950/20' : ''}`}
              >
                {/* Cell Header: Day Number & Add button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs sm:text-sm font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                        day.isToday
                          ? `${themeConfig.bgButton} shadow-xs`
                          : day.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {hasRecords && (
                      <span className="hidden xs:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {totalDayHours}h
                      </span>
                    )}
                  </div>

                  {day.isCurrentMonth && (
                    <button
                      type="button"
                      onClick={() => onAddRecordForDate(day.dateString)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-blue-600 transition cursor-pointer"
                      title={`Lançar hora extra para ${formatDateBr(day.dateString)}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Day Records Chips (Agrupamento dos funcionários) */}
                <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[80px] sm:max-h-[90px] pr-0.5">
                  {dayRecords.slice(0, 3).map((rec) => {
                    const isPaid = rec.status === 'pago';
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelectedDayModalDate(day.dateString)}
                        className={`w-full text-left p-1 rounded-md border text-[10px] sm:text-[11px] font-medium transition cursor-pointer flex items-center justify-between gap-1 shadow-2xs ${
                          isPaid
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                            : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                        }`}
                        title={`${rec.employeeName}: ${formatHours(rec.hours)} (${isPaid ? 'Pago' : 'Pendente'})`}
                      >
                        <div className="truncate flex-1 font-bold">
                          {rec.employeeName}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <span className="font-extrabold text-[10px]">
                            {rec.hours}h
                          </span>
                          {isPaid ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {dayRecords.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDayModalDate(day.dateString)}
                      className="w-full text-center text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline py-0.5"
                    >
                      +{dayRecords.length - 3} mais
                    </button>
                  )}
                </div>

                {!hasRecords && day.isCurrentMonth && (
                  <div
                    onClick={() => onAddRecordForDate(day.dateString)}
                    className="flex-1 cursor-pointer"
                  />
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Day Details Modal */}
      {selectedDayModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            <div className={`px-5 py-4 ${themeConfig.bgButton} text-white flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-white/80" />
                <div>
                  <h3 className="font-bold text-base">Lançamentos do Dia</h3>
                  <p className="text-xs text-white/80">{formatDateBr(selectedDayModalDate)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayModalDate(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {modalRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhuma hora extra registrada neste dia.
                </p>
              ) : (
                modalRecords.map((rec) => {
                  const isPaid = rec.status === 'pago';
                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {rec.employeeName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {rec.reason || 'Hora extra'}
                        </div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                          {formatHours(rec.hours)}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(rec.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Pago</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayModalDate(null);
                            onEditRecord(rec);
                          }}
                          className="text-xs text-slate-500 hover:text-blue-600 font-semibold cursor-pointer p-1"
                        >
                          Editar
                        </button>

                        {onDeleteRecord && (
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(rec)}
                            className="text-xs text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const targetDate = selectedDayModalDate;
                  setSelectedDayModalDate(null);
                  onAddRecordForDate(targetDate);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${themeConfig.bgButton}`}
              >
                <Plus className="w-4 h-4" />
                <span>+ Lançar para Este Dia</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDayModalDate(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão no Calendário */}
      <ConfirmDeleteModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        record={recordToDelete}
        onConfirm={() => {
          if (recordToDelete && onDeleteRecord) {
            onDeleteRecord(recordToDelete.id);
            setRecordToDelete(null);
          }
        }}
      />

    </div>
  );
};
