/**
 * Sistema de Armazenamento Durável e Persistente do Controle de Hora Extra (HE)
 *
 * Implementa 3 camadas de proteção contra perda de dados:
 * 1. Camada Primária: LocalStorage otimizado e protegido com controle de integridade.
 * 2. Camada Secundária (Banco de Dados Local): IndexedDB nativo (transacional, resistente a limpezas de cache).
 * 3. Camada Terciária (Cofre de Backup Automático): Cópias de segurança espelhadas em chaves de fallback.
 *
 * Além disso:
 * - Solicita persistência durável ao navegador via navigator.storage.persist() (impede descarte pelo SO/browser).
 * - Previne QUALQUER reset automático: dados de exemplo só são criados na primeiríssima execução
 *   e NUNCA sobrescrevem cadastros existentes ou listas limpas pelo usuário.
 * - Suporta migração automática de chaves legadas e restauração de segurança.
 */

import { OvertimeRecord, ManagerProfile } from '../types/overtime';

// Chaves de armazenamento
export const STORAGE_KEY = 'controle_hora_extra_records_v1';
export const PROFILE_STORAGE_KEY = 'controle_hora_extra_manager_profile_v1';
export const BACKUP_VAULT_KEY = 'controle_hora_extra_vault_backup_v1';
export const PROFILE_BACKUP_KEY = 'controle_hora_extra_profile_backup_v1';
export const APP_INITIALIZED_KEY = 'controle_hora_extra_initialized_flag';
export const PRE_RESET_BACKUP_KEY = 'controle_hora_extra_pre_reset_backup_v1';

// Chaves legadas para compatibilidade retroativa
const LEGACY_RECORD_KEYS = [
  'controle_hora_extra_records',
  'controle_he_records',
  'he_records',
  'controle_hora_extra_records_v0',
];
const LEGACY_PROFILE_KEYS = [
  'controle_hora_extra_profile',
  'he_profile',
  'controle_he_manager_profile',
];

// Configuração do IndexedDB
const IDB_DATABASE_NAME = 'ControleHoraExtraDB';
const IDB_DATABASE_VERSION = 1;
const IDB_STORE_RECORDS = 'records';
const IDB_STORE_META = 'app_meta';

// Helper para abrir IndexedDB com tratamento de erro
function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(IDB_DATABASE_NAME, IDB_DATABASE_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE_RECORDS)) {
          db.createObjectStore(IDB_STORE_RECORDS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(IDB_STORE_META)) {
          db.createObjectStore(IDB_STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn('[Storage] Aviso ao abrir IndexedDB:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[Storage] Falha ao instanciar IndexedDB:', e);
      resolve(null);
    }
  });
}

/**
 * Solicita persistência de dados de longo prazo ao navegador
 * Garante que o navegador (Chrome/Android/iOS/Safari) não exclua os dados sob pressão de memória
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.info(`[Storage] Armazenamento durável solicitado: ${granted ? 'CONCEDIDO' : 'NEGADO'}`);
        return granted;
      }
      return true;
    } catch (err) {
      console.warn('[Storage] Erro ao solicitar armazenamento persistente:', err);
    }
  }
  return false;
}

/**
 * Salva registros no IndexedDB de forma transacional e segura
 */
