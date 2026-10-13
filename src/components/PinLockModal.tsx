import React, { useState } from 'react';
import { ManagerProfile } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { verifyNativeBiometrics } from '../utils/biometrics';
import { 
  Lock, 
  Delete, 
  Fingerprint, 
  X, 
  HelpCircle, 
  ShieldCheck, 
  AlertCircle, 
  Scan, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile: ManagerProfile;
  onResetPinWithSecurityAnswer?: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profile,
  onResetPinWithSecurityAnswer,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [securityAnswerInput, setSecurityAnswerInput] = useState<string>('');
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string>('');

  // Estados para fluxo seguro da Biometria
  const [showDisabledBiometricsAlert, setShowDisabledBiometricsAlert] = useState<boolean>(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState<boolean>(false);
  const [biometricsStatus, setBiometricsStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [biometricErrorDetails, setBiometricErrorDetails] = useState<string>('');

  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

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

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  // FLUXO ESTRITO DE SEGURANÇA DA BIOMETRIA
  // 1. O clique no botão NÃO PODE abrir o app diretamente sob nenhuma hipótese.
  // 2. Primeiro verifica se a biometria está ativada/cadastrada nas configurações.
  // 3. Se NÃO estiver ativada: exibe o aviso obrigatório e PERMANECE na tela de bloqueio.
  // 4. Se ESTIVER ativada: aciona obrigatoriamente a API nativa de biometria do dispositivo (Android/iOS).
  // 5. O app SÓ é liberado se a leitura da digital for confirmada com SUCESSO.
  const handleBiometricsClick = () => {
    // Regra 2 e 3: Verificar ativação nas configurações do app
    if (!profile.biometricsEnabled) {
      const msg = 'Biometria não cadastrada. Acesse com seu PIN e ative nas configurações do app.';
      setErrorMsg(msg);
      setShowDisabledBiometricsAlert(true);
      return;
    }

    // Regra 4: Se ativada, aciona a janela do leitor nativo
    setErrorMsg('');
    setShowBiometricsModal(true);
    handlePerformBiometricScan();
  };

  // Aciona obrigatoriamente a API nativa de biometria do dispositivo (WebAuthn / Android BiometricPrompt / iOS Face ID)
  const handlePerformBiometricScan = async () => {
    setBiometricsStatus('scanning');
    setBiometricErrorDetails('');

    try {
      const result = await verifyNativeBiometrics(
        profile.biometricCredentialId,
        profile.name
      );

      // Regra 5: SÓ libera se a leitura for confirmada com SUCESSO
      if (result.success) {
        setBiometricsStatus('success');
        setTimeout(() => {
          setShowBiometricsModal(false);
          setBiometricsStatus('idle');
          setBiometricErrorDetails('');
          onSuccess();
        }, 500);
      } else {
        // Falhou ou cancelada pelo usuário na tela do sistema: MANTÉM BLOQUEADO!
        setBiometricsStatus('error');
        setBiometricErrorDetails(
          result.error || 'Leitura cancelada ou não reconhecida pelo leitor biométrico.'
        );
        setErrorMsg('Leitura biométrica não concluída. O aplicativo permanece bloqueado.');
      }
    } catch (err: any) {
      // Qualquer exceção: MANTÉM BLOQUEADO!
      setBiometricsStatus('error');
      setBiometricErrorDetails(
        err?.message || 'Falha na comunicação com o sensor biométrico do aparelho.'
      );
      setErrorMsg('Falha na autenticação biométrica. O aplicativo permanece bloqueado.');
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
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon Badge */}
        <div className={`w-16 h-16 rounded-2xl ${themeConfig.lightBg} flex items-center justify-center mb-3 shadow-inner`}>
          <Lock className={`w-8 h-8 ${themeConfig.textColor}`} />
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          Acesso Protegido
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {profile.biometricsEnabled 
            ? 'Digite o PIN de 4 dígitos ou use a Biometria' 
            : 'Digite o PIN de 4 dígitos cadastrado'}
        </p>

        {/* 4 Dots indicator */}
        <div className="flex items-center justify-center gap-4 my-6">
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
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-3 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 animate-shake text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Keypad */}
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

          {/* Biometrics button (bottom left) */}
          <button
            type="button"
            onClick={handleBiometricsClick}
            className={`h-14 rounded-2xl relative flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs ${
              profile.biometricsEnabled
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                : 'bg-slate-100/70 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/70 text-slate-400 dark:text-slate-500'
            }`}
            title={profile.biometricsEnabled ? 'Acessar com Biometria / Face ID' : 'Biometria não cadastrada. Acesse com seu PIN e ative nas configurações do app.'}
          >
            <Fingerprint className={`w-6 h-6 ${profile.biometricsEnabled ? themeConfig.textColor : 'text-slate-400 dark:text-slate-500'}`} />
            
            {/* Indicador visual de status da biometria */}
            {!profile.biometricsEnabled ? (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" title="Não cadastrada" />
            ) : (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Ativada" />
            )}
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xl font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            0
          </button>

          {/* Delete button (bottom right) */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Apagar dígito"
          >
            <Delete className="w-5 h-5" />
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

      {/* MODAL 1: AVISO ESTRITO QUANDO A BIOMETRIA NÃO ESTÁ ATIVADA NAS CONFIGURAÇÕES */}
      {showDisabledBiometricsAlert && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-amber-300 dark:border-amber-700 shadow-2xl text-center relative space-y-4">
            
            {/* Warning Badge Icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Biometria não cadastrada
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-200 mt-2 font-medium leading-relaxed bg-amber-50/80 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/60">
                Biometria não cadastrada. Acesse com seu PIN e ative nas configurações do app.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 text-left flex items-start gap-2.5">
              <Fingerprint className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                Por regra de segurança, a biometria vem desativada por padrão. Digite seu <strong>PIN de 4 dígitos</strong> para entrar e vá até as <strong>Configurações (Perfil do Gestor)</strong> para cadastrar sua digital.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowDisabledBiometricsAlert(false)}
              className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition active:scale-95 ${themeConfig.bgButton}`}
            >
              Entendi, vou usar o PIN
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: TELA DE LEITURA BIOMÉTRICA NATIVA DO DISPOSITIVO */}
      {showBiometricsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center relative space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-5 h-5 ${themeConfig.textColor}`} />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Validação Biométrica Nativa
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBiometricsModal(false);
                  setBiometricsStatus('idle');
                  setBiometricErrorDetails('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Leitor Biométrico */}
            <div className="py-3 flex flex-col items-center justify-center">
              <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                biometricsStatus === 'scanning'
                  ? 'bg-blue-50 dark:bg-blue-950/60 ring-8 ring-blue-500/20'
                  : biometricsStatus === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 ring-8 ring-emerald-500/20'
                  : biometricsStatus === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/60 ring-8 ring-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}>
                {biometricsStatus === 'success' ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-scale-up" />
                ) : biometricsStatus === 'error' ? (
                  <AlertCircle className="w-12 h-12 text-rose-500" />
                ) : (
                  <Fingerprint className={`w-12 h-12 transition-colors ${
                    biometricsStatus === 'scanning' ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-slate-700 dark:text-slate-300'
                  }`} />
                )}

                {/* Linha de Scanner Animada */}
                {biometricsStatus === 'scanning' && (
                  <div className="absolute inset-x-3 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full animate-bounce" />
                )}
              </div>

              {/* Status / Feedback da Leitura */}
              <div className="mt-4 px-2">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {biometricsStatus === 'scanning' && 'Solicitando leitor do celular...'}
                  {biometricsStatus === 'success' && 'Biometria confirmada com sucesso!'}
                  {biometricsStatus === 'error' && 'Leitura biométrica não validada'}
                  {biometricsStatus === 'idle' && 'Aguardando ação...'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {biometricsStatus === 'scanning' && 'Confirme sua digital ou Face ID na janela nativa do seu dispositivo.'}
                  {biometricsStatus === 'success' && 'Liberando acesso com segurança...'}
                  {biometricsStatus === 'error' && (biometricErrorDetails || 'A leitura falhou ou foi cancelada. O aplicativo permanece bloqueado.')}
                  {biometricsStatus === 'idle' && 'Toque abaixo para acionar o leitor do aparelho.'}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-2 pt-1">
              {biometricsStatus === 'error' && (
                <button
                  type="button"
                  onClick={handlePerformBiometricScan}
                  className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 ${themeConfig.bgButton}`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Tentar Leitura Novamente</span>
                </button>
              )}

              {biometricsStatus === 'scanning' && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 py-2">
                  <Scan className="w-4 h-4 animate-spin" />
                  <span>Aguardando resposta do sensor nativo...</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowBiometricsModal(false);
                  setBiometricsStatus('idle');
                  setBiometricErrorDetails('');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar e Usar PIN
              </button>
            </div>

          </div>
        </div>
      )}

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
