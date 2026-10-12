import React, { useState, useEffect } from 'react';
import { OvertimeRecord, OvertimeStatus, OvertimeType, ManagerProfile } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { X, Calendar, User, Clock, CheckCircle2, XCircle, DollarSign, FileText } from 'lucide-react';

interface OvertimeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: OvertimeRecord) => void;
  initialData?: OvertimeRecord | null;
  defaultDate?: string;
  knownEmployees: string[];
  profile: ManagerProfile;
}

export const OvertimeFormModal: React.FC<OvertimeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  knownEmployees,
  profile,
}) => {
  const [employeeName, setEmployeeName] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState<number>(4);
  const [status, setStatus] = useState<OvertimeStatus>('pendente');
  const [overtimeType, setOvertimeType] = useState<OvertimeType>('50%');
  const [reason, setReason] = useState('');
  const [ratePerHour, setRatePerHour] = useState<string>('');
  const [error, setError] = useState('');

  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  useEffect(() => {
    if (initialData) {
      setEmployeeName(initialData.employeeName);
      setDate(initialData.date);
      setHours(initialData.hours);
      setStatus(initialData.status);
      setOvertimeType(initialData.overtimeType || '50%');
      setReason(initialData.reason || '');
      setRatePerHour(initialData.ratePerHour ? String(initialData.ratePerHour) : '');
    } else {
      const today = defaultDate || new Date().toISOString().split('T')[0];
      setDate(today);
      setEmployeeName('');
      setHours(4);
      setStatus('pendente');
      setOvertimeType('50%');
      setReason('');
      setRatePerHour('');
    }
    setError('');
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      setError('Por favor, informe o nome do funcionário.');
      return;
    }
    if (!date) {
      setError('Por favor, informe a data do lançamento.');
      return;
    }
    if (hours <= 0) {
      setError('A quantidade de horas deve ser maior que zero.');
      return;
    }

    const newRecord: OvertimeRecord = {
      id: initialData ? initialData.id : `he-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      employeeName: employeeName.trim(),
      date,
      hours: Number(hours),
      status,
      overtimeType,
      reason: reason.trim() || undefined,
      ratePerHour: ratePerHour ? Number(ratePerHour) : undefined,
      createdAt: initialData ? initialData.createdAt : new Date().toISOString(),
    };

    onSave(newRecord);
    onClose();
  };

  const hourPresets = [2, 4, 6, 8, 10, 12];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Header */}
        <div className={`px-6 py-4 ${themeConfig.bgButton} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
              HE
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? 'Editar Hora Extra' : 'Lançar Hora Extra'}
              </h2>
              <p className="text-xs text-white/80">
                Preencha os dados do colaborador e da jornada realizada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Nome do Funcionário */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome do Funcionário *
            </label>
            <div className="relative">
              <input
                type="text"
                value={employeeName}
                onChange={(e) => {
                  setEmployeeName(e.target.value);
                  setError('');
                }}
                placeholder="Ex: Carlos Oliveira"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium focus:outline-none"
                list="employees-list"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <datalist id="employees-list">
                {knownEmployees.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {knownEmployees.length > 0 && !initialData && (
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-slate-400">Frequentes:</span>
                {knownEmployees.slice(0, 4).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setEmployeeName(name)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Data e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Data do Lançamento *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium focus:outline-none"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Adicional
              </label>
              <select
                value={overtimeType}
                onChange={(e) => setOvertimeType(e.target.value as OvertimeType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium focus:outline-none"
              >
                <option value="50%">50% (Dias úteis e sábados)</option>
                <option value="100%">100% (Domingos e feriados)</option>
                <option value="noturno">Adicional Noturno (20%+)</option>
                <option value="banco">Banco de Horas (Compensação)</option>
              </select>
            </div>
          </div>

          {/* Quantidade de Horas Extras */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Quantidade de Horas Extras *
              </label>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${themeConfig.badgeStyle}`}>
                {hours ? `${String(Math.floor(hours)).padStart(2, '0')} hs` : '00 hs'}
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hours || ''}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 8"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold focus:outline-none"
                required
              />
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            {/* Atalhos Rápidos */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-400">Atalhos:</span>
              {hourPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHours(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    hours === preset
                      ? `${themeConfig.bgButton} shadow-xs`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {String(preset).padStart(2, '0')} hs
                </button>
              ))}
            </div>
          </div>

          {/* Status (Pendente / Pago) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Status do Pagamento *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('pendente')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition cursor-pointer text-sm font-bold ${
                  status === 'pendente'
                    ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  status === 'pendente' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  <XCircle className="w-4 h-4" />
                </div>
                <span>Pendente</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('pago')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition cursor-pointer text-sm font-bold ${
                  status === 'pago'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  status === 'pago' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Pago</span>
              </button>
            </div>
          </div>

          {/* Motivo e Valor Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Motivo / Justificativa
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Fechamento, plantão"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor Hora (R$/h)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(e.target.value)}
                  placeholder="35.00"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer active:scale-95 ${themeConfig.bgButton}`}
            >
              {initialData ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
