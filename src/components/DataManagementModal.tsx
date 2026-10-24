import React, { useRef, useState, useEffect } from 'react';
import { OvertimeRecord } from '../types/overtime';
import {
   getInitialSeedData,
   getBackupVaultInfo,
   restoreFromBackupVault,
   createSafetyPreResetBackup,
   restorePreResetBackup,
 } from '../utils/storage';
import {
   X,
   Download,
   Upload,
   RotateCcw,
   AlertTriangle,
   CheckCircle2,
   Database,
   ShieldCheck,
   ArchiveRestore,
   Layers,
 } from 'lucide-react';

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
  const [vaultInfo, setVaultInfo] = useState<{
    hasBackup: boolean;
    date?: string;
    count?: number;
    hasPreResetBackup: boolean;
  }>({ hasBackup: false, hasPreResetBackup: false });

  useEffect(() => {
    if (isOpen) {
      setVaultInfo(getBackupVaultInfo());
    }
  }, [isOpen, records.length]);

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
      } catch {
        setErrorMessage('Falha ao processar o arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetWithSafetyBackup = () => {
    if (
      confirm(
        'Atenção: Deseja realmente zerar todos os lançamentos? Uma cópia de segurança dos seus registros atuais será salva automaticamente antes da exclusão.'
      )
    ) {
      // 1. Cria cópia de segurança antes do reset para garantir que nada seja perdido
      createSafetyPreResetBackup(records);

      // 2. Zera a lista para 100% vazio (0 registros)
      onResetRecords([]);

      setVaultInfo(getBackupVaultInfo());
      setSuccessMessage('Lançamentos zerados com sucesso! Sua cópia de segurança foi salva no cofre.');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleRestorePreReset = () => {
    const recovered = restorePreResetBackup();
    if (recovered) {
      onImportRecords(recovered);
      setVaultInfo(getBackupVaultInfo());
      setSuccessMessage(`${recovered.length} registros anteriores recuperados com sucesso!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage('Não foi possível encontrar a cópia anterior.');
    }
  };

  const handleRestoreVault = () => {
    const recovered = restoreFromBackupVault();
    if (recovered && recovered.length > 0) {
      onImportRecords(recovered);
      setVaultInfo(getBackupVaultInfo());
      setSuccessMessage(`${recovered.length} registros recuperados do cofre de backup!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage('Nenhum backup encontrado no cofre.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Banco de Dados & Armazenamento</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cartão de Integridade e Armazenamento Durável */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-blue-950 dark:text-blue-200">
                    Armazenamento Durável Ativo
                  </h4>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Permanente
                  </span>
                </div>
                <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80 mt-1 leading-relaxed">
                  Seus <strong>{records.length} lançamentos</strong> e configurações estão protegidos em múltiplas camadas (IndexedDB + LocalStorage protegido + Cofre de Backup). Reiniciar o celular ou atualizar a página não apaga suas informações.
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-blue-700 dark:text-blue-400 font-semibold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Proteção contra perda de dados e resets acidentais ativada</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
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
                  <div className="font-bold text-slate-800 dark:text-white text-xs">Exportar Arquivo de Backup (JSON)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Baixar arquivo de segurança de todos os registros</div>
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
                  <div className="font-bold text-slate-800 dark:text-white text-xs">Importar Arquivo de Backup (JSON)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Restaurar registros a partir de um arquivo salvo</div>
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

            {/* Desfazer Restauração / Recuperar Dados Anteriores se houver snapshot de segurança */}
            {vaultInfo.hasPreResetBackup && (
              <button
                type="button"
                onClick={handleRestorePreReset}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 transition cursor-pointer text-left text-amber-900 dark:text-amber-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                    <ArchiveRestore className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Restaurar Meus Dados Salvos Pré-Reset</div>
                    <div className="text-[11px] text-amber-700/80 dark:text-amber-400">Recuperar dados preservados pelo cofre</div>
                  </div>
                </div>
              </button>
            )}

            {/* Restaurar do Cofre de Backup Automático se a lista atual for menor ou vazia */}
            {vaultInfo.hasBackup && records.length === 0 && (
              <button
                type="button"
                onClick={handleRestoreVault}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60 transition cursor-pointer text-left text-indigo-900 dark:text-indigo-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">Recuperar do Cofre de Backup Automático</div>
                    <div className="text-[11px] text-indigo-700/80 dark:text-indigo-400">
                      Restaurar {vaultInfo.count || 0} registros do cofre local
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Zerar Lançamentos com Aviso de Segurança */}
            <button
              type="button"
              onClick={handleResetWithSafetyBackup}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition cursor-pointer text-left text-rose-700 dark:text-rose-400"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Zerar Todos os Lançamentos</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Limpa a lista para 0 registros (salva cópia de segurança no cofre)
                  </div>
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
