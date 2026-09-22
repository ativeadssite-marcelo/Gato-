import { CompanyProfile } from '../types';

export interface LogoRenderOptions {
  width: number;
  height: number;
  type: 'original' | 'avatar' | 'banner' | 'favicon' | 'stamp';
  format?: 'image/png' | 'image/webp' | 'image/jpeg';
  backgroundColor?: string | 'transparent';
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
}

/**
 * Triggers a browser download of a dataUrl or blobUrl with the given filename
 */
export function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Normalizes text to be safe for filenames
 */
export function sanitizeFilename(name: string): string {
  return (name || 'empresa')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
}

/**
 * Extracts clean initials for company emblem (ex: "Pantanal Auto Peças" => "PA")
 */
export function getCompanyInitials(name: string): string {
  if (!name) return 'GP';
  const clean = name.trim().split(/\s+/).filter(Boolean);
  if (clean.length === 1) {
    return clean[0].slice(0, 2).toUpperCase();
  }
  return (clean[0][0] + clean[1][0]).toUpperCase();
}

/**
 * Loads an image from a URL or DataURL with promise
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Generates an SVG vector representation of the company branding
 */
export function generateSvgLogo(
  company: CompanyProfile,
  options: {
    variant?: 'badge' | 'horizontal' | 'circular';
    primaryColor?: string;
    accentColor?: string;
  } = {}
): string {
  const primary = options.primaryColor || '#0C4A6E';
  const accent = options.accentColor || '#F59E0B';
  const tradeName = (company.tradeName || 'GATO Autopeças').replace(/&/g, '&amp;');
  const segment = (company.segment || 'Peças & Serviços Automotivos').replace(/&/g, '&amp;');
  const cnpj = (company.cnpj || '12.345.678/0001-90').replace(/&/g, '&amp;');
  const initials = getCompanyInitials(company.tradeName);

  if (options.variant === 'horizontal') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
  <defs>
    <linearGradient id="gradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="#072d42" />
    </linearGradient>
    <linearGradient id="gradAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>
  
  <rect width="1200" height="400" rx="32" fill="#0B132B"/>
  <rect x="2" y="2" width="1196" height="396" rx="30" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="4"/>
  
  <!-- Emblem Badge -->
  <g transform="translate(60, 60)">
    <rect width="280" height="280" rx="48" fill="url(#gradPrimary)" stroke="${accent}" stroke-width="6"/>
    <!-- Gear Accent -->
    <circle cx="140" cy="140" r="100" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="14 10" opacity="0.6"/>
    <text x="140" y="170" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="900" text-anchor="middle" letter-spacing="-2">${initials}</text>
  </g>
  
  <!-- Brand Typography -->
  <g transform="translate(380, 150)">
    <text x="0" y="0" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" letter-spacing="-1">${tradeName}</text>
    <text x="0" y="52" fill="${accent}" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" letter-spacing="2" text-transform="uppercase">${segment}</text>
    <text x="0" y="100" fill="#94A3B8" font-family="monospace" font-size="22" font-weight="600">CNPJ: ${cnpj} • ${company.city || 'Campo Grande'} - ${company.uf || 'MS'}</text>
  </g>
</svg>`;
  }

  // Circular / Badge default
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="gradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="#072d42" />
    </linearGradient>
    <linearGradient id="gradAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>
  
  <rect width="512" height="512" rx="100" fill="#0B132B"/>
  <circle cx="256" cy="256" r="230" fill="url(#gradPrimary)" stroke="${accent}" stroke-width="10"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="16 12" opacity="0.7"/>
  
  <text x="256" y="270" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="140" font-weight="900" text-anchor="middle" letter-spacing="-3">${initials}</text>
  <text x="256" y="370" fill="${accent}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" text-anchor="middle" letter-spacing="3" text-transform="uppercase">${tradeName.slice(0, 20)}</text>
  <text x="256" y="405" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" text-anchor="middle">${company.city || ''} • ${company.uf || ''}</text>
</svg>`;
}

/**
 * Draws the logo canvas with high visual fidelity and returns a Base64 DataURL
 */
