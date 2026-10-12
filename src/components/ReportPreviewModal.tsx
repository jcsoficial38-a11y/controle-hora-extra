import React from 'react';
import { OvertimeRecord, ManagerProfile } from '../types/overtime';
import { formatDateBr, formatHours, formatCurrency } from '../utils/storage';
import { COLOR_THEMES } from '../utils/theme';
import { X, FileDown, Share2, CheckCircle2, XCircle, User, Calendar, ShieldCheck } from 'lucide-react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodLabel: string;
  records: OvertimeRecord[];
  profile: ManagerProfile;
  onDownloadPDF: () => void;
  onSendWhatsApp: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  periodLabel,
  records,
  profile,
  onDownloadPDF,
  onSendWhatsApp,
}) => {
  if (!isOpen) return null;

  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  const totalHours = records.reduce((acc, r) => acc + r.hours, 0);
  const paidHours = records.filter(r => r.status === 'pago').reduce((acc, r) => acc + r.hours, 0);
  const pendingHours = records.filter(r => r.status === 'pendente').reduce((acc, r) => acc + r.hours, 0);
  const totalValue = records.reduce((acc, r) => acc + ((r.ratePerHour || 0) * r.hours), 0);

  // Group by employee
  const employeeMap = new Map<string, { total: number; paid: number; pending: number }>();
  records.forEach(r => {
    const cur = employeeMap.get(r.employeeName) || { total: 0, paid: 0, pending: 0 };
    cur.total += r.hours;
    if (r.status === 'pago') cur.paid += r.hours;
    else cur.pending += r.hours;
    employeeMap.set(r.employeeName, cur);
  });

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in select-none">
      <div className="w-full max-w-4xl bg-slate-100 dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header do Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${themeConfig.bgButton} flex items-center justify-center font-bold text-xs text-white`}>
              HE
            </div>
            <div>
              <h3 className="font-bold text-base">Pré-visualização do Relatório</h3>
              <p className="text-xs text-slate-400">Verifique os dados e o layout formatado antes de baixar ou enviar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Documento (Folha formatada estilo A4) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950">
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            
            {/* Cabeçalho Oficial do Relatório */}
            <div className="border-b-2 border-blue-600 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${themeConfig.bgButton} text-white flex items-center justify-center font-black text-xl shadow-md`}>
                  HE
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    Controle de Hora Extra (HE)
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Relatório Oficial de Apuração e Banco de Horas
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-500">
                <div>Emissão: <strong className="text-slate-700 dark:text-slate-300">{dateFormatted}</strong></div>
                <div>Gestor: <strong className="text-slate-700 dark:text-slate-300">{profile.name || 'Gestor Responsável'}</strong></div>
              </div>
            </div>

            {/* Período e Totais */}
            <div className="my-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{periodLabel.toUpperCase()}</span>
              </div>
              <div className="text-xs text-slate-500">
                Total de Registros: <strong className="text-slate-800 dark:text-slate-200">{records.length} lançamento(s)</strong>
              </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 text-center">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Horas</span>
                <span className="text-base font-extrabold text-blue-700 dark:text-blue-300">{formatHours(totalHours)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Horas Pagas</span>
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">{formatHours(paidHours)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Horas Pendentes</span>
                <span className="text-base font-extrabold text-rose-700 dark:text-rose-300">{formatHours(pendingHours)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Valor Total Est.</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">{formatCurrency(totalValue)}</span>
              </div>
            </div>

            {/* Tabela de Lançamentos */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Funcionário</th>
                    <th className="p-2.5 text-center">Horas</th>
                    <th className="p-2.5 text-center">Tipo</th>
                    <th className="p-2.5">Motivo / Descrição</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        Nenhum registro encontrado para este período.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => {
                      const isPaid = rec.status === 'pago';
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-semibold whitespace-nowrap">{formatDateBr(rec.date)}</td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{rec.employeeName}</td>
                          <td className="p-2.5 text-center font-bold whitespace-nowrap">{formatHours(rec.hours)}</td>
                          <td className="p-2.5 text-center text-[10px] text-slate-500">{rec.overtimeType || '50%'}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">{rec.reason || 'Hora extra prestada'}</td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                              <span>{isPaid ? 'Pago' : 'Pendente'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo por Colaborador */}
            {employeeMap.size > 0 && (
              <div className="mb-8">
                <h4 className="font-bold text-xs uppercase text-slate-600 dark:text-slate-400 mb-2">
                  Resumo Consolidado por Colaborador:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Array.from(employeeMap.entries()).map(([name, data]) => (
                    <div key={name} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{name}:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Total: <strong>{formatHours(data.total)}</strong> (Pagas: {formatHours(data.paid)} | Pend: {formatHours(data.pending)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de Assinaturas */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
              <div>
                <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
                <span>Gestor Responsável</span>
              </div>
              <div>
                <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
                <span>Departamento de RH</span>
              </div>
            </div>

          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Fechar Pré-visualização
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onSendWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onDownloadPDF}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${themeConfig.bgButton}`}
            >
              <FileDown className="w-4 h-4" />
              <span>Baixar em PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
