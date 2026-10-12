import React, { useState, useMemo } from 'react';
import { OvertimeRecord, ManagerProfile } from '../types/overtime';
import { generateOvertimePDF } from '../utils/pdfGenerator';
import { buildWhatsAppMessage, openWhatsApp } from '../utils/whatsappGenerator';
import { formatHours } from '../utils/storage';
import { COLOR_THEMES } from '../utils/theme';
import { ReportPreviewModal } from './ReportPreviewModal';
import { 
  X, 
  FileDown, 
  Share2, 
  Eye, 
  Copy, 
  Check, 
  Send, 
  FileText, 
  CalendarDays, 
  CalendarRange 
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: OvertimeRecord[];
  knownEmployees: string[];
  profile: ManagerProfile;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  records,
  knownEmployees,
  profile,
}) => {
  const [reportPeriodType, setReportPeriodType] = useState<'semanal' | 'mensal'>('mensal');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('todos');
  const [onlyPending, setOnlyPending] = useState(false);
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState<'pdf' | 'whatsapp'>('pdf');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [2024, 2025, 2026, 2027];

  const { filteredRecords, periodLabel } = useMemo(() => {
    let result = [...records];
    let label = '';
    const now = new Date();

    if (reportPeriodType === 'semanal') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      result = result.filter(r => r.date >= sevenDaysAgoStr && r.date <= todayStr);
      label = `Relatório Semanal (${sevenDaysAgo.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')})`;
    } else {
      const prefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      result = result.filter(r => r.date.startsWith(prefix));
      label = `Relatório Mensal (${monthNames[selectedMonth - 1]} de ${selectedYear})`;
    }

    if (selectedEmployee !== 'todos') {
      result = result.filter(r => r.employeeName === selectedEmployee);
    }

    if (onlyPending) {
      result = result.filter(r => r.status === 'pendente');
    }

    return { filteredRecords: result, periodLabel: label };
  }, [records, reportPeriodType, selectedMonth, selectedYear, selectedEmployee, onlyPending]);

  const totalHours = filteredRecords.reduce((acc, r) => acc + r.hours, 0);
  const paidHours = filteredRecords.filter(r => r.status === 'pago').reduce((acc, r) => acc + r.hours, 0);
  const pendingHours = filteredRecords.filter(r => r.status === 'pendente').reduce((acc, r) => acc + r.hours, 0);

  const whatsAppMessage = useMemo(() => {
    return buildWhatsAppMessage({
      periodLabel,
      records: filteredRecords,
      onlyPending,
      targetEmployee: selectedEmployee,
    });
  }, [periodLabel, filteredRecords, onlyPending, selectedEmployee]);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    generateOvertimePDF({
      monthName: periodLabel,
      year: selectedYear,
      records: filteredRecords,
      filteredEmployee: selectedEmployee,
      reportTitle: `relatorio-he-${reportPeriodType}-${selectedEmployee !== 'todos' ? selectedEmployee : 'geral'}`,
    });
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsAppMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    openWhatsApp(phone, whatsAppMessage);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-fade-in select-none">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
          
          {/* Header do Gerador de Relatório */}
          <div className={`px-6 py-4 ${themeConfig.bgButton} text-white flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Gerador de Relatório</h2>
                <p className="text-xs text-white/80">Escolha o período semanal ou mensal para exportar</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-white/80 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            
            {/* 1. SELEÇÃO DO PERÍODO: Relatório Semanal OU Relatório Mensal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Tipo de Relatório
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReportPeriodType('semanal')}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                    reportPeriodType === 'semanal'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>Relatório Semanal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriodType('mensal')}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                    reportPeriodType === 'mensal'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Relatório Mensal</span>
                </button>
              </div>
            </div>

            {/* Filtros complementares */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {reportPeriodType === 'mensal' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Mês de Apuração
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {monthNames.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Ano
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 flex items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Período automático: últimos 7 dias da semana corrente.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Colaborador
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="todos">Todos Colaboradores</option>
                  {knownEmployees.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resumo estatístico do período */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-blue-50/80 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold block">Lançamentos</span>
                <span className="font-extrabold text-blue-700 dark:text-blue-300 text-sm">{filteredRecords.length}</span>
              </div>
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold block">Horas Totais</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">{formatHours(totalHours)}</span>
              </div>
              <div className="bg-rose-50/80 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold block">Pendentes</span>
                <span className="font-extrabold text-rose-700 dark:text-rose-300 text-sm">{formatHours(pendingHours)}</span>
              </div>
            </div>

            {/* Abas de Destino: PDF ou WhatsApp */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveActionTab('pdf')}
                  className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                    activeActionTab === 'pdf'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download em PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveActionTab('whatsapp')}
                  className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                    activeActionTab === 'whatsapp'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar via WhatsApp</span>
                </button>
              </div>

              {/* SEÇÃO PDF */}
              {activeActionTab === 'pdf' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Você pode visualizar o documento completo antes de baixar clicando em <strong>Ver Relatório</strong>. O arquivo inclui cabeçalho oficial, apuração consolidada e campos para assinaturas.
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                    {/* BOTÃO "VER RELATÓRIO" COM PREVIEW (Substituiu o antigo imprimir) */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="px-5 py-2.5 rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Ver Relatório</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      disabled={filteredRecords.length === 0}
                      className={`px-6 py-2.5 rounded-xl disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer active:scale-95 ${themeConfig.bgButton}`}
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Baixar Relatório em PDF</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SEÇÃO WHATSAPP */}
              {activeActionTab === 'whatsapp' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telefone de Envio (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (11) 99999-9999 (Deixe em branco para escolher contato)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Prévia do Relatório WhatsApp:
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPreviewOpen(true)}
                          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ver Tabela</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyWhatsApp}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-950/5 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                      {whatsAppMessage}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Ver Relatório</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      disabled={filteredRecords.length === 0}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar Relatório via WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO COMPLETA DO RELATÓRIO */}
      <ReportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        periodLabel={periodLabel}
        records={filteredRecords}
        profile={profile}
        onDownloadPDF={handleDownloadPDF}
        onSendWhatsApp={handleSendWhatsApp}
      />
    </>
  );
};
