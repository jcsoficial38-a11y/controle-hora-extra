/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { OvertimeRecord, OvertimeStatus, ManagerProfile, AppTheme } from './types/overtime';
import { loadRecords, saveRecords, loadManagerProfile, saveManagerProfile, initDurableStorage } from './utils/storage';
import { SplashScreen } from './components/SplashScreen';
import { Header, ActiveTab } from './components/Header';
import { OvertimeList } from './components/OvertimeList';
import { MonthlyCalendar } from './components/MonthlyCalendar';
import { ManagerProfileView } from './components/ManagerProfileView';
import { OvertimeFormModal } from './components/OvertimeFormModal';
import { ExportModal } from './components/ExportModal';
import { DataManagementModal } from './components/DataManagementModal';
import { PinLockModal } from './components/PinLockModal';
import confetti from 'canvas-confetti';
import { 
  auth, 
  onAuthUserChanged, 
  syncRecordsWithCloud, 
  saveRecordToCloud, 
  deleteRecordFromCloud, 
  subscribeToCloudRecords 
} from './services/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [records, setRecords] = useState<OvertimeRecord[]>(() => loadRecords());
  const [profile, setProfile] = useState<ManagerProfile>(() => loadManagerProfile());
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lancamentos');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<OvertimeRecord | null>(null);
  const [defaultDateForForm, setDefaultDateForForm] = useState<string | undefined>();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // Estados de Autenticação e Sincronização em Nuvem (Firebase Firestore)
  const [cloudUser, setCloudUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('controle_hora_extra_firebase_last_sync') || null;
  });

  // 2. Observador onAuthStateChanged(auth, (user) => { ... }) no carregamento da página
  // Verifica automaticamente se já existe um usuário logado e salvo na sessão local
  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (user) => {
      setCloudUser(user);
      if (user) {
        console.log('[Firebase] Usuário restaurado da sessão persistida:', user.email);
        setIsCloudSyncing(true);
        try {
          // 3. Reconectar e ativar a sincronização com o Firestore de forma automática
          const currentRecords = loadRecords();
          const syncRes = await syncRecordsWithCloud(user, currentRecords);
          if (syncRes.success) {
            if (syncRes.mergedRecords && syncRes.mergedRecords.length > 0) {
              setRecords(syncRes.mergedRecords);
              saveRecords(syncRes.mergedRecords);
            }
            setLastCloudSyncTime(syncRes.lastSync);
            localStorage.setItem('controle_hora_extra_firebase_last_sync', syncRes.lastSync);
          }
        } catch (error) {
          console.error('[Firebase] Erro na auto-sincronização na inicialização:', error);
        } finally {
          setIsCloudSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Listener em Tempo Real no Firestore (onSnapshot) vinculado ao UID do usuário logado
  // Garante que todas as alterações na nuvem sejam refletidas imediatamente
  useEffect(() => {
    if (!cloudUser) return;

    const unsubscribe = subscribeToCloudRecords(cloudUser.uid, (remoteRecords) => {
      if (remoteRecords && remoteRecords.length > 0) {
        setRecords(prev => {
          const map = new Map<string, OvertimeRecord>();
          prev.forEach(r => map.set(r.id, r));
          remoteRecords.forEach(r => map.set(r.id, r));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          saveRecords(merged);
          return merged;
        });
        const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setLastCloudSyncTime(now);
        localStorage.setItem('controle_hora_extra_firebase_last_sync', now);
      }
    });

    return () => unsubscribe();
  }, [cloudUser]);

  // Inicialização do Armazenamento Durável e Proteção Persistente contra perda de dados
  useEffect(() => {
    initDurableStorage(
      (hydratedRecords) => {
        setRecords(hydratedRecords);
      },
      (hydratedProfile) => {
        setProfile(hydratedProfile);
      }
    );

    // Escuta eventos de storage entre abas para manter tudo sincronizado sem sobrescrita
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
    if (profile.pinEnabled && profile.pinCode) {
      setIsPinModalOpen(true);
    } else {
      setShowSplash(false);
    }
  };

  const handlePinSuccess = () => {
    setIsPinModalOpen(false);
    setShowSplash(false);
  };

  // Toggle Theme handler
  const handleToggleTheme = () => {
    const newTheme: AppTheme = profile.theme === 'dark' ? 'light' : 'dark';
    setProfile(prev => ({ ...prev, theme: newTheme }));
  };

  // Sincronização em segundo plano no Firestore após mutações se o usuário estiver logado
  const syncWithCloudIfLoggedIn = (updatedRecords: OvertimeRecord[]) => {
    if (auth.currentUser) {
      syncRecordsWithCloud(auth.currentUser, updatedRecords)
        .then((res) => {
          if (res.success) {
            setLastCloudSyncTime(res.lastSync);
            localStorage.setItem('controle_hora_extra_firebase_last_sync', res.lastSync);
          }
        })
        .catch((e) => console.warn('[Firebase] Falha na auto-sincronização em segundo plano:', e));
    }
  };

  // CRUD actions
  const handleSaveRecord = (record: OvertimeRecord) => {
    setRecords(prev => {
      const exists = prev.some(r => r.id === record.id);
      const updated = exists ? prev.map(r => r.id === record.id ? record : r) : [record, ...prev];
      syncWithCloudIfLoggedIn(updated);
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

  const handleDeleteRecord = (id: string) => {
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveRecords(updated);
      syncWithCloudIfLoggedIn(updated);
      return updated;
    });
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
      syncWithCloudIfLoggedIn(updated);
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
      
      {/* 1. TELA INICIAL (SPLASH SCREEN / ABERTURA COM RELÓGIO DIGITAL E HE ANTES DA HORA) */}
      {showSplash ? (
        <SplashScreen
          onEnter={handleEnterFromSplash}
          profile={profile}
        />
      ) : (
        /* MAIN APPLICATION VIEW */
        <div className="flex-1 flex flex-col">
          {/* Top Application Header (Sem botões duplicados ou ícones inativos) */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenReportModal={() => setIsExportModalOpen(true)}
            onOpenDataModal={() => setIsDataModalOpen(true)}
            onBackToSplash={() => setShowSplash(true)}
            profile={profile}
            onToggleTheme={handleToggleTheme}
            cloudUser={cloudUser}
            isCloudSyncing={isCloudSyncing}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            {/* 2. ABA DE CADASTRO E LANÇAMENTOS (ÁREA / TABELA ÚNICA SEM DUPLICIDADES) */}
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
              />
            )}

            {/* 3. ABA CALENDÁRIO MENSAL (VISÃO DE CALENDÁRIO) */}
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

            {/* 4. ABA PERFIL DO GESTOR & SEGURANÇA */}
            {activeTab === 'perfil' && (
              <ManagerProfileView
                profile={profile}
                onUpdateProfile={(updated) => setProfile(updated)}
                records={records}
                onRecordsUpdated={(updated) => setRecords(updated)}
                cloudUser={cloudUser}
                isCloudSyncing={isCloudSyncing}
                lastCloudSync={lastCloudSyncTime}
              />
            )}

          </main>

          {/* Clean Modern Footer */}
          <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-4 mt-auto no-print transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-blue-600 dark:text-blue-400">Controle de Hora Extra (HE)</span>
                <span>•</span>
                <span>PWA • Gestor: {profile.name || 'Ativo'}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsDataModalOpen(true)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                >
                  Backup & Dados
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

      {/* MODAL: Bloqueio por PIN de 4 Dígitos & Biometria (Com Esqueci Minha Senha) */}
      <PinLockModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        profile={profile}
        onResetPinWithSecurityAnswer={() => {
          setProfile(prev => ({ ...prev, pinEnabled: false, pinCode: '' }));
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

      {/* MODAL: Gerador de Relatório (Semanal e Mensal) com PDF e WhatsApp */}
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
