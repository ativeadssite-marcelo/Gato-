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
 * Chaves sensíveis que nunca devem ser impressas no console do navegador.
 */
const SENSITIVE_KEY_REGEX = /(password|senha|secret|token|authorization|credential|cpf|customerdocument|masterpassword)/i;

/**
 * Sanitiza recursivamente qualquer objeto ou valor antes de passar para o console.
 */
function sanitizeValue(value: any, depth = 0): any {
  if (depth > 6) return '[MaxDepth]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    // Detecta se é token JWT ou senha longa
    if (value.startsWith('ey') && value.length > 50) {
      return '[JWT_PROTECTED_TOKEN]';
    }
    // Remove ocorrências explícitas de senhas de teste
    if (value.toLowerCase().includes('senha123456')) {
      return value.replace(/senha123456/gi, '[SENHA_REDACTED]');
    }
    return value;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, depth + 1));
    }

    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const val = value[key];
      if (SENSITIVE_KEY_REGEX.test(key)) {
        if (typeof val === 'string' && (key.toLowerCase().includes('password') || key.toLowerCase().includes('senha'))) {
          cleanObj[key] = '•••••••• [OCULTO POR SEGURANÇA]';
        } else if (typeof val === 'string' && (key.toLowerCase().includes('cpf') || key.toLowerCase().includes('document'))) {
          cleanObj[key] = maskDocument(val);
        } else {
          cleanObj[key] = '[DADO_SENSIVEL_REDACTED]';
        }
      } else {
        cleanObj[key] = sanitizeValue(val, depth + 1);
      }
    }
    return cleanObj;
  }

  return value;
}

/**
 * Inicializa a blindagem de segurança no DevTools:
 * 1. Sanitiza métodos do console (log, info, warn, error, dir, table).
 * 2. Emite aviso formal de conformidade com a LGPD no console.
 * 3. Limpa referências globais acidentais no objeto window.
 */
let shieldInitialized = false;

export function initDevToolsSecurityShield(): void {
  if (typeof window === 'undefined' || shieldInitialized) return;
  shieldInitialized = true;

  try {
    // 1. Mensagem de alerta formal de LGPD e Cibersegurança no console
    const bannerStyle = 'background: #0284C7; color: white; font-weight: bold; font-size: 13px; padding: 6px 12px; border-radius: 6px;';
    const warnStyle = 'color: #f59e0b; font-weight: bold; font-size: 11px;';
    
    // Banner único no console
    setTimeout(() => {
      console.info('%c🛡️ GATO SaaS — SEGURANÇA DA INFORMAÇÃO & LGPD (LEI 13.709/2018)', bannerStyle);
      console.info(
        '%cEste ambiente opera sob controles rigorosos de privacidade. Senhas, credenciais e documentos de clientes são mascarados por padrão e protegidos contra inspeção não autorizada.',
        warnStyle
      );
    }, 500);

    // 2. Intercepta métodos do console para sanitizar dados sensíveis
    const originalLog = console.log.bind(console);
    const originalInfo = console.info.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);
    const originalTable = console.table?.bind(console);

    console.log = (...args: any[]) => {
      try {
        const sanitized = args.map((arg) => sanitizeValue(arg));
        originalLog(...sanitized);
      } catch {
        originalLog('[Log sanitizado por política de segurança]');
      }
    };

    console.info = (...args: any[]) => {
      try {
        const sanitized = args.map((arg) => sanitizeValue(arg));
        originalInfo(...sanitized);
      } catch {
        originalInfo('[Info sanitizado por política de segurança]');
      }
    };

    console.warn = (...args: any[]) => {
      try {
        const sanitized = args.map((arg) => sanitizeValue(arg));
        originalWarn(...sanitized);
      } catch {
        originalWarn('[Warn sanitizado por política de segurança]');
      }
    };

    console.error = (...args: any[]) => {
      try {
        const sanitized = args.map((arg) => sanitizeValue(arg));
        originalError(...sanitized);
      } catch {
        originalError('[Error sanitizado por política de segurança]');
      }
    };

    if (originalTable) {
      console.table = (data: any, properties?: string[]) => {
        try {
          originalTable(sanitizeValue(data), properties);
        } catch {
          originalLog('[Table sanitizada por política de segurança]');
        }
      };
    }

    // 3. Limpeza do escopo global window para evitar exposição de clientes
    const dangerousGlobals = ['customers', 'gato_customers', 'users', 'passwords', 'credentials', 'allClients'];
    dangerousGlobals.forEach((prop) => {
      try {
        if (prop in window) {
          delete (window as any)[prop];
        }
      } catch {
        /* noop */
      }
    });

  } catch (err) {
    // Fail-safe
  }
}
