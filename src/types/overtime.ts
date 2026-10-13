export type OvertimeStatus = 'pendente' | 'pago';

export type OvertimeType = '50%' | '100%' | 'noturno' | 'banco';

export interface OvertimeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  employeeName: string;
  hours: number; // e.g. 4, 8, 12, 2.5
  status: OvertimeStatus;
  reason?: string; // Motivo / Justificativa
  ratePerHour?: number; // Valor R$/h opcional
  overtimeType?: OvertimeType; // Tipo de hora extra
  createdAt: string;
}

export interface EmployeeSummary {
  employeeName: string;
  totalHours: number;
  pendingHours: number;
  paidHours: number;
  totalAmount: number;
  recordsCount: number;
}

export interface FilterOptions {
  month: number; // 1 - 12
  year: number;
  employeeName: string;
  status: 'todos' | 'pendente' | 'pago';
  searchQuery: string;
}

export type AppTheme = 'light' | 'dark';
export type AppColorTheme = 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'rose';

export interface ManagerProfile {
  name: string;
  email: string;
  company?: string;
  roleTitle?: string;
  avatarUrl?: string;
  pinEnabled: boolean;
  pinCode?: string; // 4 dígitos
  securityQuestion?: string;
  securityAnswer?: string;
  biometricsEnabled: boolean;
  biometricsRegisteredAt?: string;
  biometricCredentialId?: string;
  theme: AppTheme;
  primaryColor: AppColorTheme;
}
