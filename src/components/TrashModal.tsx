import React, { useState } from 'react';
import { TrashRecord, formatHours, formatDateBr } from '../utils/storage';
import { Trash2, RotateCcw, AlertTriangle, X, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashRecords: TrashRecord[];
  onRestore: (recordId: string) => void;
  onDeletePermanently: (recordId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashRecords,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleRestoreItem = (id: string) => {
    onRestore(id);
    setFeedbackMsg('Registro restaurado com sucesso!');
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Tem certeza que deseja excluir definitivamente este lançamento?')) {
      onDeletePermanently(id);
      setFeedbackMsg('Registro excluído definitivamente.');
      setTimeout(() => setFeedbackMsg(''), 2500);
    }
  };

  const handleEmptyAll = () => {
    if (confirm('Atenção: Deseja esvaziar toda a lixeira? Todos os itens serão excluídos permanentemente.')) {
      onEmptyTrash();
      setFeedbackMsg('Lixeira esvaziada com sucesso.');
      setTimeout(() => setFeedbackMsg(''), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Lixeira Local</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-mono">
                  {trashRecords.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Itens excluídos preservados na memória do aparelho
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div className="mx-6 mt-4 p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Action bar if items exist */}
        {trashRecords.length > 0 && (
          <div className="px-6 pt-4 pb-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Registros aguardando restauração ou limpeza
            </span>
            <button
              type="button"
              onClick={handleEmptyAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Esvaziar Lixeira</span>
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {trashRecords.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  A lixeira está vazia
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                  Quando você excluir lançamentos de horas extras, eles serão guardados aqui para restauração rápida.
                </p>
              </div>
            </div>
          ) : (
            trashRecords.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.employeeName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'pago'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {item.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                    <span>Data: {formatDateBr(item.date)}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatHours(item.hours)}
                    </span>
                    {item.reason && (
                      <>
                        <span>•</span>
                        <span className="italic truncate max-w-[150px]">{item.reason}</span>
                      </>
                    )}
                  </div>

                  {item.deletedAt && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      Excluído em {new Date(item.deletedAt).toLocaleDateString('pt-BR')} às {new Date(item.deletedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestoreItem(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer active:scale-95"
                    title="Restaurar este lançamento"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Excluir definitivamente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
            <span>Itens excluídos não voltam ao recarregar ou sincronizar.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 font-bold text-slate-700 dark:text-slate-200 hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
