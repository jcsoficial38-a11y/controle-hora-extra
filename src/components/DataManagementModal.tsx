import React, { useRef, useState } from 'react';
import { OvertimeRecord } from '../types/overtime';
import { getInitialSeedData } from '../utils/storage';
import { X, Download, Upload, RotateCcw, AlertTriangle, CheckCircle2, Database } from 'lucide-react';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: OvertimeRecord[];
  onImportRecords: (newRecords: OvertimeRecord[]) => void;
  onResetRecords: (defaultRecords: OvertimeRecord[]) => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  records,
  onImportRecords,
  onResetRecords,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup-controle-he-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSuccessMessage('Backup exportado com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onImportRecords(json);
          setSuccessMessage(`${json.length} registros importados com sucesso!`);
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          setErrorMessage('O arquivo JSON deve conter uma lista válida de lançamentos.');
        }
      } catch (err) {
        setErrorMessage('Falha ao processar o arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja restaurar os dados de exemplo padrão? Os registros atuais serão substituídos.')) {
      const initial = getInitialSeedData();
      onResetRecords(initial);
      setSuccessMessage('Dados restaurados com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Banco de Dados & Backup</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Seus dados são salvos com segurança diretamente no armazenamento local do seu navegador (LocalStorage). Você pode exportar um backup para salvar ou transferir para outro celular/computador.
          </div>

          <div className="space-y-2.5 pt-2">
            {/* Exportar Backup */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-white text-xs">Exportar Backup (JSON)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Salvar cópia de todos os {records.length} lançamentos</div>
                </div>
              </div>
            </button>

            {/* Importar Backup */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-white text-xs">Importar Backup (JSON)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Carregar arquivo salvo anteriormente</div>
                </div>
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            {/* Restaurar Padrão */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition cursor-pointer text-left text-rose-700 dark:text-rose-400"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Restaurar Dados Padrão</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Recarregar exemplos de demonstração</div>
                </div>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
