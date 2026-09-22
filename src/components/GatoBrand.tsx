import React from 'react';
import gatoLogoOfficial from '../assets/images/gato_logo_official_1789999085285.jpg';

interface GatoBrandProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showMotto?: boolean;
  variant?: 'dark' | 'light';
  iconOnly?: boolean;
  fullBanner?: boolean;
  customLogoUrl?: string;
  tradeName?: string;
  className?: string;
}

export const GatoBrand: React.FC<GatoBrandProps> = ({
  size = 'md',
  showSubtitle = true,
  showMotto = false,
  variant = 'dark',
  iconOnly = false,
  fullBanner = false,
  customLogoUrl,
  tradeName,
  className = '',
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const isXl = size === 'xl';
  const isDark = variant === 'dark';

  // Full banner rendering for hero sections, splash, and login presentations
  if (fullBanner) {
    return (
      <div 
        className={`relative overflow-hidden rounded-2xl border border-amber-500/30 shadow-2xl bg-slate-950 group select-none ${className}`}
        id="gato-brand-full-banner"
      >
        <img 
          src={gatoLogoOfficial} 
          alt="GATO - Gestão de Estoque SaaS de Autopeças" 
          className="w-full h-auto object-cover max-h-[340px] transition-transform duration-500 group-hover:scale-[1.01]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/20 rounded-2xl pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="gato-brand-header">
      {/* Official 3D Mascot Emblem (Cat in Hoodie + Gear) or Client Custom Logo */}
      <div 
        className={`relative overflow-hidden rounded-xl border border-amber-500/50 shadow-md ${customLogoUrl ? 'bg-white p-0.5' : 'bg-black'} shrink-0 transition-transform duration-300 hover:scale-105 ${
          isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12' : isXl ? 'w-16 h-16' : 'w-10 h-10'
        }`}
      >
        <img 
          src={customLogoUrl || gatoLogoOfficial} 
          alt={tradeName ? `Logo ${tradeName}` : 'GATO Logo'} 
          className={`w-full h-full ${customLogoUrl ? 'object-contain' : 'object-cover object-[center_28%] scale-125'}`}
          referrerPolicy="no-referrer"
        />
        {/* Subtle glossy overlay rim */}
        <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/30 rounded-xl pointer-events-none" />
      </div>

      {/* Typography: "GATO" + "GESTÃO DE ESTOQUE" */}
      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <span 
              className={`font-black tracking-tight font-['Outfit'] ${
                isSm ? 'text-lg' : isLg ? 'text-3xl' : isXl ? 'text-4xl' : 'text-2xl'
              } ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              GATO
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mt-0.5" />
          </div>

          {showSubtitle && (
            <span className={`text-[9px] sm:text-[10px] uppercase font-black tracking-wider mt-0.5 ${
              isDark ? 'text-amber-400' : 'text-[#EA580C]'
            }`}>
              Gestão de Estoque • SaaS
            </span>
          )}

          {showMotto && (
            <span className="text-[9px] font-semibold text-slate-400 tracking-wide mt-0.5">
              Controle hoje. Mais vendas amanhã.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

