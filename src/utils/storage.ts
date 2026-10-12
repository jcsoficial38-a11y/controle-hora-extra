import { OvertimeRecord, ManagerProfile } from '../types/overtime';

const STORAGE_KEY = 'controle_hora_extra_records_v1';
const PROFILE_STORAGE_KEY = 'controle_hora_extra_manager_profile_v1';

// Gerador de dados de exemplo com base na data atual
export function getInitialSeedData(): OvertimeRecord[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  
  // Mês anterior para histórico
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'he-seed-1',
      date: `${currentYear}-${currentMonth}-02`,
      employeeName: 'Carlos Oliveira',
      hours: 4,
      status: 'pago',
      reason: 'Fechamento de inventário quinzenal',
      overtimeType: '50%',
      ratePerHour: 35,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-2',
      date: `${currentYear}-${currentMonth}-05`,
      employeeName: 'Mariana Santos',
      hours: 8,
      status: 'pendente',
      reason: 'Plantão de suporte aos servidores',
      overtimeType: '100%',
      ratePerHour: 42,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-3',
      date: `${currentYear}-${currentMonth}-08`,
      employeeName: 'Rafael Costa',
      hours: 4,
      status: 'pago',
      reason: 'Atendimento emergencial de cliente',
      overtimeType: '50%',
      ratePerHour: 30,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-4',
      date: `${currentYear}-${currentMonth}-10`,
      employeeName: 'Juliana Mendes',
      hours: 6,
      status: 'pendente',
      reason: 'Finalização de relatório fiscal',
      overtimeType: '50%',
      ratePerHour: 38,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-5',
      date: `${currentYear}-${currentMonth}-12`,
      employeeName: 'Carlos Oliveira',
      hours: 8,
      status: 'pendente',
      reason: 'Manutenção preventiva de máquinas',
      overtimeType: '100%',
      ratePerHour: 35,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-6',
      date: `${currentYear}-${currentMonth}-15`,
      employeeName: 'Lucas Souza',
      hours: 12,
      status: 'pago',
      reason: 'Plantão escala 12x36 especial',
      overtimeType: '100%',
      ratePerHour: 28,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-7',
      date: `${currentYear}-${currentMonth}-18`,
      employeeName: 'Mariana Santos',
      hours: 4,
      status: 'pago',
      reason: 'Treinamento de novos estagiários',
      overtimeType: '50%',
      ratePerHour: 42,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-8',
      date: `${currentYear}-${currentMonth}-20`,
      employeeName: 'Rafael Costa',
      hours: 8,
      status: 'pendente',
      reason: 'Operação de entrega e carga',
      overtimeType: '100%',
      ratePerHour: 30,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-9',
      date: `${currentYear}-${currentMonth}-22`,
      employeeName: 'Juliana Mendes',
      hours: 4,
      status: 'pendente',
      reason: 'Auditoria interna da qualidade',
      overtimeType: '50%',
      ratePerHour: 38,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-10',
      date: `${currentYear}-${currentMonth}-25`,
      employeeName: 'Lucas Souza',
      hours: 8,
      status: 'pago',
      reason: 'Troca de turno fim de semana',
      overtimeType: '100%',
      ratePerHour: 28,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-11',
      date: `${prevYear}-${prevMonth}-14`,
      employeeName: 'Carlos Oliveira',
      hours: 6,
      status: 'pago',
      reason: 'Fechamento mensal',
      overtimeType: '50%',
      ratePerHour: 35,
      createdAt: new Date().toISOString()
    },
    {
      id: 'he-seed-12',
      date: `${prevYear}-${prevMonth}-20`,
      employeeName: 'Mariana Santos',
      hours: 8,
      status: 'pago',
      reason: 'Implantação de novo software',
      overtimeType: '100%',
      ratePerHour: 42,
      createdAt: new Date().toISOString()
    }
  ];
}

export function loadRecords(): OvertimeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedData();
      saveRecords(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    const initial = getInitialSeedData();
    saveRecords(initial);
    return initial;
  } catch (err) {
    console.error('Erro ao ler localStorage:', err);
    return getInitialSeedData();
  }
}

export function saveRecords(records: OvertimeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
}

export function deleteRecordFromStorage(id: string): OvertimeRecord[] {
  try {
    const current = loadRecords();
    const updated = current.filter((r) => r.id !== id);
    saveRecords(updated);
    return updated;
  } catch (err) {
    console.error('Erro ao excluir do localStorage:', err);
    return [];
  }
}

export function getDefaultManagerProfile(): ManagerProfile {
  return {
    name: 'Gestor(a)',
    email: 'gestor@empresa.com',
    company: 'Empresa',
    roleTitle: 'Coordenador(a) de Equipe',
    avatarUrl: '',
    pinEnabled: false,
    pinCode: '',
    securityQuestion: 'Qual é o nome da sua primeira escola?',
    securityAnswer: '',
    biometricsEnabled: false,
    theme: 'light',
    primaryColor: 'blue',
  };
}

export function loadManagerProfile(): ManagerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return getDefaultManagerProfile();
    }
    const parsed = JSON.parse(raw);
    return { ...getDefaultManagerProfile(), ...parsed };
  } catch (err) {
    console.error('Erro ao ler profile:', err);
    return getDefaultManagerProfile();
  }
}

export function saveManagerProfile(profile: ManagerProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Erro ao salvar profile:', err);
  }
}

export function formatHours(hours: number): string {
  const integerPart = Math.floor(hours);
  const minutes = Math.round((hours - integerPart) * 60);
  const formattedHours = String(integerPart).padStart(2, '0');
  
  if (minutes === 0) {
    return `${formattedHours} hs`;
  }
  return `${formattedHours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatDateBr(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateString;
}

export function formatCurrency(value?: number): string {
  if (value === undefined || isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
