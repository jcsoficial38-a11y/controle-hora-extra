// Stub for Firebase since app is now 100% local (offline first)
export const auth = null;
export const db = null;
export function onAuthUserChanged(cb: any) { return () => {}; }
export async function connectWithGoogle() { return null; }
export async function disconnectFromFirebase() {}
export async function syncRecordsWithCloud() { return { success: false }; }
export async function saveRecordToCloud() {}
export async function deleteRecordFromCloud() {}
export async function loadProfileFromCloud() { return null; }
export async function saveProfileToCloud() {}
export function subscribeToCloudRecords() { return () => {}; }
