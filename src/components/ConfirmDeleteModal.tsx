import React, { useEffect } from 'react';
import { OvertimeRecord } from '../types/overtime';
import { formatDateBr, formatHours } from '../utils/storage';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: OvertimeRecord | null;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-rose-200 dark:border-rose-900/60 shadow-2xl text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ícone de Alerta */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
          <Trash2 className="w-7 h-7" />
        </div>

        {/* Pergunta de Confirmação em Destaque */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
          Deseja realmente excluir este lançamento?
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          O registro será movido para a <strong>Lixeira Local</strong> na memória do aparelho, de onde poderá ser visualizado ou restaurado.
        </p>

        {/* Detalhes do registro a ser excluído */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-left text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Colaborador:</span>
            <strong className="text-slate-900 dark:text-white font-bold">{record.employeeName}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Data:</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{formatDateBr(record.date)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Horas Extras:</span>
            <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{formatHours(record.hours)}</strong>
          </div>
          {record.reason && (
            <div className="flex justify-between items-center text-[11px] text-slate-500 truncate pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">Motivo:</span>
              <span className="truncate max-w-[170px] text-slate-700 dark:text-slate-300">{record.reason}</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition cursor-pointer active:scale-95"
          >
            Sim, Excluir
          </button>
        </div>

      </div>
    </div>
  );
};
