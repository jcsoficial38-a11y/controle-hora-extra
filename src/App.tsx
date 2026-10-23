import React, { useState, useEffect, useMemo } from 'react';
import { OvertimeRecord, OvertimeStatus, ManagerProfile, AppTheme } from './types/overtime';
import { 
  loadRecords, 
  saveRecords, 
  loadManagerProfile, 
  saveManagerProfile, 
  initDurableStorage,
  loadTrashRecords,
  moveToTrash,
  restoreFromTrash,
  deletePermanentlyFromTrash,
  emptyTrash,
  TrashRecord
} from './utils/storage';
import { SplashScreen } from './components/SplashScreen';
import { Header, ActiveTab } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OvertimeList } from './components/OvertimeList';
import { MonthlyCalendar } from './components/MonthlyCalendar';
import { ManagerProfileView } from './components/ManagerProfileView';
import { OvertimeFormModal } from './components/OvertimeFormModal';
import { ExportModal } from './components/ExportModal';
import { DataManagementModal } from './components/DataManagementModal';
import { PinLockModal } from './components/PinLockModal';
import { TrashModal } from './components/TrashModal';
import { Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [records, setRecords] = useState<OvertimeRecord[]>(() => loadRecords());
  const [profile, setProfile] = useState<ManagerProfile>(() => loadManagerProfile());
  const [trashRecords, setTrashRecords] = useState<TrashRecord[]>(() => loadTrashRecords());

  // 1. Verificação imediata de bloqueio por PIN / Biometria ao abrir ou recarregar
  const isSecurityConfigured = Boolean(
    (profile.pinEnabled && profile.pinCode) ||
    (profile.biometricsEnabled && profile.biometricCredentialId)
  );

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !isSecurityConfigured);
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(() => isSecurityConfigured);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lancamentos');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('todos');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<OvertimeRecord | null>(null);
  const [defaultDateForForm, setDefaultDateForForm] = useState<string | undefined>();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // Inicialização do Armazenamento Durável e Proteção Persistente 100% Local
  useEffect(() => {
    initDurableStorage(
      (hydratedRecords) => {
        setRecords(hydratedRecords);
      },
      (hydratedProfile) => {
        setProfile(hydratedProfile);
      }
    );

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'controle_hora_extra_records_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setRecords(parsed);
          }
        } catch {}
      } else if (e.key === 'controle_hora_extra_manager_profile_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setProfile(prev => ({ ...prev, ...parsed }));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Synchronize dark theme class on document element
  useEffect(() => {
    if (profile.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile.theme]);

  // Synchronize records changes to durable storage
  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // Synchronize profile changes to durable storage
  useEffect(() => {
    saveManagerProfile(profile);
  }, [profile]);

  // Unique list of employee names sorted alphabetically
  const knownEmployees = useMemo(() => {
    const names = Array.from(new Set(records.map(r => r.employeeName).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Handle entering app from Splash Screen
  const handleEnterFromSplash = () => {
    if (isSecurityConfigured && !isUnlocked) {
      setIsPinModalOpen(true);
    } else {
      setShowSplash(false);
    }
  };

  const handlePinSuccess = () => {
    setIsUnlocked(true);
    setIsPinModalOpen(false);
    setShowSplash(false);
  };

  // Toggle Theme handler
  const handleToggleTheme = () => {
    const newTheme: AppTheme = profile.theme === 'dark' ? 'light' : 'dark';
    setProfile(prev => ({ ...prev, theme: newTheme }));
  };

  // CRUD actions
  const handleSaveRecord = (record: OvertimeRecord) => {
    setRecords(prev => {
      const exists = prev.some(r => r.id === record.id);
      const updated = exists ? prev.map(r => r.id === record.id ? record : r) : [record, ...prev];
      saveRecords(updated);
      return updated;
    });

    if (record.status === 'pago') {
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 },
        });
      } catch {}
    }
  };

  // Exclusão com envio imediato para a Lixeira Local
  const handleDeleteRecord = (id: string) => {
    const toDelete = records.find(r => r.id === id);
    if (toDelete) {
      const updatedTrash = moveToTrash(toDelete);
      setTrashRecords(updatedTrash);
    }
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveRecords(updated);
      return updated;
    });
  };

  // Gerenciamento da Lixeira Local (Restauração e Esvaziamento)
  const handleRestoreFromTrash = (recordId: string) => {
    const { restored, remainingTrash } = restoreFromTrash(recordId);
    setTrashRecords(remainingTrash);
    if (restored) {
      setRecords(prev => {
        const updated = [restored, ...prev.filter(r => r.id !== recordId)];
        saveRecords(updated);
        return updated;
      });
    }
  };

  const handleDeletePermanentlyFromTrash = (recordId: string) => {
    const remainingTrash = deletePermanentlyFromTrash(recordId);
    setTrashRecords(remainingTrash);
  };

  const handleEmptyAllTrash = () => {
    emptyTrash();
    setTrashRecords([]);
  };

  const handleToggleStatus = (id: string) => {
    setRecords(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          const newStatus: OvertimeStatus = r.status === 'pago' ? 'pendente' : 'pago';
          return { ...r, status: newStatus };
        }
        return r;
      });
      saveRecords(updated);
      return updated;
    });
  };

  const handleOpenNewRecordModal = (date?: string) => {
    setRecordToEdit(null);
    setDefaultDateForForm(date);
    setIsFormModalOpen(true);
  };

  const handleOpenEditRecordModal = (record: OvertimeRecord) => {
    setRecordToEdit(record);
    setDefaultDateForForm(undefined);
    setIsFormModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* 1. TELA INICIAL (SPLASH SCREEN) */}
      {showSplash ? (
        <SplashScreen
          onEnter={handleEnterFromSplash}
          profile={profile}
        />
      ) : !isUnlocked ? (
        /* Tela de Bloqueio Obrigatório */
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 animate-fade-in">
          <div className="text-center space-y-4 max-w-sm bg-slate-800/80 p-8 rounded-3xl border border-slate-700 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black">Acesso Bloqueado</h2>
            <p className="text-xs text-slate-400">
              O aplicativo está configurado com segurança. Autentique-se com sua biometria ou PIN para acessar os dados.
            </p>
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg transition active:scale-95 cursor-pointer"
            >
              Desbloquear com Biometria / PIN
            </button>
          </div>
        </div>
      ) : (
        /* MAIN APPLICATION VIEW */
        <div className="flex-1 flex flex-col">
          {/* Top Application Header (Clean without top-right profile avatar) */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onBackToSplash={() => setShowSplash(true)}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onAddRecord={() => handleOpenNewRecordModal()}
            onOpenEmployeeFilter={() => setIsEmployeeModalOpen(true)}
            selectedEmployee={selectedEmployee}
            profile={profile}
            trashCount={trashRecords.length}
          />

          {/* New Modern Sidebar (Drawer) */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={profile}
            trashCount={trashRecords.length}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            {/* 2. ABA DE CADASTRO E LANÇAMENTOS */}
            {activeTab === 'lancamentos' && (
              <OvertimeList
                records={records}
                onAddRecord={() => handleOpenNewRecordModal()}
                onEditRecord={handleOpenEditRecordModal}
                onDeleteRecord={handleDeleteRecord}
                onToggleStatus={handleToggleStatus}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                knownEmployees={knownEmployees}
                profile={profile}
                selectedEmployee={selectedEmployee}
                setSelectedEmployee={setSelectedEmployee}
                isEmployeeModalOpen={isEmployeeModalOpen}
                setIsEmployeeModalOpen={setIsEmployeeModalOpen}
              />
            )}

            {/* 3. ABA CALENDÁRIO MENSAL */}
            {activeTab === 'calendario' && (
              <MonthlyCalendar
                records={records}
                onAddRecordForDate={(dateStr) => handleOpenNewRecordModal(dateStr)}
                onEditRecord={handleOpenEditRecordModal}
                onDeleteRecord={handleDeleteRecord}
                onToggleStatus={handleToggleStatus}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                knownEmployees={knownEmployees}
                profile={profile}
              />
            )}

            {/* 4. ABA PERFIL & CONFIGURAÇÕES (Com Lixeira Retrátil e Backup de Dados) */}
            {activeTab === 'perfil' && (
              <ManagerProfileView
                profile={profile}
                onUpdateProfile={(updated) => setProfile(updated)}
                records={records}
                onRecordsUpdated={(updated) => setRecords(updated)}
                trashRecords={trashRecords}
                onRestoreFromTrash={handleRestoreFromTrash}
                onDeletePermanentlyFromTrash={handleDeletePermanentlyFromTrash}
                onEmptyAllTrash={handleEmptyAllTrash}
                onOpenReportModal={() => setIsExportModalOpen(true)}
                onOpenDataModal={() => setIsDataModalOpen(true)}
                onToggleTheme={handleToggleTheme}
              />
            )}

          </main>

          {/* Clean Modern Footer */}
          <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-4 mt-auto no-print transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-blue-600 dark:text-blue-400">Controle de Hora Extra (HE)</span>
                <span>•</span>
                <span>100% Local • Gestor: {profile.name || 'Ativo'}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setActiveTab('perfil');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                >
                  Configurações & Backup
                </button>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer font-bold"
                >
                  Gerar Relatório
                </button>
                <button
                  onClick={() => setShowSplash(true)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                >
                  Tela de Abertura
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* MODAL: Bloqueio por PIN & Biometria */}
      <PinLockModal
        isOpen={isPinModalOpen}
        onClose={() => {
          if (!isSecurityConfigured || isUnlocked) {
            setIsPinModalOpen(false);
          }
        }}
        onSuccess={handlePinSuccess}
        profile={profile}
        isMandatory={!isUnlocked}
        onResetPinWithSecurityAnswer={() => {
          setProfile(prev => {
            const upd = { ...prev, pinEnabled: false, pinCode: '', biometricsEnabled: false };
            saveManagerProfile(upd);
            return upd;
          });
          setIsUnlocked(true);
          setIsPinModalOpen(false);
          setShowSplash(false);
        }}
      />

      {/* MODAL: Formulário de Lançamento */}
      <OvertimeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveRecord}
        initialData={recordToEdit}
        defaultDate={defaultDateForForm}
        knownEmployees={knownEmployees}
        profile={profile}
      />

      {/* MODAL: Gerador de Relatório */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        knownEmployees={knownEmployees}
        profile={profile}
      />

      {/* MODAL: Gerenciamento e Backup de Dados */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        records={records}
        onImportRecords={(imported) => {
          setRecords(imported);
          setIsDataModalOpen(false);
        }}
        onResetRecords={(reset) => {
          setRecords(reset);
          setIsDataModalOpen(false);
        }}
      />

    </div>
  );
}
