import React from 'react';
import { CustomAvatarConfig } from '../utils/storage';

interface CharacterAvatarSvgProps {
  config: CustomAvatarConfig;
  size?: number;
  isSpeaking?: boolean;
  className?: string;
}

/**
 * Renderiza o mascote Bit ou o personagem personalizado salvo pela criança no Jogo 1.
 * Totalmente em SVG inline (zero imagens externas).
 */
export const CharacterAvatarSvg: React.FC<CharacterAvatarSvgProps> = ({
  config,
  size = 96,
  isSpeaking = false,
  className = '',
}) => {
  const { headType, bodyType, armsType, legsType, hatType, primaryColor, accentColor } = config;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mascote Bit e Amiguinho"
    >
      {/* Sombra de contato no chão */}
      <ellipse cx="100" cy="206" rx="52" ry="9" fill="#020617" fillOpacity="0.45" />

      {/* PERNAS */}
      {legsType === 'robot' && (
        <g>
          <rect x="68" y="158" width="20" height="36" rx="8" fill="#64748B" stroke="#E2E8F0" strokeWidth="3" />
          <rect x="112" y="158" width="20" height="36" rx="8" fill="#64748B" stroke="#E2E8F0" strokeWidth="3" />
          <rect x="60" y="186" width="32" height="16" rx="8" fill={accentColor} />
          <rect x="108" y="186" width="32" height="16" rx="8" fill={accentColor} />
        </g>
      )}
      {legsType === 'bunny' && (
        <g>
          <ellipse cx="76" cy="178" rx="14" ry="22" fill="#F472B6" stroke="#FDF2F8" strokeWidth="3" />
          <ellipse cx="124" cy="178" rx="14" ry="22" fill="#F472B6" stroke="#FDF2F8" strokeWidth="3" />
          <ellipse cx="72" cy="194" rx="20" ry="10" fill="#FB7185" />
          <ellipse cx="128" cy="194" rx="20" ry="10" fill="#FB7185" />
        </g>
      )}
      {legsType === 'astronaut' && (
        <g>
          <rect x="66" y="156" width="24" height="38" rx="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
          <rect x="110" y="156" width="24" height="38" rx="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
          <rect x="60" y="186" width="34" height="16" rx="7" fill="#F97316" />
          <rect x="106" y="186" width="34" height="16" rx="7" fill="#F97316" />
        </g>
      )}

      {/* BRAÇOS */}
      {armsType === 'robot' && (
        <g>
          <rect x="26" y="102" width="30" height="18" rx="9" fill={primaryColor} stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="24" cy="111" r="10" fill={accentColor} />
          <rect x="144" y="102" width="30" height="18" rx="9" fill={primaryColor} stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="176" cy="111" r="10" fill={accentColor} />
        </g>
      )}
      {armsType === 'bunny' && (
        <g>
          <ellipse cx="38" cy="114" rx="18" ry="11" fill="#F472B6" stroke="#FDF2F8" strokeWidth="3" />
          <ellipse cx="162" cy="114" rx="18" ry="11" fill="#F472B6" stroke="#FDF2F8" strokeWidth="3" />
        </g>
      )}
      {armsType === 'astronaut' && (
        <g>
          <rect x="24" y="100" width="32" height="20" rx="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
          <circle cx="24" cy="110" r="9" fill="#F97316" />
          <rect x="144" y="100" width="32" height="20" rx="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
          <circle cx="176" cy="110" r="9" fill="#F97316" />
        </g>
      )}

      {/* TRONCO / CORPO */}
      {bodyType === 'robot' && (
        <g>
          <rect x="52" y="96" width="96" height="68" rx="22" fill={primaryColor} stroke="#E0F2FE" strokeWidth="4" />
          <rect x="68" y="110" width="64" height="40" rx="10" fill="#0F172A" />
          <path
            d="M100 116 L105 126 L116 128 L108 135 L110 146 L100 141 L90 146 L92 135 L84 128 L95 126 Z"
            fill={accentColor}
          />
        </g>
      )}
      {bodyType === 'bunny' && (
        <g>
          <ellipse cx="100" cy="130" rx="46" ry="38" fill="#F472B6" stroke="#FDF2F8" strokeWidth="4" />
          <ellipse cx="100" cy="134" rx="28" ry="24" fill="#FCE7F3" />
          <path d="M100 122 C92 114 80 124 100 142 C120 124 108 114 100 122 Z" fill="#FB7185" />
        </g>
      )}
      {bodyType === 'astronaut' && (
        <g>
          <rect x="52" y="96" width="96" height="68" rx="24" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="4" />
          <rect x="72" y="112" width="56" height="34" rx="8" fill="#1E293B" />
          <circle cx="88" cy="129" r="7" fill="#38BDF8" />
          <circle cx="112" cy="129" r="7" fill="#F97316" />
        </g>
      )}

      {/* CHAPÉU / ACESSÓRIO DE TOPO */}
      {hatType === 'antenna' && (
        <g>
          <line x1="100" y1="12" x2="100" y2="36" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="12" r={isSpeaking ? 11 : 8} fill={accentColor} />
        </g>
      )}
      {hatType === 'ears' && (
        <g>
          <ellipse cx="76" cy="22" rx="11" ry="22" fill="#F472B6" stroke="#FDF2F8" strokeWidth="3" />
          <ellipse cx="76" cy="24" rx="6" ry="14" fill="#FBCFE8" />
          <ellipse cx="124" cy="22" rx="11" ry="22" fill="#F472B6" stroke="#FDF2F8" strokeWidth="3" />
          <ellipse cx="124" cy="24" rx="6" ry="14" fill="#FBCFE8" />
        </g>
      )}
      {hatType === 'crown' && (
        <path
          d="M68 36 L74 12 L90 26 L100 8 L110 26 L126 12 L132 36 Z"
          fill="#FBBF24"
          stroke="#FEF08A"
          strokeWidth="3"
        />
      )}
      {hatType === 'propeller' && (
        <g>
          <line x1="100" y1="18" x2="100" y2="36" stroke="#F97316" strokeWidth="6" />
          <ellipse cx="100" cy="16" rx="28" ry="6" fill="#FBBF24" />
          <circle cx="100" cy="16" r="6" fill="#EF4444" />
        </g>
      )}

      {/* CABEÇA */}
      {headType === 'robot' && (
        <g>
          <rect x="44" y="54" width="12" height="24" rx="6" fill={accentColor} />
          <rect x="144" y="54" width="12" height="24" rx="6" fill={accentColor} />
          <rect x="52" y="34" width="96" height="62" rx="22" fill={primaryColor} stroke="#E0F2FE" strokeWidth="4" />
          <rect x="64" y="44" width="72" height="42" rx="14" fill="#0F172A" />
          <circle cx="82" cy="60" r="8" fill="#34D399" />
          <circle cx="84" cy="58" r="3" fill="#FFFFFF" />
          <circle cx="118" cy="60" r="8" fill="#34D399" />
          <circle cx="120" cy="58" r="3" fill="#FFFFFF" />
          {isSpeaking ? (
            <ellipse cx="100" cy="75" rx="10" ry="6" fill={accentColor} />
          ) : (
            <path d="M86 73 Q100 83 114 73" stroke={accentColor} strokeWidth="4" strokeLinecap="round" fill="none" />
          )}
        </g>
      )}
      {headType === 'bunny' && (
        <g>
          <rect x="54" y="34" width="92" height="62" rx="30" fill="#F472B6" stroke="#FDF2F8" strokeWidth="4" />
          <circle cx="80" cy="60" r="7" fill="#0F172A" />
          <circle cx="82" cy="58" r="2.5" fill="#FFFFFF" />
          <circle cx="120" cy="60" r="7" fill="#0F172A" />
          <circle cx="122" cy="58" r="2.5" fill="#FFFFFF" />
          <ellipse cx="70" cy="70" rx="6" ry="3.5" fill="#FB7185" />
          <ellipse cx="130" cy="70" rx="6" ry="3.5" fill="#FB7185" />
          <polygon points="100,66 95,60 105,60" fill="#BE185D" />
          <path d="M90 74 Q100 84 110 74" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </g>
      )}
      {headType === 'astronaut' && (
        <g>
          <rect x="50" y="32" width="100" height="64" rx="32" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="4" />
          <rect x="64" y="42" width="72" height="44" rx="18" fill="#0F172A" stroke="#38BDF8" strokeWidth="3" />
          <circle cx="84" cy="60" r="7" fill="#38BDF8" />
          <circle cx="86" cy="58" r="2.5" fill="#FFFFFF" />
          <circle cx="116" cy="60" r="7" fill="#38BDF8" />
          <circle cx="118" cy="58" r="2.5" fill="#FFFFFF" />
          <path d="M88 74 Q100 82 112 74" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      )}
    </svg>
  );
};