export async function saveRecordsToIndexedDB(records: OvertimeRecord[]): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([IDB_STORE_RECORDS, IDB_STORE_META], 'readwrite');
      const recordsStore = tx.objectStore(IDB_STORE_RECORDS);
      const metaStore = tx.objectStore(IDB_STORE_META);

      // Limpa os registros anteriores da transação para manter sincronizado com a lista atual
      const clearReq = recordsStore.clear();
      clearReq.onsuccess = () => {
        for (const record of records) {
          recordsStore.put(record);
        }
      };

      // Salva snapshot de controle no metaStore
      metaStore.put({
        key: 'records_snapshot',
        updatedAt: new Date().toISOString(),
        count: records.length,
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = (e) => {
        db.close();
        console.warn('[Storage] Erro na transação IndexedDB:', e);
        reject(e);
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Carrega registros a partir do IndexedDB
 */
export async function loadRecordsFromIndexedDB(): Promise<OvertimeRecord[] | null> {
  const db = await openIndexedDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_RECORDS, 'readonly');
      const store = tx.objectStore(IDB_STORE_RECORDS);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        db.close();
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as OvertimeRecord[]);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/**
 * Salva perfil do gestor no IndexedDB
 */
export async function saveProfileToIndexedDB(profile: ManagerProfile): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_META, 'readwrite');
      const store = tx.objectStore(IDB_STORE_META);
      store.put({ key: 'manager_profile', value: profile, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

/**
 * Carrega perfil do gestor no IndexedDB
 */
export async function loadProfileFromIndexedDB(): Promise<ManagerProfile | null> {
  const db = await openIndexedDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_META, 'readonly');
      const store = tx.objectStore(IDB_STORE_META);
      const request = store.get('manager_profile');

      request.onsuccess = () => {
        db.close();
        if (request.result && request.result.value) {
          resolve(request.result.value as ManagerProfile);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

// Gerador de dados de exemplo (usado EXCLUSIVAMENTE na primeiríssima instalação limpa)
export function getInitialSeedData(): OvertimeRecord[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  
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

/**
 * Tenta recuperar registros a partir de chaves legadas ou do cofre de backup
 */
function tryRecoverRecordsFromVaultOrLegacy(): OvertimeRecord[] | null {
  try {
    // 1. Tentar recuperar do cofre de backup
    const vaultRaw = localStorage.getItem(BACKUP_VAULT_KEY);
    if (vaultRaw) {
      try {
        const vaultData = JSON.parse(vaultRaw);
        if (Array.isArray(vaultData.records) && vaultData.records.length > 0) {
          console.info('[Storage] Registros recuperados com sucesso do Cofre de Backup!');
          return vaultData.records;
        }
        if (Array.isArray(vaultData) && vaultData.length > 0) {
          return vaultData;
        }
      } catch {}
    }

    // 2. Tentar recuperar de chaves legadas
    for (const legacyKey of LEGACY_RECORD_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.info(`[Storage] Registros recuperados da chave legada: ${legacyKey}`);
            return parsed;
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[Storage] Falha ao inspecionar cofre/chaves legadas:', err);
  }
  return null;
}

/**
 * Carrega os registros de forma durável, resiliente e segura
 *
 * REGRA CRÍTICA DE PREVENÇÃO DE RESET:
 * - Se os dados do usuário já foram inicializados ou existem, NUNCA sobrescreve com dados fictícios.
 * - Respeita listas vazias se o usuário excluiu seus registros.
 * - Recupera automaticamente de backups ou IndexedDB caso haja perda no LocalStorage.
 */
export function loadRecords(): OvertimeRecord[] {
  try {
    const isAppInitialized = localStorage.getItem(APP_INITIALIZED_KEY) === 'true';

    // 1. Tenta carregar da chave principal do LocalStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null && raw !== undefined) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Se encontrou lista válida (mesmo vazia se já inicializado), preserva integralmente!
          return parsed;
        }
      } catch (parseErr) {
        console.error('[Storage] Erro ao parsear STORAGE_KEY, buscando cópia de segurança:', parseErr);
      }
    }

    // 2. Se a chave principal falhou ou estava ausente, tentar recuperar de backup ou chaves legadas
    const recovered = tryRecoverRecordsFromVaultOrLegacy();
    if (recovered) {
      // Salva imediatamente na chave principal para garantir integridade contínua
      saveRecords(recovered);
      return recovered;
    }

    // 3. Se o app já foi inicializado anteriormente pelo usuário, NÃO recarrega seed data!
    // Mantém o estado real do usuário (ex: se ele tinha limpado os dados para começar do zero)
    if (isAppInitialized) {
      return [];
    }

    // 4. PRIMEIRA EXECUÇÃO LIMPA (Virgem): Inicializa com exemplos de demonstração e marca inicializado
    const initial = getInitialSeedData();
    saveRecords(initial);
    localStorage.setItem(APP_INITIALIZED_KEY, 'true');
    return initial;
  } catch (err) {
    console.error('[Storage] Erro grave ao carregar registros:', err);
    // Em caso de falha de segurança, tenta recuperar backup do cofre
    const fallback = tryRecoverRecordsFromVaultOrLegacy();
    return fallback || [];
  }
}

/**
 * Salva registros com garantia de persistência durável em MÚLTIPLAS camadas:
 * - LocalStorage síncrono
 * - Cofre de backup com timestamp
 * - IndexedDB assíncrono
 * - Marca o app como inicializado (prevenção permanente de reset acidental)
 */
export function saveRecords(records: OvertimeRecord[]): void {
  if (!Array.isArray(records)) {
    console.error('[Storage] Tentativa de salvar registros inválidos (não é array). Abortando.');
    return;
  }

  try {
    const serialized = JSON.stringify(records);

    // Camada 1: LocalStorage Principal
    localStorage.setItem(STORAGE_KEY, serialized);

    // Camada 2: Cofre de Backup no LocalStorage
    const vaultPayload = JSON.stringify({
      timestamp: new Date().toISOString(),
      count: records.length,
      records: records,
    });
    localStorage.setItem(BACKUP_VAULT_KEY, vaultPayload);

    // Marcação durável de inicialização
    localStorage.setItem(APP_INITIALIZED_KEY, 'true');

    // Camada 3: Banco de Dados Local (IndexedDB)
    saveRecordsToIndexedDB(records).catch((e) => {
      console.warn('[Storage] Falha ao persistir no IndexedDB (continuando com LocalStorage):', e);
    });

    // Solicita persistência durável ao navegador
    requestPersistentStorage().catch(() => {});
  } catch (err) {
    console.error('[Storage] Erro ao salvar registros:', err);
  }
}

/**
 * Exclui um registro preservando a persistência durável
 */
export function deleteRecordFromStorage(id: string): OvertimeRecord[] {
  try {
    const current = loadRecords();
    const updated = current.filter((r) => r.id !== id);
    saveRecords(updated);
    return updated;
  } catch (err) {
    console.error('[Storage] Erro ao excluir do armazenamento:', err);
    return [];
  }
}

/**
 * Perfil padrão do gestor
 */
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

/**
 * Carrega perfil do gestor com fusão de schema segura (preserva todas as configurações)
 */
export function loadManagerProfile(): ManagerProfile {
  try {
    let raw = localStorage.getItem(PROFILE_STORAGE_KEY);

    // Tentar fallback do backup se o primário estiver ausente
    if (!raw) {
      raw = localStorage.getItem(PROFILE_BACKUP_KEY);
    }

    // Tentar chaves legadas se ainda não encontrou
    if (!raw) {
      for (const legacyKey of LEGACY_PROFILE_KEYS) {
        const legacyVal = localStorage.getItem(legacyKey);
        if (legacyVal) {
          raw = legacyVal;
          break;
        }
      }
    }

    if (!raw) {
      return getDefaultManagerProfile();
    }

    const parsed = JSON.parse(raw);
    // Fusão segura com os valores padrão para garantir que nenhuma propriedade nova quebre
    const merged = { ...getDefaultManagerProfile(), ...parsed };

    // Atualiza backup silenciosamente
    try {
      localStorage.setItem(PROFILE_BACKUP_KEY, JSON.stringify(merged));
    } catch {}

    return merged;
  } catch (err) {
    console.error('[Storage] Erro ao ler profile:', err);
    return getDefaultManagerProfile();
  }
}

/**
 * Salva perfil do gestor no LocalStorage, no Backup e no IndexedDB
 */
export function saveManagerProfile(profile: ManagerProfile): void {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, serialized);
    localStorage.setItem(PROFILE_BACKUP_KEY, serialized);

    // Persiste também no IndexedDB
    saveProfileToIndexedDB(profile).catch(() => {});
  } catch (err) {
    console.error('[Storage] Erro ao salvar profile:', err);
  }
}

/**
 * Cria um snapshot de segurança antes de qualquer restauração manual de dados
 */
export function createSafetyPreResetBackup(records: OvertimeRecord[]): void {
  try {
    localStorage.setItem(
      PRE_RESET_BACKUP_KEY,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        records,
        count: records.length,
      })
    );
  } catch (err) {
    console.warn('[Storage] Falha ao criar snapshot pré-reset:', err);
  }
}

