import React, { useState, useEffect, useRef } from 'react';
import { ManagerProfile } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { verifyNativeBiometrics } from '../utils/biometrics';
import { 
  Lock, 
  Fingerprint, 
  X, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile: ManagerProfile;
  onResetPinWithSecurityAnswer?: () => void;
  isMandatory?: boolean;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profile,
  onResetPinWithSecurityAnswer,
  isMandatory = false,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [securityAnswerInput, setSecurityAnswerInput] = useState<string>('');
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string>('');
  const [isVerifyingBiometrics, setIsVerifyingBiometrics] = useState<boolean>(false);

  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;
  const hasAutoTriggeredRef = useRef<boolean>(false);

  // GATILHO DIRETO DA BIOMETRIA NATIVA AO ABRIR (SEM TELAS INTERMEDIÁRIAS):
  // Se a biometria estiver cadastrada e ativa, aciona diretamente o leitor nativo do dispositivo
  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setErrorMsg('');

      const isRegistered = Boolean(profile.biometricsEnabled && profile.biometricCredentialId);
      if (isRegistered && !hasAutoTriggeredRef.current) {
        hasAutoTriggeredRef.current = true;
        const timer = setTimeout(() => {
          handleBiometricsClick();
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      hasAutoTriggeredRef.current = false;
      setIsVerifyingBiometrics(false);
    }
  }, [isOpen, profile.biometricsEnabled, profile.biometricCredentialId]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        if (nextPin === profile.pinCode) {
          setTimeout(() => {
            setPinInput('');
            onSuccess();
          }, 150);
        } else {
          setTimeout(() => {
            setErrorMsg('PIN incorreto. Tente novamente.');
            setPinInput('');
          }, 200);
        }
      }
    }
  };

  // Tecla '⌫' (Apagar 1 a 1)
  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  // Tecla 'C' (Limpar Tudo de uma vez)
  const handleClearAll = () => {
    setPinInput('');
    setErrorMsg('');
  };

  // ACIONA DIRETAMENTE O LEITOR NATIVO DO APARELHO (SEM TELAS/POPUPS INTERMEDIÁRIOS)
  const handleBiometricsClick = async () => {
    const isRegistered = Boolean(profile.biometricsEnabled && profile.biometricCredentialId);

    if (!isRegistered) {
      setErrorMsg('Biometria não cadastrada. Acesse com seu PIN e ative nas configurações.');
      return;
    }

    if (isVerifyingBiometrics) return;

    setErrorMsg('');
    setIsVerifyingBiometrics(true);

    try {
      const result = await verifyNativeBiometrics(profile.biometricCredentialId);
      if (result.success) {
        setPinInput('');
        onSuccess();
      } else {
        setErrorMsg(result.error || 'Leitura biométrica não reconhecida ou cancelada.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha na comunicação com o sensor biométrico.');
    } finally {
      setIsVerifyingBiometrics(false);
    }
  };

  const handleVerifySecurityQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAnswer = (profile.securityAnswer || '').trim().toLowerCase();
    const cleanInput = securityAnswerInput.trim().toLowerCase();

    if (!cleanAnswer || cleanInput === cleanAnswer) {
      setShowForgotModal(false);
      setSecurityAnswerInput('');
      setForgotErrorMsg('');
      if (onResetPinWithSecurityAnswer) {
        onResetPinWithSecurityAnswer();
      }
      onSuccess();
    } else {
      setForgotErrorMsg('Resposta incorreta. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-xs sm:max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center relative">
        
        {/* Close Button (Ocultado em bloqueio obrigatório de abertura) */}
        {!isMandatory && (
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Lock Icon Badge */}
        <div className={`w-16 h-16 rounded-2xl ${themeConfig.lightBg} flex items-center justify-center mb-3 shadow-inner`}>
          <Lock className={`w-8 h-8 ${themeConfig.textColor}`} />
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          Acesso Protegido
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
          {profile.biometricsEnabled && profile.biometricCredentialId
            ? 'Digite o PIN de 4 dígitos ou use a Biometria' 
            : 'Digite o PIN de 4 dígitos cadastrado'}
        </p>

        {/* 1. Botão 'Desbloquear com Biometria / Digital' posicionado ACIMA dos círculos do PIN */}
        <button
          type="button"
          onClick={handleBiometricsClick}
          disabled={isVerifyingBiometrics}
          className={`w-full py-2.5 px-3 mb-2 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs border ${
            profile.biometricsEnabled && profile.biometricCredentialId
              ? 'bg-blue-50/90 hover:bg-blue-100/90 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/60'
              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}
          title={
            profile.biometricsEnabled && profile.biometricCredentialId
              ? 'Desbloquear com Biometria / Digital'
              : 'Biometria não cadastrada. Acesse com seu PIN e ative nas configurações do app.'
          }
        >
          <Fingerprint className={`w-4 h-4 ${isVerifyingBiometrics ? 'text-blue-600 dark:text-blue-400 animate-spin' : profile.biometricsEnabled && profile.biometricCredentialId ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-slate-400'}`} />
          <span>{isVerifyingBiometrics ? 'Aguardando Leitor Biométrico...' : 'Desbloquear com Biometria / Digital'}</span>
          {!isVerifyingBiometrics && profile.biometricsEnabled && profile.biometricCredentialId && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
          )}
        </button>

        {/* 4 Dots indicator */}
        <div className="flex items-center justify-center gap-4 my-3">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pinInput.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? `${themeConfig.bgButton} scale-110 shadow-sm`
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Mensagem de alerta / erro */}
        {errorMsg && (
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-3 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 animate-shake text-left flex items-start gap-2 w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2. TECLADO NUMÉRICO SIMÉTRICO E PADRONIZADO */}
        {/* [ 1 ] [ 2 ] [ 3 ] */}
        {/* [ 4 ] [ 5 ] [ 6 ] */}
        {/* [ 7 ] [ 8 ] [ 9 ] */}
        {/* [ Tecla 'C' (Limpar Tudo) ]  [ 0 ]  [ Tecla '⌫' (Apagar 1 a 1) ] */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xl font-bold transition active:scale-95 cursor-pointer shadow-xs"
            >
              {digit}
            </button>
          ))}

          {/* Tecla 'C' (Limpar Tudo) */}
          <button
            type="button"
            onClick={handleClearAll}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 text-lg font-black flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Limpar todo o PIN"
          >
            C
          </button>

          {/* Tecla '0' */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xl font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            0
          </button>

          {/* Tecla '⌫' (Apagar 1 a 1) */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xl font-bold flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Apagar dígito"
          >
            ⌫
          </button>
        </div>

        {/* Forgot Password / Recovery Button */}
        <button
          type="button"
          onClick={() => setShowForgotModal(true)}
          className="mt-5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer underline underline-offset-2"
        >
          Esqueci minha senha
        </button>

      </div>



      {/* Forgot Password Modal (Biometria OU Pergunta de Segurança) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className={`w-5 h-5 ${themeConfig.textColor}`} />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Recuperação de Acesso
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Escolha uma das opções abaixo para recuperar e desbloquear o acesso ao aplicativo:
            </p>

            {/* Opção 1: Desbloquear via Biometria / Face ID */}
            <div className={`mb-4 p-4 rounded-2xl border transition-all ${
              profile.biometricsEnabled
                ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
            } flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${themeConfig.lightBg}`}>
                  <Fingerprint className={`w-5 h-5 ${themeConfig.textColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Desbloquear com Biometria
                    </h5>
                    {!profile.biometricsEnabled && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Não cadastrada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {profile.biometricsEnabled
                      ? 'Aciona o leitor nativo de Digital / Face ID'
                      : 'Não ativada nas configurações do app'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  handleBiometricsClick();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  profile.biometricsEnabled
                    ? `text-white ${themeConfig.bgButton}`
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {profile.biometricsEnabled ? 'Validar Digital' : 'Verificar'}
              </button>
            </div>

            {/* Opção 2: Pergunta de Segurança */}
            <form onSubmit={handleVerifySecurityQuestion} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ou responda à Pergunta de Segurança cadastrada:
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {profile.securityQuestion || 'Qual é o nome da sua primeira escola?'}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Sua Resposta Secreta:
                </label>
                <input
                  type="text"
                  value={securityAnswerInput}
                  onChange={(e) => setSecurityAnswerInput(e.target.value)}
                  placeholder="Digite sua resposta"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white text-sm focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              {forgotErrorMsg && (
                <div className="text-xs font-semibold text-rose-500">
                  {forgotErrorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${themeConfig.bgButton}`}
                >
                  Validar e Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
