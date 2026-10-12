import { AppColorTheme } from '../types/overtime';

export interface ThemeConfig {
  name: string;
  primary: string;
  bgButton: string;
  hoverButton: string;
  lightBg: string;
  textColor: string;
  borderColor: string;
  focusRing: string;
  badgeStyle: string;
  gradientBg: string;
  hexRgb: [number, number, number];
}

export const COLOR_THEMES: Record<AppColorTheme, ThemeConfig> = {
  blue: {
    name: 'Azul Corporativo',
    primary: '#2563eb',
    bgButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    hoverButton: 'hover:bg-blue-700',
    lightBg: 'bg-blue-50 dark:bg-blue-950/40',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    focusRing: 'focus:ring-blue-500',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    gradientBg: 'from-blue-700 via-blue-600 to-sky-600',
    hexRgb: [37, 99, 235],
  },
  green: {
    name: 'Verde Esmeralda',
    primary: '#059669',
    bgButton: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    hoverButton: 'hover:bg-emerald-700',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    focusRing: 'focus:ring-emerald-500',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    gradientBg: 'from-emerald-700 via-emerald-600 to-teal-600',
    hexRgb: [5, 150, 105],
  },
  purple: {
    name: 'Roxo Moderno',
    primary: '#7c3aed',
    bgButton: 'bg-purple-600 hover:bg-purple-700 text-white',
    hoverButton: 'hover:bg-purple-700',
    lightBg: 'bg-purple-50 dark:bg-purple-950/40',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    focusRing: 'focus:ring-purple-500',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    gradientBg: 'from-purple-700 via-purple-600 to-indigo-600',
    hexRgb: [124, 58, 237],
  },
  orange: {
    name: 'Laranja Energia',
    primary: '#ea580c',
    bgButton: 'bg-orange-600 hover:bg-orange-700 text-white',
    hoverButton: 'hover:bg-orange-700',
    lightBg: 'bg-orange-50 dark:bg-orange-950/40',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
    focusRing: 'focus:ring-orange-500',
    badgeStyle: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
    gradientBg: 'from-orange-700 via-orange-600 to-amber-600',
    hexRgb: [234, 88, 12],
  },
  indigo: {
    name: 'Índigo Profundo',
    primary: '#4f46e5',
    bgButton: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    hoverButton: 'hover:bg-indigo-700',
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    focusRing: 'focus:ring-indigo-500',
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
    gradientBg: 'from-indigo-700 via-indigo-600 to-blue-600',
    hexRgb: [79, 70, 229],
  },
  rose: {
    name: 'Bordô / Rosa',
    primary: '#e11d48',
    bgButton: 'bg-rose-600 hover:bg-rose-700 text-white',
    hoverButton: 'hover:bg-rose-700',
    lightBg: 'bg-rose-50 dark:bg-rose-950/40',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-800',
    focusRing: 'focus:ring-rose-500',
    badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
    gradientBg: 'from-rose-700 via-rose-600 to-pink-600',
    hexRgb: [225, 29, 72],
  },
};
