/**
 * Utilitários para integração com a API Nativa de Biometria (WebAuthn / Credential Management API)
 * Compatível com Android (BiometricPrompt / Impressão Digital) e iOS (Touch ID / Face ID)
 */

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Verifica se o dispositivo possui suporte à API WebAuthn e ao sensor biométrico nativo da plataforma
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

export interface BiometricActionResult {
  success: boolean;
  credentialId?: string;
  error?: string;
  isCancelled?: boolean;
}

/**
 * Cadastra a biometria nativa no dispositivo (Android/iOS)
 * Aciona obrigatoriamente a janela nativa do leitor de digital / Face ID
 */
export async function registerNativeBiometrics(userName?: string): Promise<BiometricActionResult> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      success: false,
      error: 'API biométrica nativa não é suportada neste navegador.',
    };
  }

  try {
    const isAvailable = await isPlatformAuthenticatorAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Sensor biométrico não disponível neste aparelho ou bloqueio de tela não configurado.',
      };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const formattedUser = (userName || 'gestor_he')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 30);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Controle de Hora Extra (HE)',
          id: window.location.hostname || undefined,
        },
        user: {
          id: userId,
          name: formattedUser || 'gestor_he',
          displayName: userName || 'Gestor HE',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Sensor biométrico integrado do celular
          userVerification: 'required',        // Leitura obrigatória de digital/face
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        error: 'Registro biométrico não retornou credencial.',
      };
    }

    let credentialId: string | undefined;
    if (credential.rawId) {
      credentialId = bufferToBase64(credential.rawId);
    }

    return {
      success: true,
      credentialId,
    };
  } catch (err: any) {
    const isCancelled = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
    return {
      success: false,
      isCancelled,
      error: isCancelled
        ? 'Operação cancelada pelo usuário ou digital não reconhecida.'
        : err?.message || 'Falha ao acionar o leitor biométrico nativo.',
    };
  }
}

/**
 * Autentica via biometria nativa no dispositivo (Android/iOS)
 * Aciona obrigatoriamente a janela nativa do leitor de digital / Face ID
 * Retorna sucesso SOMENTE se o sensor do dispositivo confirmar a leitura com sucesso.
 */
export async function verifyNativeBiometrics(
  savedCredentialId?: string,
  userName?: string
): Promise<BiometricActionResult> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      success: false,
      error: 'API biométrica nativa (WebAuthn) não é suportada neste navegador.',
    };
  }

  try {
    const isAvailable = await isPlatformAuthenticatorAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Sensor biométrico não encontrado ou bloqueio de tela desativado no aparelho.',
      };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // 1. Tentar validar com a credencial registrada previamente via navigator.credentials.get
    if (savedCredentialId) {
      try {
        const rawId = base64ToBuffer(savedCredentialId);
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname || undefined,
            userVerification: 'required',
            timeout: 60000,
            allowCredentials: [
              {
                id: rawId,
                type: 'public-key',
                transports: ['internal'],
              },
            ],
          },
        }) as PublicKeyCredential | null;

        if (assertion) {
          return { success: true };
        }
      } catch (getErr: any) {
        // Se o usuário cancelou ativamente a leitura na janela nativa do celular:
        if (getErr?.name === 'NotAllowedError' || getErr?.name === 'AbortError') {
          return {
            success: false,
            isCancelled: true,
            error: 'Leitura biométrica cancelada ou digital não reconhecida.',
          };
        }
        // Caso a credencial não tenha sido encontrada nesta sessão, prosseguir para validação direta abaixo
      }
    }

    // 2. Se não houver credencial salva ou get requerer revalidação, aciona o leitor nativo com platform authenticator
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const formattedUser = (userName || 'gestor_he')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 30);

    const assertion = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Controle de Hora Extra (HE)',
          id: window.location.hostname || undefined,
        },
        user: {
          id: userId,
          name: formattedUser || 'gestor_he',
          displayName: userName || 'Gestor HE',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Força janela nativa do leitor de digital / Face ID
          userVerification: 'required',        // Confirmação biométrica física obrigatória
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;

    if (assertion) {
      return {
        success: true,
        credentialId: assertion.rawId ? bufferToBase64(assertion.rawId) : undefined,
      };
    }

    return {
      success: false,
      error: 'Leitor biométrico não retornou confirmação de sucesso.',
    };
  } catch (err: any) {
    const isCancelled = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
    return {
      success: false,
      isCancelled,
      error: isCancelled
        ? 'Leitura biométrica cancelada ou digital não reconhecida pelo aparelho.'
        : err?.message || 'Falha ao acionar a API nativa de biometria.',
    };
  }
}
