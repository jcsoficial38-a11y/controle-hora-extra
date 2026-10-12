import React, { useState, useRef } from 'react';
import { ManagerProfile, AppTheme, AppColorTheme } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
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
  Sparkles
} from 'lucide-react';

interface ManagerProfileViewProps {
  profile: ManagerProfile;
  onUpdateProfile: (updated: ManagerProfile) => void;
}

export const ManagerProfileView: React.FC<ManagerProfileViewProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const [formData, setFormData] = useState<ManagerProfile>({ ...profile });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pinError, setPinError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeThemeConfig = COLOR_THEMES[formData.primaryColor] || COLOR_THEMES.blue;

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

                {/* Biometrics Toggle */}
                <div className="flex flex-col justify-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white">
                          Biometria / Face ID
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Desbloqueio biométrico rápido
                        </div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={formData.biometricsEnabled}
                      onChange={(e) => setFormData({ ...formData, biometricsEnabled: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
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

    </div>
  );
};
