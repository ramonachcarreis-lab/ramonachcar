import React from 'react';

export const Logo = ({ className = "h-8" }: { className?: string }) => (
  <svg
    viewBox="0 0 400 120"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Marca principal Estofado Pro */}
    <rect x="10" y="20" width="200" height="80" rx="24" fill="#000000" />
    <text
      x="30"
      y="75"
      fontFamily="Nunito, sans-serif"
      fontWeight="900"
      fontSize="40"
      fill="#FFFFFF"
      letterSpacing="-1"
    >
      Estofado
    </text>
    <text
      x="32"
      y="105"
      fontFamily="Nunito, sans-serif"
      fontWeight="900"
      fontSize="36"
      fill="#FFC107"
      letterSpacing="-1"
    >
      Pro
    </text>
  </svg>
);

export const LogoIcon = ({ className = "h-8" }: { className?: string }) => (
  <svg
    viewBox="0 0 120 120"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Ícone minimalista: gota de produto sobre estofado */}
    <rect x="16" y="40" width="88" height="44" rx="14" fill="#000000" />
    <rect x="22" y="46" width="76" height="32" rx="10" fill="#111111" />
    <path
      d="M60 30 C54 40 48 48 48 54 C48 62 53.5 68 60 68 C66.5 68 72 62 72 54 C72 48 66 40 60 30 Z"
      fill="#FFC107"
    />
  </svg>
);
