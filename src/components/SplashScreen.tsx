import React, { useState, useEffect } from 'react';
import { ManagerProfile } from '../types/overtime';
import { COLOR_THEMES } from '../utils/theme';
import { Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onEnter: () => void;
  profile: ManagerProfile;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onEnter,
  profile,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const themeConfig = COLOR_THEMES[profile.primaryColor] || COLOR_THEMES.blue;

  // Atualização do relógio digital em tempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);

      const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      setCurrentDateFormatted(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      
      {/* Luzes ambiente de fundo para realce de profundidade */}
      <div 
        className="absolute top-12 -left-20 w-80 h-80 rounded-full blur-[110px] opacity-35 pointer-events-none"
        style={{ backgroundColor: themeConfig.primary }}
      />
      <div 
        className="absolute bottom-12 -right-20 w-80 h-80 rounded-full blur-[110px] opacity-25 bg-sky-500 pointer-events-none"
      />

      {/* 1. PARTE SUPERIOR DA TELA: Container/Card com cor destacada, relógio digital e logo HE em MAIOR destaque */}
      <div className="pt-2 sm:pt-6 w-full max-w-md mx-auto flex flex-col items-center text-center z-20">
        
        {/* Card em destaque com alto contraste, degradê profundo e borda luminosa neon/glassmorphism */}
        <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border-2 border-sky-400/60 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(56,189,248,0.25)] flex flex-col items-center relative overflow-hidden transition-all duration-300">
          
          {/* Efeito de brilho luminoso na borda superior do card */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
          <div className="absolute -top-16 inset-x-12 h-24 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Destaque Central: Sigla "HE" MAIOR e BEM PRÓXIMA ao Relógio Digital */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 my-1 z-10">
            
            {/* Logo HE em Maior Destaque (Fonte Maior, Bold Acentuado e Borda Brilhante) */}
            <div className="flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-blue-500 text-white font-black text-3xl sm:text-4xl md:text-5xl tracking-widest shadow-xl shadow-blue-500/50 border-2 border-white/50 flex-shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
              HE
            </div>

            {/* Relógio Digital com Números Grandes */}
            <div className="font-mono text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(56,189,248,0.35)]">
              {currentTime || '00:00'}
            </div>

          </div>

          {/* Data do Dia Formatada */}
          <div className="text-xs sm:text-sm text-sky-200 font-medium mt-3.5 tracking-wide flex items-center gap-1.5 z-10">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{currentDateFormatted || 'Hoje'}</span>
          </div>

          {/* Título do Aplicativo */}
          <div className="mt-2 text-[11px] font-extrabold tracking-widest uppercase text-slate-300 z-10">
            Controle de Hora Extra
          </div>

        </div>

      </div>

      {/* 2. CENTRO DA TELA TOTALMENTE LIMPO */}
      <div className="flex-1 pointer-events-none" />

      {/* 3. PARTE INFERIOR: Botão "Entrar" com estilo moderno */}
      <div className="w-full max-w-sm mx-auto z-20 flex flex-col items-center gap-3 pb-3 sm:pb-6">
        
        <button
          onClick={onEnter}
          type="button"
          className={`w-full group flex items-center justify-center gap-3 py-4 sm:py-4.5 px-8 rounded-2xl font-black text-base sm:text-lg text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer ${themeConfig.bgButton} border border-white/20`}
        >
          {profile.pinEnabled && (
            <Lock className="w-5 h-5 text-white/90 group-hover:text-white transition-colors" />
          )}
          <span className="tracking-wide">Entrar</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {profile.pinEnabled && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acesso protegido por PIN</span>
          </div>
        )}

      </div>

    </div>
  );
};