export async function generateLogoCanvas(
  company: CompanyProfile,
  options: LogoRenderOptions
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const { width, height, type } = options;
  const primary = options.primaryColor || '#0C4A6E';
  const accent = options.accentColor || '#F59E0B';
  const textColor = options.textColor || '#0F172A';

  // 1. Background
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  // Check if custom uploaded logo image exists
  let customImg: HTMLImageElement | null = null;
  if (company.logoUrl && company.logoUrl.trim().length > 0) {
    try {
      customImg = await loadImage(company.logoUrl);
    } catch (e) {
      console.warn('Could not load custom logo image, using fallback badge:', e);
    }
  }

  if (type === 'favicon') {
    // 64x64 or 192x192 Favicon
    if (customImg) {
      // Draw centered with border radius
      const pad = width * 0.08;
      ctx.drawImage(customImg, pad, pad, width - pad * 2, height - pad * 2);
    } else {
      // Draw emblem badge
      const radius = width * 0.25;
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(0, 0, width, height, radius) : ctx.rect(0, 0, width, height);
      ctx.fill();

      // Border
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, width * 0.06);
      ctx.stroke();

      // Initials
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${Math.floor(width * 0.48)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getCompanyInitials(company.tradeName), width / 2, height / 2 + 1);
    }
  } else if (type === 'avatar') {
    // 512x512 Circular Avatar (WhatsApp, Instagram, Google Workspace)
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    // Outer circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Background circle gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, '#072d42');
    ctx.fillStyle = grad;
    ctx.fill();

    if (customImg) {
      const pad = width * 0.14;
      ctx.drawImage(customImg, pad, pad, width - pad * 2, height - pad * 2);
    } else {
      // Draw decorative gear rim
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Initials
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${Math.floor(width * 0.32)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getCompanyInitials(company.tradeName), centerX, centerY - 25);

      // Short trade name
      ctx.fillStyle = accent;
      ctx.font = `800 ${Math.floor(width * 0.05)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText((company.tradeName || 'GATO AUTOPEÇAS').slice(0, 18).toUpperCase(), centerX, centerY + 80);

      // Location
      ctx.fillStyle = '#94A3B8';
      ctx.font = `600 ${Math.floor(width * 0.038)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(`${company.city || 'Campo Grande'} • ${company.uf || 'MS'}`, centerX, centerY + 115);
    }
    ctx.restore();

    // Outer accent ring
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'banner') {
    // 1200x400 Horizontal Header (Orçamentos, DAV, DANFE, E-mail Marketing)
    const isDarkBg = options.backgroundColor && options.backgroundColor !== 'transparent' && options.backgroundColor !== '#FFFFFF' && options.backgroundColor !== '#FFF';
    
    // Left Emblem Area
    const emblemSize = height - 80;
    const emblemX = 50;
    const emblemY = 40;

    if (customImg) {
      ctx.drawImage(customImg, emblemX, emblemY, emblemSize, emblemSize);
    } else {
      // Rounded emblem box
      const radius = 32;
      const grad = ctx.createLinearGradient(emblemX, emblemY, emblemX + emblemSize, emblemY + emblemSize);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, '#072d42');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(emblemX, emblemY, emblemSize, emblemSize, radius) : ctx.rect(emblemX, emblemY, emblemSize, emblemSize);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Initials
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${Math.floor(emblemSize * 0.44)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getCompanyInitials(company.tradeName), emblemX + emblemSize / 2, emblemY + emblemSize / 2);
    }

    // Text Information
    const textStartX = emblemX + emblemSize + 45;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Trade Name
    ctx.fillStyle = isDarkBg ? '#FFFFFF' : (options.textColor || '#0F172A');
    ctx.font = `900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(company.tradeName || 'GATO Autopeças & Distribuidora', textStartX, 130);

    // Corporate Name
    ctx.fillStyle = isDarkBg ? '#CBD5E1' : '#475569';
    ctx.font = `600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(company.corporateName || company.tradeName, textStartX, 175);

    // Segment & Category Badge
    ctx.fillStyle = accent;
    ctx.font = `800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText((company.segment || 'Peças & Serviços Automotivos').toUpperCase(), textStartX, 220);

    // Fiscal details
    ctx.fillStyle = isDarkBg ? '#94A3B8' : '#64748B';
    ctx.font = `500 20px monospace`;
    ctx.fillText(`CNPJ: ${company.cnpj || '12.345.678/0001-90'} • IE: ${company.stateRegistration || 'Isento'}`, textStartX, 265);
    ctx.fillText(`${company.address || 'Av. Principal, 1000'} • ${company.city || 'Campo Grande'} (${company.uf || 'MS'})`, textStartX, 300);
    ctx.fillText(`Tel/WhatsApp: ${company.phone || '(67) 3345-9821'} • ${company.email || 'contato@empresa.com.br'}`, textStartX, 335);
  } else if (type === 'stamp') {
    // 600x600 Quality / Warranty Stamp for Documents
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 20;

    ctx.strokeStyle = primary;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 16, 0, Math.PI * 2);
    ctx.stroke();

    // Curved Text or Circular Text
    ctx.fillStyle = primary;
    ctx.font = `900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GARANTIA DE PROCEDÊNCIA', centerX, centerY - 140);

    if (customImg) {
      const imgSize = width * 0.45;
      ctx.drawImage(customImg, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize);
    } else {
      ctx.font = `900 110px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(getCompanyInitials(company.tradeName), centerX, centerY - 10);
    }

    ctx.fillStyle = accent;
    ctx.font = `800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText((company.tradeName || 'AUTOPEÇAS').toUpperCase(), centerX, centerY + 110);

    ctx.fillStyle = '#64748B';
    ctx.font = `700 16px monospace`;
    ctx.fillText(`CNPJ ${company.cnpj || ''}`, centerX, centerY + 150);
  } else {
    // Original 1024x1024 High-Res Logo
    if (customImg) {
      const pad = width * 0.05;
      ctx.drawImage(customImg, pad, pad, width - pad * 2, height - pad * 2);
    } else {
      // Complete high-end automotive badge
      const centerX = width / 2;
      const centerY = height / 2;

      // Shield shape or rounded badge
      const badgeW = width * 0.85;
      const badgeH = height * 0.85;
      const badgeX = (width - badgeW) / 2;
      const badgeY = (height - badgeH) / 2;

      const grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
      grad.addColorStop(0, primary);
      grad.addColorStop(0.6, '#083344');
      grad.addColorStop(1, '#0f172a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 64) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fill();

      // Accent border
      ctx.strokeStyle = accent;
      ctx.lineWidth = 14;
      ctx.stroke();

      // Subtle inner rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Big Initials
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 240px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getCompanyInitials(company.tradeName), centerX, centerY - 60);

      // Company Trade Name
      ctx.fillStyle = accent;
      ctx.font = `900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText((company.tradeName || 'GATO AUTOPEÇAS').toUpperCase(), centerX, centerY + 110);

      // Segment subtitle
      ctx.fillStyle = '#E2E8F0';
      ctx.font = `700 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText((company.segment || 'Peças & Serviços Automotivos').toUpperCase(), centerX, centerY + 160);

      // City / UF footer
      ctx.fillStyle = '#94A3B8';
      ctx.font = `600 22px monospace`;
      ctx.fillText(`${company.city || 'Campo Grande'} • ${company.uf || 'MS'}`, centerX, centerY + 205);
    }
  }

  return canvas.toDataURL(options.format || 'image/png');
}