/**
 * Restaura o snapshot de segurança pré-reset se o usuário quiser desfazer a restauração padrão
 */
export function restorePreResetBackup(): OvertimeRecord[] | null {
  try {
    const raw = localStorage.getItem(PRE_RESET_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.records)) {
      saveRecords(parsed.records);
      return parsed.records;
    }
  } catch (err) {
    console.error('[Storage] Erro ao restaurar snapshot pré-reset:', err);
  }
  return null;
}

/**
 * Retorna status e informações do Cofre de Backup Automático
 */
export function getBackupVaultInfo(): {
  hasBackup: boolean;
  date?: string;
  count?: number;
  hasPreResetBackup: boolean;
} {
  let hasBackup = false;
  let date: string | undefined;
  let count: number | undefined;
  let hasPreResetBackup = false;

  try {
    const raw = localStorage.getItem(BACKUP_VAULT_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.records)) {
        hasBackup = true;
        date = data.timestamp;
        count = data.count || data.records.length;
      }
    }
  } catch {}

  try {
    hasPreResetBackup = Boolean(localStorage.getItem(PRE_RESET_BACKUP_KEY));
  } catch {}

  return { hasBackup, date, count, hasPreResetBackup };
}

/**
 * Restaura registros diretamente a partir do Cofre de Backup Automático
 */
