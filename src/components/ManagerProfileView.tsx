import React, { useState, useRef, useEffect } from 'react';
import { ManagerProfile, AppTheme, AppColorTheme, OvertimeRecord } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { registerNativeBiometrics, verifyNativeBiometrics } from '../utils/biometrics';
import { 
  auth,
  connectWithGoogle, 
  disconnectFromFirebase, 
  onAuthUserChanged, 
  syncRecordsWithCloud,
  saveProfileToCloud 
} from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { TrashRecord, formatDateBr, formatHours } from '../utils/storage';
import { 
  User, 
  Mail, 
  Building, 
  Shield, 
  Lock, 
  Fingerprint, 
  Sun, 
  Moon, 
  Palette, 
  Save, 
  Camera, 
  Check, 
  KeyRound, 
  HelpCircle,
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Cloud, 
  Database, 
  LogOut, 
  ChevronDown,
  Trash2,
  RotateCcw,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Share2,
  Scan
} from 'lucide-react';

interface ManagerProfileViewProps {
  profile: ManagerProfile;
  onUpdateProfile: (updated: ManagerProfile) => void;
  records?: OvertimeRecord[];
  onRecordsUpdated?: (updated: OvertimeRecord[]) => void;
  cloudUser?: FirebaseUser | null;
  isCloudSyncing?: boolean;
  lastCloudSync?: string | null;
  trashRecords?: TrashRecord[];
  onRestoreFromTrash?: (id: string) => void;
  onDeletePermanentlyFromTrash?: (id: string) => void;
  onEmptyAllTrash?: () => void;
  onOpenReportModal?: () => void;
  onOpenDataModal?: () => void;
  onToggleTheme?: () => void;
}

type AccordionSection = 'pessoal' | 'seguranca' | 'lixeira' | 'relatorios' | 'aparencia';