/**
 * Downloads a single logo format
 */
export async function downloadLogoFormat(
  company: CompanyProfile,
  type: 'original' | 'avatar' | 'banner' | 'favicon' | 'stamp' | 'svg',
  customOptions?: Partial<LogoRenderOptions>
) {
  const baseName = sanitizeFilename(company.tradeName || 'empresa');

  if (type === 'svg') {
    const svgContent = generateSvgLogo(company, {
      variant: 'badge',
      primaryColor: customOptions?.primaryColor,
      accentColor: customOptions?.accentColor,
    });
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `logo_${baseName}_vetor.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  let width = 1024;
  let height = 1024;
  let filename = `logo_${baseName}_1024x1024.png`;

  if (type === 'favicon') {
    width = 128;
    height = 128;
    filename = `favicon_${baseName}_128x128.png`;
  } else if (type === 'avatar') {
    width = 512;
    height = 512;
    filename = `avatar_whatsapp_${baseName}_512x512.png`;
  } else if (type === 'banner') {
    width = 1200;
    height = 400;
    filename = `cabecalho_orcamento_${baseName}_1200x400.png`;
  } else if (type === 'stamp') {
    width = 600;
    height = 600;
    filename = `selo_garantia_${baseName}_600x600.png`;
  }

  const dataUrl = await generateLogoCanvas(company, {
    width,
    height,
    type,
    format: 'image/png',
    backgroundColor: customOptions?.backgroundColor !== undefined ? customOptions.backgroundColor : (type === 'banner' ? '#0B132B' : 'transparent'),
    primaryColor: customOptions?.primaryColor,
    accentColor: customOptions?.accentColor,
    textColor: customOptions?.textColor,
  });

  triggerDownload(dataUrl, filename);
}

/**
 * Downloads the full branding kit (all sizes and formats in sequence)
 */
export async function downloadFullBrandingKit(
  company: CompanyProfile,
  customOptions?: Partial<LogoRenderOptions>
) {
  const formats: Array<'original' | 'banner' | 'avatar' | 'favicon' | 'stamp' | 'svg'> = [
    'original',
    'banner',
    'avatar',
    'favicon',
    'stamp',
    'svg',
  ];

  for (let i = 0; i < formats.length; i++) {
    const fmt = formats[i];
    await downloadLogoFormat(company, fmt, customOptions);
    // Slight pause between downloads so browser doesn't block parallel popups
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
}
