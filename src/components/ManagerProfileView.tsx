import React, { useState, useRef, useEffect } from 'react';
import { ManagerProfile, AppTheme, AppColorTheme, OvertimeRecord } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { registerNativeBiometrics, verifyNativeBiometrics } from '../utils/biometrics';
import { 
  TrashRecord, 
  formatDateBr, 
  formatHours, 
  saveRecords, 
  saveManagerProfile, 
  saveTrashRecords,
  loadRecords,
  loadTrashRecords
} from '../utils/storage';
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
  Database, 
  LogOut, 
  ChevronDown,
  Trash2,
  RotateCcw,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  Share2,
  Scan
} from 'lucide-react';

interface ManagerProfileViewProps {
  profile: ManagerProfile;
  onUpdateProfile: (updated: ManagerProfile) => void;
  records?: OvertimeRecord[];
  onRecordsUpdated?: (updated: OvertimeRecord[]) => void;
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
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Controle de Seções Expansíveis (Accordion) - Todas fechadas por padrão (Lixeira retrátil)
  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    pessoal: false,
    seguranca: false,
    lixeira: false,      // Lixeira retrátil (fechada por padrão)
    relatorios: false,
    aparencia: false,
  });

  const toggleSection = (section: AccordionSection) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Estados para fluxo de cadastro/ativação de biometria
  const [showEnrollmentModal, setShowEnrollmentModal] = useState<boolean>(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [enrollmentError, setEnrollmentError] = useState<string>('');

  // Estados para teste de chave biométrica
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState<string>('');

  const activeThemeConfig = COLOR_THEMES[formData.primaryColor] || COLOR_THEMES.blue;

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...profile }));
  }, [profile]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setFormData(prev => ({ ...prev, avatarUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePersonalInfo = () => {
    const updated: ManagerProfile = {
      ...profile,
      name: formData.name,
      email: formData.email,
      company: formData.company,
      roleTitle: formData.roleTitle,
      avatarUrl: formData.avatarUrl,
    };
    onUpdateProfile(updated);
    saveManagerProfile(updated);
    setPersonalSavedSuccess(true);
    setTimeout(() => setPersonalSavedSuccess(false), 3000);
  };

  const handleSaveSecuritySettings = () => {
    if (formData.pinEnabled && (!formData.pinCode || formData.pinCode.length !== 4)) {
      setPinError('O PIN deve conter exatamente 4 dígitos numéricos.');
      return;
    }
    setPinError('');
    const updated: ManagerProfile = {
      ...profile,
      pinEnabled: formData.pinEnabled,
      pinCode: formData.pinCode,
      biometricsEnabled: formData.biometricsEnabled,
      biometricCredentialId: formData.biometricCredentialId,
      securityQuestion: formData.securityQuestion,
      securityAnswer: formData.securityAnswer,
    };
    onUpdateProfile(updated);
    saveManagerProfile(updated);
    setSecuritySavedSuccess(true);
    setTimeout(() => setSecuritySavedSuccess(false), 3000);
  };

  const handleConfirmEnrollment = async () => {
    setEnrollmentStatus('scanning');
    setEnrollmentError('');
    try {
      const res = await registerNativeBiometrics(formData.email || 'gestor');
      if (res.success && res.credentialId) {
        const updated = {
          ...formData,
          biometricCredentialId: res.credentialId,
          biometricsEnabled: true,
          pinEnabled: true,
        };
        setFormData(updated);
        onUpdateProfile(updated);
        saveManagerProfile(updated);
        setEnrollmentStatus('success');
        setTimeout(() => {
          setShowEnrollmentModal(false);
          setEnrollmentStatus('idle');
        }, 1200);
      } else {
        setEnrollmentError(res.error || 'Não foi possível registrar a biometria neste dispositivo.');
        setEnrollmentStatus('idle');
      }
    } catch (err: any) {
      setEnrollmentError(err?.message || 'Erro no leitor biométrico.');
      setEnrollmentStatus('idle');
    }
  };

  const handleRemoveBiometrics = () => {
    const updated = {
      ...formData,
      biometricCredentialId: '',
      biometricsEnabled: false,
    };
    setFormData(updated);
    onUpdateProfile(updated);
    saveManagerProfile(updated);
  };

  const handleTestBiometrics = async () => {
    if (!formData.biometricCredentialId) return;
    setTestStatus('testing');
    setTestMsg('Aguardando leitura biométrica...');
    try {
      const ok = await verifyNativeBiometrics();
      if (ok) {
        setTestStatus('success');
        setTestMsg('Biometria verificada com sucesso!');
      } else {
        setTestStatus('error');
        setTestMsg('Falha na verificação da digital.');
      }
    } catch {
      setTestStatus('error');
      setTestMsg('Erro no sensor biométrico.');
    }
    setTimeout(() => {
      setTestStatus('idle');
      setTestMsg('');
    }, 3500);
  };

  const handleSaveAppearance = () => {
    const updated: ManagerProfile = {
      ...profile,
      theme: formData.theme,
      primaryColor: formData.primaryColor,
    };
    onUpdateProfile(updated);
    saveManagerProfile(updated);
    setAppearanceSavedSuccess(true);
    setTimeout(() => setAppearanceSavedSuccess(false), 3000);
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('Não há registros para exportar.');
      return;
    }
    const headers = ['ID', 'Colaborador', 'Data', 'Horas', 'Status', 'Motivo'];
    const rows = records.map(r => [
      r.id,
      `"${r.employeeName || ''}"`,
      r.date,
      r.hours,
      r.status,
      `"${r.reason || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_horas_extras_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. Sistema de Backup & Restauração via Arquivo JSON
  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: profile,
      records: records,
      trash: trashRecords,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_app_controle_he_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.records && Array.isArray(json.records)) {
          saveRecords(json.records);
          if (onRecordsUpdated) onRecordsUpdated(json.records);
        }
        if (json.profile) {
          saveManagerProfile(json.profile);
          onUpdateProfile(json.profile);
        }
        if (json.trash && Array.isArray(json.trash)) {
          saveTrashRecords(json.trash);
        }
        alert('Backup restaurado com sucesso! O aplicativo será recarregado.');
        window.location.reload();
      } catch (err) {
        alert('Erro ao processar o arquivo de backup JSON. Verifique se o arquivo é válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetTotal = () => {
    if (confirm('ATENÇÃO: Tem certeza absoluta de que deseja realizar o RESET TOTAL? Todos os registros, configurações, senha e lixeira serão apagados permanentemente do aparelho.')) {
      localStorage.clear();
      localStorage.setItem('controle_hora_extra_initialized_flag', 'true');
      localStorage.setItem('controle_hora_extra_records_v1', JSON.stringify([]));
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('ControleHoraExtraDB');
      }
      if (onRecordsUpdated) onRecordsUpdated([]);
      alert('Aplicativo resetado com sucesso.');
      window.location.reload();
    }
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
    const message = `👋 Olá! Estou utilizando o aplicativo *Controle de Hora Extra (HE)* para gestão de jornada e horas extras. Acesse diretamente:\n\n🔗 ${appUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fade-in space-y-4">
      
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
              <span 
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" 
                title="Modo 100% Local Ativo"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{formData.name || 'Perfil do Gestor'}</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formData.email || 'Configurações, segurança e backup local'}
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Os dados salvos aqui possuem prioridade total no armazenamento local permanente.
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
                                saveManagerProfile(updated);
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        )}
                      </div>

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

          {/* ITEM 3: 🗑️ LIXEIRA LOCAL RETRÁTIL (Fechada por padrão) */}
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

          {/* ITEM 4: 📊 RELATÓRIOS E BACKUP DE DADOS (COM SISTEMA DE BACKUP JSON) */}
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
                    Relatórios e Backup de Dados
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Exportação CSV, Backup JSON completo e Reset Total
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  100% Local
                </span>
                <div className={`p-2 rounded-xl text-slate-400 transition-transform duration-200 ${openSections.relatorios ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'rotate-0'}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </button>

            {openSections.relatorios && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-6 animate-fade-in">
                
                {/* Exportações e Relatórios */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Relatórios e Planilhas</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            Gere relatórios para impressão e envio direto.
                          </p>
                        </div>
                      </button>
                    )}

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
                          Baixe planilha estruturada para Excel ou Google Planilhas.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sistema de Backup & Restauração via Arquivo JSON */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    <span>Backup & Dados Locais (Arquivo JSON)</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Faça o backup completo do seu banco de dados local ou restaure seus dados a partir de um arquivo salvo anteriormente.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* 1. Exportar Backup */}
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-left hover:bg-purple-100/70 transition cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-purple-200 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                          <Download className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 group-hover:underline">Baixar .json</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Exportar Backup
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Baixa instantaneamente o arquivo backup_app.json.
                        </p>
                      </div>
                    </button>

                    {/* 2. Importar Backup */}
                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-left hover:bg-blue-100/70 transition cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-blue-200 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 group-hover:underline">Selecionar</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Importar Backup
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Restaura o banco completo em 1 segundo via arquivo .json.
                        </p>
                      </div>
                    </button>
                    <input
                      type="file"
                      ref={backupFileInputRef}
                      onChange={handleImportBackupFile}
                      accept=".json"
                      className="hidden"
                    />

                    {/* 3. Reset Total */}
                    <button
                      type="button"
                      onClick={handleResetTotal}
                      className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-left hover:bg-rose-100/70 transition cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 group-hover:underline">Apagar Tudo</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Reset Total
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Zera o aplicativo do começo e limpa o armazenamento.
                        </p>
                      </div>
                    </button>
                  </div>
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