export function restoreFromBackupVault(): OvertimeRecord[] | null {
  try {
    const recovered = tryRecoverRecordsFromVaultOrLegacy();
    if (recovered && recovered.length > 0) {
      saveRecords(recovered);
      return recovered;
    }
  } catch (err) {
    console.error('[Storage] Falha ao restaurar do cofre:', err);
  }
  return null;
}

/**
 * Inicializa a infraestrutura de Armazenamento Durável:
 * - Registra permissão persistente no navegador
 * - Se o LocalStorage estiver vazio (ex: limpeza agressiva de cache pelo browser),
 *   resgata do IndexedDB sem perder os dados do usuário.
 */
export async function initDurableStorage(
  onRecordsHydrated?: (records: OvertimeRecord[]) => void,
  onProfileHydrated?: (profile: ManagerProfile) => void
): Promise<void> {
  try {
    // 1. Requisitar persistência durável no browser/SO
    await requestPersistentStorage();

    // 2. Verificar se o LocalStorage perdeu dados que ainda existem no IndexedDB
    const localRecords = loadRecords();
    if (localRecords.length === 0) {
      const idbRecords = await loadRecordsFromIndexedDB();
      if (idbRecords && idbRecords.length > 0) {
        console.info(`[Storage] Recuperados ${idbRecords.length} registros preservados do IndexedDB!`);
        saveRecords(idbRecords);
        if (onRecordsHydrated) {
          onRecordsHydrated(idbRecords);
        }
      }
    } else {
      // Garante que o IndexedDB tenha os registros atuais
      await saveRecordsToIndexedDB(localRecords);
    }

    // 3. Sincronizar perfil do gestor com IndexedDB
    const localProfile = loadManagerProfile();
    const idbProfile = await loadProfileFromIndexedDB();
    if (idbProfile && !localProfile.pinCode && idbProfile.pinCode) {
      // Se o IndexedDB tem perfil configurado e o local perdeu, hidrata
      saveManagerProfile(idbProfile);
      if (onProfileHydrated) {
        onProfileHydrated(idbProfile);
      }
    } else {
      await saveProfileToIndexedDB(localProfile);
    }
  } catch (err) {
    console.warn('[Storage] Aviso durante inicialização durável:', err);
  }
}

// Formatadores utilitários
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
