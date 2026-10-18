import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  getDocs, 
  writeBatch, 
  setDoc, 
  deleteDoc,
  onSnapshot,
  getDocFromServer 
} from 'firebase/firestore';
import { OvertimeRecord } from '../types/overtime';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Bloco de configuração do Firebase com fallback inteligente para os dados provisionados
const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || "SUA_API_KEY_DO_NOVO_APP",
  authDomain: firebaseAppletConfig.authDomain || "seu-projeto.firebaseapp.com",
  projectId: firebaseAppletConfig.projectId || "seu-projeto",
  storageBucket: firebaseAppletConfig.storageBucket || "seu-projeto.appspot.com",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "...",
  appId: firebaseAppletConfig.appId || "..."
};

// Inicialização da instância do Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 1. Configurar persistência da autenticação com indexedDBLocalPersistence ativa
// Garante que o usuário permaneça conectado na nuvem mesmo após fechar e reabrir o aplicativo
setPersistence(auth, indexedDBLocalPersistence).catch(() => {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('[Firebase] Aviso ao definir persistência local:', error);
  });
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = firebaseAppletConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validação de conexão inicial conforme boas práticas
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Verifique a configuração de rede ou Firebase.", error);
    }
  }
}
testConnection();

/**
 * Conectar com Google usando popup com persistência indexedDBLocalPersistence garantida
 */
export async function connectWithGoogle(): Promise<User> {
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch {
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Desconectar usuário da nuvem
 */
export async function disconnectFromFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Observar mudanças no estado de autenticação
 */
export function onAuthUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Salvar um único registro em tempo real no Firestore vinculado ao UID do usuário
 */
export async function saveRecordToCloud(userId: string, record: OvertimeRecord): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'overtimeRecords', record.id);
    const payload: Record<string, any> = {
      id: record.id,
      userId: userId,
      date: record.date,
      employeeName: record.employeeName,
      hours: Number(record.hours),
      status: record.status,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (record.reason) payload.reason = record.reason;
    if (record.ratePerHour !== undefined && record.ratePerHour !== null) {
      payload.ratePerHour = Number(record.ratePerHour);
    }
    if (record.overtimeType) payload.overtimeType = record.overtimeType;

    await setDoc(itemRef, payload, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Erro ao salvar registro em tempo real na nuvem:', err);
  }
}

/**
 * Excluir um registro em tempo real no Firestore vinculado ao UID do usuário
 */
export async function deleteRecordFromCloud(userId: string, recordId: string): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'overtimeRecords', recordId);
    await deleteDoc(itemRef);
  } catch (err) {
    console.warn('[Firebase] Erro ao deletar registro em tempo real na nuvem:', err);
  }
}

/**
 * Observador em tempo real (onSnapshot) de todos os registros do usuário autenticado no Firestore
 */
export function subscribeToCloudRecords(
  userId: string, 
  onUpdate: (records: OvertimeRecord[]) => void
): () => void {
  const recordsColRef = collection(db, 'users', userId, 'overtimeRecords');
  return onSnapshot(recordsColRef, (snapshot) => {
    const records: OvertimeRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      records.push({
        id: data.id || docSnap.id,
        date: data.date,
        employeeName: data.employeeName,
        hours: Number(data.hours) || 0,
        status: data.status === 'pago' ? 'pago' : 'pendente',
        reason: data.reason || undefined,
        ratePerHour: data.ratePerHour ? Number(data.ratePerHour) : undefined,
        overtimeType: data.overtimeType || undefined,
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate(records);
  }, (err) => {
    console.warn('[Firebase] Erro no listener em tempo real de registros:', err);
  });
}

/**
 * Sincronização bidirecional resiliente:
 * - Salva todos os registros locais no Firestore do usuário autenticado (/users/{userId}/overtimeRecords)
 * - Busca registros existentes no Firestore para mesclar sem duplicações e sem perdas
 * - Atualiza carimbo de data/hora do perfil na nuvem
 */
export async function syncRecordsWithCloud(
  user: User,
  localRecords: OvertimeRecord[]
): Promise<{ success: boolean; syncedCount: number; mergedRecords: OvertimeRecord[]; lastSync: string; error?: string }> {
  try {
    const userId = user.uid;
    const userDocRef = doc(db, 'users', userId);
    const recordsColRef = collection(db, 'users', userId, 'overtimeRecords');

    // 1. Atualizar ou registrar perfil do gestor
    await setDoc(userDocRef, {
      userId: userId,
      name: user.displayName || 'Gestor',
      email: user.email || '',
      lastSyncedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Buscar registros existentes na nuvem
    const snapshot = await getDocs(recordsColRef);
    const remoteRecordsMap = new Map<string, OvertimeRecord>();
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      remoteRecordsMap.set(docSnap.id, {
        id: data.id || docSnap.id,
        date: data.date,
        employeeName: data.employeeName,
        hours: Number(data.hours) || 0,
        status: data.status === 'pago' ? 'pago' : 'pendente',
        reason: data.reason || undefined,
        ratePerHour: data.ratePerHour ? Number(data.ratePerHour) : undefined,
        overtimeType: data.overtimeType || undefined,
        createdAt: data.createdAt || new Date().toISOString()
      });
    });

    // 3. Mesclar registros locais com remotos (preservando tudo de forma cumulativa)
    const mergedMap = new Map<string, OvertimeRecord>();
    // Primeiro adiciona remotos
    remoteRecordsMap.forEach((rec, id) => {
      mergedMap.set(id, rec);
    });
    // Depois aplica locais (atualizações mais recentes)
    localRecords.forEach((rec) => {
      mergedMap.set(rec.id, rec);
    });

    const finalRecords = Array.from(mergedMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 4. Gravação em lote (batches de até 400 por limitação de 500 do Firestore)
    const recordsToPush = Array.from(mergedMap.values());
    const chunkSize = 400;
    for (let i = 0; i < recordsToPush.length; i += chunkSize) {
      const chunk = recordsToPush.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const rec of chunk) {
        const itemRef = doc(db, 'users', userId, 'overtimeRecords', rec.id);
        const payload: Record<string, any> = {
          id: rec.id,
          userId: userId,
          date: rec.date,
          employeeName: rec.employeeName,
          hours: Number(rec.hours),
          status: rec.status,
          createdAt: rec.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (rec.reason) payload.reason = rec.reason;
        if (rec.ratePerHour !== undefined && rec.ratePerHour !== null) payload.ratePerHour = Number(rec.ratePerHour);
        if (rec.overtimeType) payload.overtimeType = rec.overtimeType;
        batch.set(itemRef, payload, { merge: true });
      }
      await batch.commit();
    }

    const lastSyncTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return {
      success: true,
      syncedCount: finalRecords.length,
      mergedRecords: finalRecords,
      lastSync: lastSyncTime
    };
  } catch (err: any) {
    console.error('[Firebase] Erro ao sincronizar dados:', err);
    return {
      success: false,
      syncedCount: 0,
      mergedRecords: localRecords,
      lastSync: '',
      error: err?.message || 'Falha na sincronização online com Firestore'
    };
  }
}
