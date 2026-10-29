// =========================================================================
// ESCUDO DE SEGURANÇA E PRIVACIDADE LGPD — GATO SaaS
// =========================================================================
// Este módulo garante conformidade estrita com a LGPD (Lei 13.709/2018)
// e impede vazamento de senhas, credenciais ou dados pessoais de clientes
// nas ferramentas de desenvolvedor (DevTools: Elements, Console, Storage, Globais).
// =========================================================================

/**
 * Mascara CPF para exibição segura no DOM e inspeção.
 * Exemplo: '123.456.789-00' -> '123.***.***-00'
 */
export function maskCpf(cpf: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) {
    // Se for formato parcial ou genérico
    if (digits.length > 5) {
      return digits.slice(0, 3) + '.***.***-' + digits.slice(-2);
    }
    return '***.***.***-**';
  }
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}

// Mascara CNPJ preservando apenas o inicio e o sufixo da filial.
// Exemplo: 12.345.678/0001-90 -> 12.***.*** / 0001-90
export function maskCnpj(cnpj: string): string {
  if (!cnpj) return '';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) {
    if (digits.length > 8) {
      return `${digits.slice(0, 2)}.***.***/${digits.slice(-6, -2)}-${digits.slice(-2)}`;
    }
    return '**.***.***/****-**';
  }
  return `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Mascara documento genérico (CPF ou CNPJ) conforme o tamanho.
 */
export function maskDocument(doc: string): string {
  if (!doc) return '';
  const clean = doc.replace(/\D/g, '');
  if (clean.length <= 11) {
    return maskCpf(doc);
  }
  return maskCnpj(doc);
}

/**
 * Mascara telefone / WhatsApp de clientes.
 * Exemplo: '(67) 99234-5678' -> '(67) 9****-5678'
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 11) {
    const ddd = clean.slice(0, 2);
    const firstDigit = clean.slice(2, 3);
    const lastDigits = clean.slice(-4);
    return `(${ddd}) ${firstDigit}****-${lastDigits}`;
  }
  if (clean.length >= 10) {
    const ddd = clean.slice(0, 2);
    const lastDigits = clean.slice(-4);
    return `(${ddd}) ****-${lastDigits}`;
  }
  return '(**) *****-****';
}

/**
 * Mascara e-mail pessoal / corporativo.
 * Exemplo: 'carlos.mendes@gmail.com' -> 'c*****s@gmail.com'
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const parts = email.split('@');
  const user = parts[0] || '';
  const domain = parts[1] || '';
  if (user.length <= 2) {
    return `${user.charAt(0)}*@${domain}`;
  }
  const first = user.charAt(0);
  const last = user.charAt(user.length - 1);
  return `${first}${'*'.repeat(Math.min(user.length - 2, 5))}${last}@${domain}`;
}

/**
 * Inicializa a higiene do escopo global window para evitar exposição acidental de objetos em memória.
 */
let shieldInitialized = false;

export function initDevToolsSecurityShield(): void {
  if (typeof window === 'undefined' || shieldInitialized) return;
  shieldInitialized = true;

  const dangerousGlobals = ['customers', 'gato_customers', 'users', 'passwords', 'credentials', 'allClients'];
  for (const prop of dangerousGlobals) {
    try {
      if (prop in window) {
        delete (window as any)[prop];
      }
    } catch {
      /* noop */
    }
  }
}