export const ManagerProfileView: React.FC<ManagerProfileViewProps> = ({
  profile,
  onUpdateProfile,
  records = [],
  onRecordsUpdated,
  cloudUser,
  isCloudSyncing,
  lastCloudSync,
  trashRecords = [],
  onRestoreFromTrash,
  onDeletePermanentlyFromTrash,
  onEmptyAllTrash,
  onOpenReportModal,
  onOpenDataModal,
  onToggleTheme,
}) => {
  const [formData, setFormData] = useState<ManagerProfile>({ ...profile });
  const [personalSavedSuccess, setPersonalSavedSuccess] = useState(false);
  const [securitySavedSuccess, setSecuritySavedSuccess] = useState(false);
  const [appearanceSavedSuccess, setAppearanceSavedSuccess] = useState(false);
  const [pinError, setPinError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controle de Seções Expansíveis (Accordion)
  // Permite abrir/fechar individualmente cada seção
  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    pessoal: false,
    seguranca: false,
    lixeira: false,
    relatorios: false,
    aparencia: false,
  });

  const toggleSection = (section: AccordionSection) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Estados para integração com Firebase (Banco de Dados na Nuvem)
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(cloudUser || auth.currentUser);
  const [isSyncing, setIsSyncing] = useState<boolean>(isCloudSyncing || false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    lastCloudSync || localStorage.getItem('controle_hora_extra_firebase_last_sync')
  );
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados para fluxo de cadastro/ativação de biometria
  const [showEnrollmentModal, setShowEnrollmentModal] = useState<boolean>(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [enrollmentError, setEnrollmentError] = useState<string>('');

  // Estados para teste de chave biométrica
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState<string>('');

  const activeThemeConfig = COLOR_THEMES[formData.primaryColor] || COLOR_THEMES.blue;

  // Sincronizar dados externos quando alterados
  useEffect(() => {
    setFormData(prev => ({ ...prev, ...profile }));
  }, [profile]);

  useEffect(() => {
    if (cloudUser !== undefined) setAuthUser(cloudUser);
  }, [cloudUser]);

  useEffect(() => {
    if (isCloudSyncing !== undefined) setIsSyncing(isCloudSyncing);
  }, [isCloudSyncing]);

  useEffect(() => {
    if (lastCloudSync !== undefined) setLastSyncTime(lastCloudSync);
  }, [lastCloudSync]);

  // Monitorar autenticação Firebase
  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (user) => {
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 1. DADOS PESSOAIS: Upload de Avatar
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData((prev) => ({ ...prev, avatarUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. DADOS PESSOAIS: Salvar Alterações
  const handleSavePersonalInfo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor, informe seu nome completo.');
      return;
    }
    const updated: ManagerProfile = {
      ...profile,
      name: formData.name.trim(),
      email: formData.email.trim(),
      company: formData.company?.trim() || '',
      roleTitle: formData.roleTitle?.trim() || '',
      avatarUrl: formData.avatarUrl || '',
    };
    setFormData(updated);
    onUpdateProfile(updated);
    if (authUser) {
      saveProfileToCloud(authUser.uid, updated);
    }
    setPersonalSavedSuccess(true);
    setTimeout(() => setPersonalSavedSuccess(false), 3500);
  };

  // 2. SEGURANÇA & BIOMETRIA: Salvar Senha/PIN
  const handleSaveSecuritySettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');

    if (formData.pinEnabled) {
      if (!formData.pinCode || formData.pinCode.length !== 4 || !/^\d{4}$/.test(formData.pinCode)) {
        setPinError('O PIN deve conter exatamente 4 dígitos numéricos.');
        return;
      }
      if (!formData.securityAnswer?.trim()) {
        setPinError('Por favor, informe uma resposta de segurança para recuperação do PIN.');
        return;
      }
    }

    const updated: ManagerProfile = {
      ...profile,
      pinEnabled: formData.pinEnabled,
      pinCode: formData.pinCode,
      biometricsEnabled: formData.biometricsEnabled,
      biometricCredentialId: formData.biometricCredentialId,
      biometricsRegisteredAt: formData.biometricsRegisteredAt,
      securityQuestion: formData.securityQuestion,
      securityAnswer: formData.securityAnswer,
    };
    setFormData(updated);
    onUpdateProfile(updated);
    if (authUser) {
      saveProfileToCloud(authUser.uid, updated);
    }
    setSecuritySavedSuccess(true);
    setTimeout(() => setSecuritySavedSuccess(false), 3500);
  };

  // 2. SEGURANÇA: Cadastro de Biometria Nativa (WebAuthn Passkey)
  const handleConfirmEnrollment = async () => {
    setEnrollmentStatus('scanning');
    setEnrollmentError('');
    try {
      const result = await registerNativeBiometrics(formData.name);
      if (result.success) {
        setEnrollmentStatus('success');
        const updated: ManagerProfile = {
          ...formData,
          biometricsEnabled: true,
          biometricsRegisteredAt: new Date().toLocaleDateString('pt-BR'),
          biometricCredentialId: result.credentialId || formData.biometricCredentialId || 'registered_passkey',
        };
        setFormData(updated);
        onUpdateProfile(updated);
        setTimeout(() => {
          setShowEnrollmentModal(false);
          setEnrollmentStatus('idle');
          setEnrollmentError('');
        }, 1200);
      } else {
        setEnrollmentStatus('idle');
        setEnrollmentError(result.error || 'Falha ao autorizar leitura biométrica.');
      }
    } catch (err: any) {
      setEnrollmentStatus('idle');
      setEnrollmentError(err?.message || 'Erro ao acessar sensor biométrico.');
    }
  };

  const handleTestBiometrics = async () => {
    if (!formData.biometricCredentialId) return;
    setTestStatus('testing');
    setTestMsg('');
    try {
      const res = await verifyNativeBiometrics(formData.biometricCredentialId);
      if (res.success) {
        setTestStatus('success');
        setTestMsg('Leitura biométrica confirmada com sucesso!');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
        setTestMsg(res.error || 'Falha na validação biométrica.');
        setTimeout(() => setTestStatus('idle'), 3500);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMsg(err?.message || 'Erro ao comunicar com o leitor.');
      setTimeout(() => setTestStatus('idle'), 3500);
    }
  };

  const handleRemoveBiometrics = () => {
    const updated: ManagerProfile = {
      ...formData,
      biometricsEnabled: false,
      biometricCredentialId: undefined,
      biometricsRegisteredAt: undefined,
    };
    setFormData(updated);
    onUpdateProfile(updated);
  };

  // 4. RELATÓRIOS: Exportar Planilha CSV
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('Não há lançamentos de hora extra cadastrados para exportar.');
      return;
    }
    const headers = ['Data', 'Colaborador', 'Horas Extras', 'Status', 'Motivo', 'Valor/Hora (R$)', 'Tipo de HE'];
    const rows = records.map(r => [
      r.date,
      `"${(r.employeeName || '').replace(/"/g, '""')}"`,
      r.hours.toFixed(2).replace('.', ','),
      r.status === 'pago' ? 'Pago' : 'Pendente',
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      r.ratePerHour ? r.ratePerHour.toFixed(2).replace('.', ',') : '',
      `"${(r.overtimeType || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_horas_extras_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 4. NUVEM: Conectar Google
  const handleConnectGoogle = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const user = await connectWithGoogle();
      setAuthUser(user);
      const syncRes = await syncRecordsWithCloud(user, records, formData);
      if (syncRes.success) {
        setLastSyncTime(syncRes.lastSync);
        localStorage.setItem('controle_hora_extra_firebase_last_sync', syncRes.lastSync);
        if (onRecordsUpdated && syncRes.mergedRecords) {
          onRecordsUpdated(syncRes.mergedRecords);
        }
        setSyncFeedback({
          type: 'success',
          message: `Conectado com sucesso! Sincronizado Online (${syncRes.syncedCount} lançamentos no Firestore).`
        });
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setSyncFeedback({
          type: 'error',
          message: 'A janela de autenticação foi fechada antes de concluir o login.'
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: err?.message || 'Falha ao conectar com o Google.'
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!authUser) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const syncRes = await syncRecordsWithCloud(authUser, records, formData);
      if (syncRes.success) {
        setLastSyncTime(syncRes.lastSync);
        localStorage.setItem('controle_hora_extra_firebase_last_sync', syncRes.lastSync);
        if (onRecordsUpdated && syncRes.mergedRecords) {
          onRecordsUpdated(syncRes.mergedRecords);
        }
        setSyncFeedback({
          type: 'success',
          message: `Firestore sincronizado! ${syncRes.syncedCount} lançamentos confirmados na nuvem.`
        });
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Erro ao enviar dados para a nuvem.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromFirebase();
      setAuthUser(null);
      setLastSyncTime(null);
      localStorage.removeItem('controle_hora_extra_firebase_last_sync');
      setSyncFeedback({
        type: 'success',
        message: 'Desconectado da nuvem. Seus dados continuam preservados no dispositivo.'
      });
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Erro ao desconectar da nuvem.'
      });
    }
  };

  // 5. APARÊNCIA: Salvar Tema e Cor
  const handleSaveAppearance = () => {
    const updated: ManagerProfile = {
      ...profile,
      theme: formData.theme,
      primaryColor: formData.primaryColor,
    };
    onUpdateProfile(updated);
    if (authUser) {
      saveProfileToCloud(authUser.uid, updated);
    }
    setAppearanceSavedSuccess(true);
    setTimeout(() => setAppearanceSavedSuccess(false), 3000);
  };

  const securityQuestionsList = [
    'Qual é o nome da sua primeira escola?',
    'Qual é o nome do seu primeiro animal de estimação?',
    'Qual é o nome da sua cidade natal?',
    'Qual era o modelo do seu primeiro carro?',
    'Qual é o seu livro ou filme favorito?',
  ];

  const handleShareApp = () => {
    const appUrl = window.location.href;
    const message = `👋 Olá! Estou utilizando o aplicativo *Controle de Hora Extra (HE)* para gestão de jornada e horas extras da equipe. Acesse diretamente pelo link:\n\n🔗 ${appUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fade-in">
      
      {/* Bloco / Card Principal Único: Informações do Usuário + Lista de Configurações */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
        
        {/* Cabeçalho do Card: Informações do Usuário (Foto, Nome e E-mail) */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 to-white dark:from-slate-800/40 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="relative">
              {formData.avatarUrl ? (
                <img 
                  src={formData.avatarUrl} 
                  alt="Avatar" 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm" 
                />
              ) : (
                <div className={`w-14 h-14 rounded-2xl ${activeThemeConfig.lightBg} flex items-center justify-center ${activeThemeConfig.textColor} font-black text-xl shadow-inner border border-blue-200/50 dark:border-blue-800/40`}>
                  <User className="w-7 h-7" />
                </div>
              )}
              {authUser && (
                <span 
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" 
                  title="Sincronizado Online com Firebase"
                />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{formData.name || 'Perfil do Gestor'}</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formData.email || 'Configurações gerais, segurança e sincronização'}
              </p>
            </div>
          </div>

          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleShareApp}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            title="Compartilhar aplicativo no WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartilhar App</span>
          </button>
        </div>

        {/* Divisória elegante */}
        <div className="border-t border-slate-100 dark:border-slate-800" />

        {/* Lista de Itens Expansíveis (Accordion) integrados no mesmo card único */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">

          {/* ITEM 1: 👤 DADOS PESSOAIS */}
          <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('pessoal')}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-2xl ${activeThemeConfig.lightBg} border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-center ${activeThemeConfig.textColor} shrink-0`}>
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Dados Pessoais
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Nome Completo, E-mail/Login e Foto do Perfil
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {personalSavedSuccess && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Salvo
                </span>
              )}
              <div className={`p-2 rounded-xl text-slate-400 transition-transform duration-200 ${openSections.pessoal ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'rotate-0'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </button>

          {openSections.pessoal && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
                {/* Avatar e Botões de Foto */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div 
                    className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shadow-inner group relative cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    title="Clique para selecionar uma foto"
                  >
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2">
                        <User className="w-9 h-9 text-slate-400 mb-0.5" />
                        <span className="text-[10px] font-bold text-slate-400">Sem Foto</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                      <Camera className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer transition active:scale-95"
                    >
                      Enviar Foto
                    </button>
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 cursor-pointer transition active:scale-95"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Inputs de Identificação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Carlos Silva"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                        required
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      E-mail / Login *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="gestor@empresa.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Empresa / Organização
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.company || ''}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Ex: Minha Empresa Ltda"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                      />
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Cargo / Setor
                    </label>
                    <input
                      type="text"
                      value={formData.roleTitle || ''}
                      onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                      placeholder="Ex: Supervisor de Operações"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Salvar Dados Pessoais */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Os dados salvos aqui possuem prioridade total e nunca serão sobrescritos por apelidos genéricos do Google.
                </p>
                <button
                  type="button"
                  onClick={handleSavePersonalInfo}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer active:scale-95 shrink-0 ${activeThemeConfig.bgButton}`}
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ITEM 2: 🔒 SEGURANÇA & BIOMETRIA */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('seguranca')}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-2xl ${formData.pinEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Shield className="w-5 h-5 m-3" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Segurança & Biometria
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {formData.pinEnabled ? 'PIN Ativo • Protegido com Senha e Biometria' : 'Bloqueio Desativado • Acesso Direto'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${formData.pinEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {formData.pinEnabled ? 'Ativo' : 'Desativado'}
              </span>
              <div className={`p-2 rounded-xl text-slate-400 transition-transform duration-200 ${openSections.seguranca ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'rotate-0'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </button>

          {openSections.seguranca && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-5 animate-fade-in">
              
              {/* Switch de Ativação do PIN */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Exigir PIN / Biometria ao Abrir o Aplicativo
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quando ativo, bloqueia o acesso aos lançamentos até que a senha ou a digital seja informada.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={formData.pinEnabled}
                    onChange={(e) => setFormData({ ...formData, pinEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {formData.pinEnabled ? (
                <div className="space-y-4">
                  {/* PIN Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      PIN de 4 Dígitos Numéricos *
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="password"
                        maxLength={4}
                        value={formData.pinCode || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setFormData({ ...formData, pinCode: val });
                        }}
                        placeholder="••••"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-lg tracking-widest font-mono text-center focus:outline-none"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  {/* Bloco de Biometria / Passkey */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-2xl ${activeThemeConfig.lightBg} shrink-0`}>
                          <Fingerprint className={`w-5 h-5 ${activeThemeConfig.textColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              Biometria / Digital do Aparelho (Passkey)
                            </h4>
                            {formData.biometricCredentialId ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                <Check className="w-3 h-3" /> Cadastrada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Pendente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {formData.biometricCredentialId
                              ? 'Sua chave de acesso está cadastrada. Ao abrir o app, a digital será solicitada diretamente.'
                              : 'Cadastre a biometria para autorizar o desbloqueio com a digital ou Face ID do seu aparelho.'}
                          </p>
                        </div>
                      </div>

                      {formData.biometricCredentialId && (
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={formData.biometricsEnabled}
                            onChange={(e) => {
                              const updated = { ...formData, biometricsEnabled: e.target.checked };
                              setFormData(updated);
                              onUpdateProfile(updated);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      )}
                    </div>

                    {/* Botões da Biometria */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      {testMsg && (
                        <span className={`text-xs font-semibold ${testStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {testMsg}
                        </span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        {!formData.biometricCredentialId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowEnrollmentModal(true);
                              setEnrollmentStatus('idle');
                              setEnrollmentError('');
                            }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${activeThemeConfig.bgButton}`}
                          >
                            <Fingerprint className="w-4 h-4" />
                            <span>Cadastrar Biometria (Digital)</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleTestBiometrics}
                              disabled={testStatus === 'testing'}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              {testStatus === 'testing' ? 'Verificando...' : 'Testar Leitor'}
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveBiometrics}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              Remover
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pergunta de Segurança para Recuperação */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                      <HelpCircle className="w-4 h-4" />
                      <span>Pergunta de Segurança (Caso esqueça sua senha)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Pergunta
                        </label>
                        <select
                          value={formData.securityQuestion || securityQuestionsList[0]}
                          onChange={(e) => setFormData({ ...formData, securityQuestion: e.target.value })}
                          className="w-full p-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none"
                        >
                          {securityQuestionsList.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Resposta Secreta *
                        </label>
                        <input
                          type="text"
                          value={formData.securityAnswer || ''}
                          onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
                          placeholder="Digite sua resposta"
                          className="w-full p-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {pinError && (
                    <div className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200">
                      {pinError}
                    </div>
                  )}

                  {/* Botão Salvar Senha/PIN */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {securitySavedSuccess ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Configurações de segurança e PIN salvas com sucesso!</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        O PIN e a biometria serão solicitados diretamente na abertura do aplicativo.
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveSecuritySettings}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer active:scale-95 shrink-0 ${activeThemeConfig.bgButton}`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>Salvar Senha/PIN</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O aplicativo abrirá diretamente sem exigir senha. Para proteger os dados, ative a chave acima.
                  </p>
                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSaveSecuritySettings}
                      className={`px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${activeThemeConfig.bgButton}`}
                    >
                      Salvar Preferência
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ITEM 3: 🗑️ LIXEIRA LOCAL */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('lixeira')}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Lixeira Local
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {trashRecords.length === 0 
                    ? 'Nenhum lançamento excluído' 
                    : `${trashRecords.length} ${trashRecords.length === 1 ? 'registro aguardando restauração' : 'registros aguardando restauração'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {trashRecords.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500 text-white shadow-xs">
                  {trashRecords.length}
                </span>
              )}
              <div className={`p-2 rounded-xl text-slate-400 transition-transform duration-200 ${openSections.lixeira ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'rotate-0'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </button>

          {openSections.lixeira && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-fade-in">
              {trashRecords.length > 0 ? (
                <>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Lançamentos excluídos preservados na memória do aparelho:
                    </span>
                    {onEmptyAllTrash && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Tem certeza de que deseja esvaziar permanentemente toda a lixeira?')) {
                            onEmptyAllTrash();
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Esvaziar Lixeira</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {trashRecords.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.employeeName}
                            </span>
                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                              {formatHours(item.hours)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Data: {formatDateBr(item.date)}</span>
                            {item.reason && <span>• Motivo: {item.reason}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {onRestoreFromTrash && (
                            <button
                              type="button"
                              onClick={() => onRestoreFromTrash(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                              title="Restaurar para a lista de lançamentos"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restaurar</span>
                            </button>
                          )}
                          {onDeletePermanentlyFromTrash && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Excluir definitivamente o lançamento de ${item.employeeName}?`)) {
                                  onDeletePermanentlyFromTrash(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Excluir definitivamente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    A Lixeira Local está vazia
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Quando você excluir um lançamento de hora extra, ele será movido para cá temporariamente para que você possa visualizá-lo ou restaurá-lo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ITEM 4: 📊 RELATÓRIOS E DADOS */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('relatorios')}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Relatórios e Dados
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Exportação de relatórios, CSV, backup e Firestore Sync
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${authUser ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {authUser ? 'Nuvem Conectada' : 'Local'}
              </span>
              <div className={`p-2 rounded-xl text-slate-400 transition-transform duration-200 ${openSections.relatorios ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'rotate-0'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </button>

          {openSections.relatorios && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-6 animate-fade-in">
              
              {/* Seção de Exportações e Backup */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Exportação de Relatórios e Arquivos</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: Gerar Relatório PDF / WhatsApp */}
                  {onOpenReportModal && (
                    <button
                      type="button"
                      onClick={onOpenReportModal}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 group-hover:underline">Abrir</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Relatório PDF / WhatsApp
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Gere relatórios semanais ou mensais para impressão e envio direto.
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Card 2: Exportar CSV (Excel) */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> Baixar
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        Exportar Relatório CSV
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Baixe planilha estruturada para Excel, Google Planilhas ou relatórios de RH.
                      </p>
                    </div>
                  </button>

                  {/* Card 3: Backup & Dados */}
                  {onOpenDataModal && (
                    <button
                      type="button"
                      onClick={onOpenDataModal}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                          <Database className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-600 group-hover:underline">Gerenciar</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Backup e Dados
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Crie cópias de segurança em arquivo JSON e restaure histórico local.
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Seção: Banco de Dados na Nuvem (Firebase / Firestore) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    <span>Banco de Dados na Nuvem (Firebase Firestore)</span>
                  </h4>

                  {authUser ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Sincronizado Online</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Somente Armazenamento Local
                    </span>
                  )}
                </div>

                {syncFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold mb-3 flex items-center gap-2 ${syncFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'}`}>
                    {syncFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{syncFeedback.message}</span>
                  </div>
                )}

                {!authUser ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                      Conecte sua conta Google para salvar e sincronizar todos os registros em tempo real no Firestore, mantendo seus dados protegidos na nuvem.
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isSyncing}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-bold text-xs text-slate-800 dark:text-white shadow-xs hover:bg-slate-50 transition cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{isSyncing ? 'Conectando...' : 'Conectar com Google (Ativar Nuvem)'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Conectado como: {authUser.displayName || authUser.email}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {authUser.email} • {lastSyncTime ? `Última sincronização às ${lastSyncTime}` : 'Sincronização em tempo real ativa'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleManualSync}
                          disabled={isSyncing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer disabled:opacity-60"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 cursor-pointer"
                        >
                          Desconectar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ITEM 5: 🎨 APARÊNCIA & TEMA */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('aparencia')}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-2xl ${activeThemeConfig.lightBg} border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-center ${activeThemeConfig.textColor} shrink-0`}>
                <Palette className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Aparência & Tema
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {formData.theme === 'dark' ? 'Tema Escuro (Modo Noturno)' : 'Tema Claro'} • Cor: {activeThemeConfig.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {appearanceSavedSuccess && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Salvo
                </span>
              )}
              <div className={`p-2 rounded-xl text-slate-400 transition-transform duration-200 ${openSections.aparencia ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'rotate-0'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </button>

          {openSections.aparencia && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-6 animate-fade-in">
              
              {/* Modo Noturno (Claro / Escuro) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Modo de Exibição
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, theme: 'light' });
                      if (onToggleTheme && profile.theme === 'dark') {
                        onToggleTheme();
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                      formData.theme === 'light'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Tema Claro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, theme: 'dark' });
                      if (onToggleTheme && profile.theme === 'light') {
                        onToggleTheme();
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                      formData.theme === 'dark'
                        ? 'border-blue-600 bg-slate-800 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Tema Escuro</span>
                  </button>
                </div>
              </div>

              {/* Seletor de Cores Principais */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Cor Principal do Sistema
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {(Object.keys(COLOR_THEMES) as AppColorTheme[]).map((colorKey) => {
                    const conf = COLOR_THEMES[colorKey];
                    const isSelected = formData.primaryColor === colorKey;

                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setFormData({ ...formData, primaryColor: colorKey })}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 dark:border-white shadow-md scale-102 bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span 
                          className="w-7 h-7 rounded-full shadow-inner flex items-center justify-center text-white"
                          style={{ backgroundColor: conf.primary }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 text-center">
                          {conf.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botão Salvar Aparência */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                {appearanceSavedSuccess ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Tema e cores aplicados com sucesso!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    As preferências visuais serão aplicadas a todas as telas do aplicativo.
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAppearance}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer active:scale-95 shrink-0 ${activeThemeConfig.bgButton}`}
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Preferências Visuais</span>
                </button>
              </div>

            </div>
          )}
        </div>

        </div>
      </div>

      {/* Modal de Cadastro Biométrico (Chave Passkey) */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4">
            <div className={`w-14 h-14 rounded-2xl ${activeThemeConfig.lightBg} flex items-center justify-center mx-auto text-blue-600 shadow-sm`}>
              <Fingerprint className="w-7 h-7" />
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Cadastrar Biometria (Digital)
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              O navegador solicitará a confirmação da sua digital ou Face ID para gerar a chave de acesso neste dispositivo.
            </p>

            {enrollmentError && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{enrollmentError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEnrollmentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEnrollment}
                disabled={enrollmentStatus === 'scanning'}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer ${activeThemeConfig.bgButton} disabled:opacity-60`}
              >
                {enrollmentStatus === 'scanning' ? 'Aguardando Leitor...' : 'Autorizar Leitura'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
