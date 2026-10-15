import React, { useState, useRef, useEffect } from 'react';
import { ManagerProfile, AppTheme, AppColorTheme, OvertimeRecord } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { registerNativeBiometrics, verifyNativeBiometrics } from '../utils/biometrics';
import { 
  auth,
  connectWithGoogle, 
  disconnectFromFirebase, 
  onAuthUserChanged, 
  syncRecordsWithCloud 
} from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';
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
  Share2, 
  Save, 
  Camera, 
  Check, 
  KeyRound, 
  HelpCircle,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Scan,
  CheckCircle2,
  X,
  AlertTriangle,
  RefreshCw,
  Cloud,
  Database,
  LogOut,
  Globe
} from 'lucide-react';

interface ManagerProfileViewProps {
  profile: ManagerProfile;
  onUpdateProfile: (updated: ManagerProfile) => void;
  records?: OvertimeRecord[];
  onRecordsUpdated?: (updated: OvertimeRecord[]) => void;
  cloudUser?: FirebaseUser | null;
  isCloudSyncing?: boolean;
  lastCloudSync?: string | null;
}

export const ManagerProfileView: React.FC<ManagerProfileViewProps> = ({
  profile,
  onUpdateProfile,
  records = [],
  onRecordsUpdated,
  cloudUser,
  isCloudSyncing,
  lastCloudSync,
}) => {
  const [formData, setFormData] = useState<ManagerProfile>({ ...profile });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pinError, setPinError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para integração com Firebase (Banco de Dados na Nuvem)
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(cloudUser || auth.currentUser);
  const [authLoading, setAuthLoading] = useState<boolean>(!cloudUser && !auth.currentUser);
  const [isSyncing, setIsSyncing] = useState<boolean>(isCloudSyncing || false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    lastCloudSync || localStorage.getItem('controle_hora_extra_firebase_last_sync')
  );
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sincronizar com props fornecidas por App.tsx
  useEffect(() => {
    if (cloudUser !== undefined) {
      setAuthUser(cloudUser);
      setAuthLoading(false);
    }
  }, [cloudUser]);

  useEffect(() => {
    if (isCloudSyncing !== undefined) {
      setIsSyncing(isCloudSyncing);
    }
  }, [isCloudSyncing]);

  useEffect(() => {
    if (lastCloudSync !== undefined) {
      setLastSyncTime(lastCloudSync);
    }
  }, [lastCloudSync]);

  // Monitorar autenticação do Firebase e garantir auto-sincronização na inicialização
  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (user) => {
      setAuthUser(user);
      setAuthLoading(false);
      // Se o usuário já estiver salvo na sessão, ativa a sincronização com o Firestore automaticamente
      if (user && !lastSyncTime) {
        setIsSyncing(true);
        try {
          const syncRes = await syncRecordsWithCloud(user, records);
          if (syncRes.success) {
            setLastSyncTime(syncRes.lastSync);
            localStorage.setItem('controle_hora_extra_firebase_last_sync', syncRes.lastSync);
            if (onRecordsUpdated && syncRes.mergedRecords) {
              onRecordsUpdated(syncRes.mergedRecords);
            }
          }
        } catch (err) {
          console.warn('[Firebase] Erro na auto-sincronização de abertura:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    });
    return () => unsubscribe();
  }, [records, onRecordsUpdated, lastSyncTime]);

  // Conectar com Google e sincronizar automaticamente
  const handleConnectGoogle = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const user = await connectWithGoogle();
      setAuthUser(user);
      // Sincronização automática com Firestore ao conectar
      const syncRes = await syncRecordsWithCloud(user, records);
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
      } else {
        setSyncFeedback({
          type: 'error',
          message: syncRes.error || 'Conectado, mas ocorreu uma falha ao sincronizar com o Firestore.'
        });
      }
    } catch (err: any) {
      console.error('[Firebase] Erro ao conectar:', err);
      // Tratar popup fechado pelo usuário com mensagem amigável
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

  // Sincronizar manualmente
  const handleManualSync = async () => {
    if (!authUser) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const syncRes = await syncRecordsWithCloud(authUser, records);
      if (syncRes.success) {
        setLastSyncTime(syncRes.lastSync);
        localStorage.setItem('controle_hora_extra_firebase_last_sync', syncRes.lastSync);
        if (onRecordsUpdated && syncRes.mergedRecords) {
          onRecordsUpdated(syncRes.mergedRecords);
        }
        setSyncFeedback({
          type: 'success',
          message: `Firestore sincronizado! Sincronizado Online com ${syncRes.syncedCount} registros confirmados na nuvem.`
        });
        setTimeout(() => setSyncFeedback(null), 5000);
      } else {
        setSyncFeedback({
          type: 'error',
          message: syncRes.error || 'Erro ao sincronizar com o Firestore.'
        });
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

  // Desconectar da nuvem
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

  // Estados para fluxo de cadastro/ativação de biometria
  const [showEnrollmentModal, setShowEnrollmentModal] = useState<boolean>(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [enrollmentError, setEnrollmentError] = useState<string>('');

  // Estados para teste de autenticação biométrica dentro do app
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState<string>('');

  const activeThemeConfig = COLOR_THEMES[formData.primaryColor] || COLOR_THEMES.blue;

  // Iniciar cadastro de biometria (criação única de chave passkey)
  const handleStartEnrollment = () => {
    setShowEnrollmentModal(true);
    setEnrollmentStatus('idle');
    setEnrollmentError('');
  };

  // Confirmar leitura e cadastrar biometria no aparelho usando API Nativa (create passkey)
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
      setEnrollmentError(err?.message || 'Erro inesperado ao acessar o sensor.');
    }
  };

  // Alternar ativação de biometria (se já cadastrada)
  const handleToggleBiometrics = (enabled: boolean) => {
    if (enabled && !formData.biometricCredentialId) {
      handleStartEnrollment();
      return;
    }
    const updated: ManagerProfile = {
      ...formData,
      biometricsEnabled: enabled,
    };
    setFormData(updated);
    onUpdateProfile(updated);
  };

  // Testar leitura da chave de biometria já cadastrada (apenas authenticate/get, sem create)
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

  // Remover cadastro de biometria do app
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

  const securityQuestionsList = [
    'Qual é o nome da sua primeira escola?',
    'Qual é o nome do seu primeiro animal de estimação?',
    'Qual é o nome da sua cidade natal?',
    'Qual era o modelo do seu primeiro carro?',
    'Qual é o seu livro ou filme favorito?',
  ];

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

  const handleShareOnWhatsApp = () => {
    const appUrl = window.location.href;
    const message = `👋 Olá! Estou utilizando o aplicativo *Controle de Hora Extra (HE)* para gestão de jornada e horas extras da equipe. Acesse diretamente pelo link:\n\n🔗 ${appUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    setPinError('');
    onUpdateProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <User className={`w-6 h-6 ${activeThemeConfig.textColor}`} />
            <span>Perfil do Gestor & Preferências</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personalize suas credenciais, segurança por PIN, tema claro/escuro e cores do sistema.
          </p>
        </div>

        {/* WhatsApp Share Button */}
        <button
          type="button"
          onClick={handleShareOnWhatsApp}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
          title="Compartilhar link do aplicativo no WhatsApp"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartilhar App no WhatsApp</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Card 1: Informações Pessoais & Avatar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className={`w-4 h-4 ${activeThemeConfig.textColor}`} />
            <span>Identificação do Gestor</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Uploader */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:border-blue-500 transition shadow-inner">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <User className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold">Foto</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                <Camera className="w-6 h-6" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Carlos Silva"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail do Gestor
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="gestor@empresa.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
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
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Segurança & Bloqueio por PIN */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className={`w-4 h-4 ${activeThemeConfig.textColor}`} />
              <span>Segurança e Bloqueio de Acesso</span>
            </h2>

            {/* Toggle PIN */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pinEnabled}
                onChange={(e) => setFormData({ ...formData, pinEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {formData.pinEnabled ? 'PIN Ativado' : 'PIN Desativado'}
              </span>
            </label>
          </div>

          {formData.pinEnabled ? (
            <div className="space-y-4 pt-1 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 4 Digit PIN input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    PIN de 4 Dígitos *
                  </label>
                  <div className="relative">
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
                  <p className="text-[11px] text-slate-400 mt-1">
                    Será solicitado na tela inicial antes de acessar os dados.
                  </p>
                </div>

                {/* 2. Opção para Cadastrar Biometria (Chave de Acesso / Passkey - Única Vez) */}
                <div className="col-span-1 sm:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-2xl ${activeThemeConfig.lightBg} border border-blue-200/50 dark:border-blue-800/40 mt-0.5`}>
                        <Fingerprint className={`w-6 h-6 ${activeThemeConfig.textColor}`} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            Biometria / Face ID (Chave de Acesso)
                          </h4>
                          {formData.biometricCredentialId ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <Check className="w-3 h-3" /> Chave Cadastrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="w-2.5 h-2.5" /> Não Cadastrada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                          {formData.biometricCredentialId
                            ? 'Sua chave de acesso foi gerada e está salva neste dispositivo. Ative ou desative o uso da biometria no desbloqueio sem precisar cadastrar novamente.'
                            : 'Cadastre a biometria uma única vez nas configurações para gerar e salvar sua chave de acesso (Passkey) neste aparelho. Após o cadastro, o leitor nativo autenticará rapidamente na tela de bloqueio.'}
                        </p>
                      </div>
                    </div>

                    {/* Switch de Ativação (se cadastrada) */}
                    {formData.biometricCredentialId && (
                      <div className="flex items-center gap-3 sm:self-center pl-11 sm:pl-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.biometricsEnabled}
                            onChange={(e) => handleToggleBiometrics(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Feedback de Teste de Autenticação */}
                  {testMsg && (
                    <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      testStatus === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
                    }`}>
                      {testStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <span>{testMsg}</span>
                    </div>
                  )}

                  {/* Barra de Ações: Cadastrar, Testar ou Desativar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {!formData.biometricCredentialId ? (
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Pendente: Faça o cadastro único da biometria ao lado</span>
                        </span>
                      ) : formData.biometricsEnabled ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Biometria ativa para desbloqueio {formData.biometricsRegisteredAt ? `(Cadastrada em ${formData.biometricsRegisteredAt})` : ''}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Chave salva, mas desbloqueio biométrico pausado (usando apenas PIN)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!formData.biometricCredentialId ? (
                        <button
                          type="button"
                          onClick={handleStartEnrollment}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer active:scale-95 ${activeThemeConfig.bgButton}`}
                        >
                          <Fingerprint className="w-4 h-4" />
                          <span>Cadastrar Biometria</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleTestBiometrics}
                            disabled={testStatus === 'testing'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition cursor-pointer"
                          >
                            <Scan className="w-3.5 h-3.5" />
                            <span>{testStatus === 'testing' ? 'Verificando...' : 'Testar Biometria'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStartEnrollment}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Recadastrar</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveBiometrics}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <span>Remover</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Pergunta e Resposta de Segurança para Recuperação */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <span>Pergunta de Segurança (Para Recuperação de Senha)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Pergunta Selecionada
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
                      Sua Resposta Secreta *
                    </label>
                    <input
                      type="text"
                      value={formData.securityAnswer || ''}
                      onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
                      placeholder="Ex: Escola Municipal"
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
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
              O aplicativo abrirá diretamente sem solicitar senha ao entrar. Para proteger o acesso aos lançamentos, ative a chave acima.
            </div>
          )}
        </div>

        {/* Card: Banco de Dados na Nuvem (Firebase / Firestore) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className={`w-4 h-4 ${activeThemeConfig.textColor}`} />
              <span>Banco de Dados na Nuvem</span>
            </h2>

            {/* Indicador de Status Firestore */}
            <div>
              {authUser ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Firestore Conectado</span>
                  <span className="text-emerald-600 dark:text-emerald-400">•</span>
                  <span>Sincronizado Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>Armazenamento Local Ativo</span>
                </span>
              )}
            </div>
          </div>

          {/* Feedback de Sincronização / Conexão */}
          {syncFeedback && (
            <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
            }`}>
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span className="flex-1">{syncFeedback.message}</span>
            </div>
          )}

          {/* Conteúdo: Não Conectado vs Conectado */}
          {!authUser ? (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>Sincronização em Tempo Real com Firestore</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Conecte sua conta Google para salvar e sincronizar seus lançamentos de horas extras diretamente no banco de dados na nuvem Firebase Firestore. Seus dados ficam protegidos e disponíveis em qualquer aparelho.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Backup automático contínuo com segurança do Google Cloud</span>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isSyncing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border-2 border-slate-300 dark:border-slate-600 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 disabled:opacity-60"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      {/* Ícone oficial do Google em SVG */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Conectar com Google (Ativar Nuvem)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Dados do Usuário Logado */}
                <div className="flex items-center gap-3">
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={authUser.displayName || 'Google'}
                      className="w-12 h-12 rounded-2xl border-2 border-emerald-500 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {(authUser.displayName || authUser.email || 'G').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Conectado como:
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {authUser.displayName || authUser.email}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {authUser.email}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Firestore Conectado / Sincronizado Online</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas e Última Sincronização */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Registros na Nuvem</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">{records.length} itens</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Última Sincronização</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      {lastSyncTime ? `Hoje às ${lastSyncTime}` : 'Automática'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Ações: Sincronizar Agora & Desconectar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Qualquer novo lançamento ou alteração é salvo localmente e replicado para o Firestore.
                </p>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Temas e Paleta de Cores */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Palette className={`w-4 h-4 ${activeThemeConfig.textColor}`} />
            <span>Personalização Visual & Temas</span>
          </h2>

          {/* Alternador de Tema: Claro vs Escuro (Dark Mode) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Modo de Exibição
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, theme: 'light' })}
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
                onClick={() => setFormData({ ...formData, theme: 'dark' })}
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

          {/* Seletor de Cores do App */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Cor Principal do Aplicativo
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

        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-bounce">
              <Check className="w-4 h-4" />
              <span>Configurações e preferências salvas com sucesso!</span>
            </div>
          )}

          <div className="ml-auto">
            <button
              type="submit"
              className={`px-8 py-3 rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer active:scale-95 text-white ${activeThemeConfig.bgButton}`}
            >
              <Save className="w-4 h-4" />
              <span>Salvar Preferências</span>
            </button>
          </div>
        </div>

      </form>

      {/* Modal de Cadastro / Ativação de Biometria */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint className={`w-5 h-5 ${activeThemeConfig.textColor}`} />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cadastrar Biometria / Face ID
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEnrollmentModal(false);
                  setEnrollmentStatus('idle');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 flex flex-col items-center justify-center">
              <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                enrollmentStatus === 'scanning'
                  ? 'bg-blue-50 dark:bg-blue-950/60 ring-8 ring-blue-500/20'
                  : enrollmentStatus === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 ring-8 ring-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}>
                {enrollmentStatus === 'success' ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-scale-up" />
                ) : (
                  <Fingerprint className={`w-12 h-12 ${
                    enrollmentStatus === 'scanning' ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-slate-700 dark:text-slate-300'
                  }`} />
                )}

                {enrollmentStatus === 'scanning' && (
                  <div className="absolute inset-x-3 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full animate-bounce" />
                )}
              </div>

              <div className="mt-4">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {enrollmentStatus === 'idle' && 'Cadastro Único de Chave de Acesso'}
                  {enrollmentStatus === 'scanning' && 'Aguardando validação do sensor biométrico...'}
                  {enrollmentStatus === 'success' && 'Chave de acesso criada e salva com sucesso!'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  {enrollmentStatus === 'idle' && 'Esta etapa cria sua chave de acesso (Passkey) uma única vez no dispositivo. Na tela de bloqueio, será solicitada apenas a verificação rápida.'}
                  {enrollmentStatus === 'scanning' && 'Toque no leitor de digital ou olhe para o sensor de Face ID do aparelho.'}
                  {enrollmentStatus === 'success' && 'A biometria foi ativada. Você já pode utilizá-la no desbloqueio.'}
                </p>
                {enrollmentError && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {enrollmentError}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {enrollmentStatus !== 'success' && (
                <button
                  type="button"
                  onClick={handleConfirmEnrollment}
                  disabled={enrollmentStatus === 'scanning'}
                  className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 ${activeThemeConfig.bgButton}`}
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{enrollmentStatus === 'scanning' ? 'Registrando Chave...' : 'Criar e Cadastrar Chave de Acesso'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowEnrollmentModal(false);
                  setEnrollmentStatus('idle');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {enrollmentStatus === 'success' ? 'Concluir' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
