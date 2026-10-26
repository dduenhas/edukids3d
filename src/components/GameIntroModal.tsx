import React, { useEffect } from 'react';
import { Volume2, Play, Sparkles, Star, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { CustomAvatarConfig } from '../utils/storage';
import { CharacterAvatarSvg } from './CharacterAvatarSvg';
import { soundEngine } from '../utils/soundAndSpeech';

interface GameIntroModalProps {
  title: string;
  pilarLabel: string;
  bnccCode: string;
  spokenIntro: string;
  currentLevel: 1 | 2 | 3;
  starsEarned: [boolean, boolean, boolean];
  avatarConfig: CustomAvatarConfig;
  isSpeaking: boolean;
  onSelectLevel: (level: 1 | 2 | 3) => void;
  onStartPlay: () => void;
}

/**
 * Tela de Introdução ("Bit Explica") exibida no início de cada jogo.
 * Indica claramente o Pilar do Pensamento Computacional para o adulto/professor
 * e narra o objetivo em linguagem acolhedora para a criança de 4-5 anos.
 */
export const GameIntroModal: React.FC<GameIntroModalProps> = ({
  title,
  pilarLabel,
  bnccCode,
  spokenIntro,
  currentLevel,
  starsEarned,
  avatarConfig,
  isSpeaking,
  onSelectLevel,
  onStartPlay,
}) => {
  useEffect(() => {
    soundEngine.speak(spokenIntro);
  }, [spokenIntro]);

  const levelDescriptions = [
    { level: 1 as const, label: 'Fase 1', desc: 'Primeiros Passos' },
    { level: 2 as const, label: 'Fase 2', desc: 'Novo Desafio' },
    { level: 3 as const, label: 'Fase 3', desc: 'Criação Livre' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4 overflow-y-auto">
      <div className="hc-surface w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        {/* Rótulo Pedagógico para o Adulto / Professor (Zero-Pill discipline: texto limpo com separador ·) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800 pb-3 mb-5">
          <span>Pilar: <strong className="text-sky-400 font-semibold">{pilarLabel}</strong></span>
          <span aria-hidden="true">·</span>
          <span>BNCC Computação: <strong className="text-slate-300 font-mono">{bnccCode}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Educação Infantil (4–5 anos)</span>
        </div>

        {/* Mascote Bit Explicando + Balão de Fala com Botão de Áudio */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="shrink-0 flex flex-col items-center">
            <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
              <CharacterAvatarSvg config={avatarConfig} size={110} isSpeaking={isSpeaking} />
            </div>
            <span className="mt-2 text-xs font-semibold text-sky-400">Bit Explica</span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">
              {title}
            </h2>
            <p className="text-base md:text-lg text-slate-200 leading-relaxed mb-4">
              “{spokenIntro}”
            </p>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                soundEngine.speak(spokenIntro);
              }}
              className="hc-button inline-flex items-center gap-2.5 min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-sm transition-transform active:scale-95 whitespace-nowrap shrink-0"
            >
              <Volume2 className="w-5 h-5 shrink-0" />
              <span>Ouvir Explicação</span>
            </button>
          </div>
        </div>

        {/* Seleção de Nível (Alvos de toque grandes >= 64px) */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {levelDescriptions.map((item) => {
            const isSelected = currentLevel === item.level;
            const hasStar = starsEarned[item.level - 1];
            return (
              <button
                key={item.level}
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  onSelectLevel(item.level);
                  soundEngine.speak(`${item.label}: ${item.desc}`);
                }}
                className={`hc-button flex flex-col items-center justify-center min-h-[88px] p-3 rounded-2xl border-2 transition-transform active:scale-95 ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-lg'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-lg font-bold font-display tabular-nums">{item.label}</span>
                  <Star
                    className={`w-5 h-5 ${
                      hasStar ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-400">{item.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Botão Principal Grande para Começar */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playSuccessSnap();
            onStartPlay();
          }}
          className="hc-button w-full min-h-[64px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xl flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95 whitespace-nowrap"
        >
          <Play className="w-7 h-7 fill-slate-950" />
          <span>Brincar Agora!</span>
        </button>
      </div>
    </div>
  );
};

interface CelebrationOverlayProps {
  levelCompleted: 1 | 2 | 3;
  message: string;
  onNextLevel?: () => void;
  onReplay: () => void;
  onBackHub: () => void;
}

/**
 * Overlay de Vitória com Confetes e Recompensa de Estrela ao concluir cada fase.
 */
export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  levelCompleted,
  message,
  onNextLevel,
  onReplay,
  onBackHub,
}) => {
  useEffect(() => {
    soundEngine.playVictoryFanfare();
    soundEngine.speak(message);
  }, [message]);

  const confettiPieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 100) / 24}%`,
    delay: `${(i % 6) * 0.15}s`,
    color: ['#FBBF24', '#38BDF8', '#34D399', '#F472B6', '#A78BFA'][i % 5],
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 overflow-hidden">
      {/* Confete Animado no Compositor */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {confettiPieces.map((c) => (
          <div
            key={c.id}
            style={{
              left: c.left,
              animationDelay: c.delay,
              backgroundColor: c.color,
              animation: 'confettiFall 2.8s ease-out forwards',
            }}
            className="absolute top-0 w-3.5 h-3.5 rounded-sm"
          />
        ))}
      </div>

      <div className="hc-surface relative z-10 w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-400/60 p-6 md:p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 w-24 h-24 rounded-full bg-amber-400/20 flex items-center justify-center animate-gentle-bounce">
          <Star className="w-14 h-14 text-amber-400 fill-amber-400" />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-amber-300 text-sm font-semibold mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Fase {levelCompleted} Concluída!</span>
        </div>

        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 font-display">
          Parabéns! Estrela Ganha!
        </h3>

        <p className="text-base text-slate-200 mb-6">“{message}”</p>

        <div className="flex flex-col gap-3">
          {onNextLevel && levelCompleted < 3 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onNextLevel();
              }}
              className="hc-button w-full min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
            >
              <span>Próxima Fase</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onReplay();
              }}
              className="hc-button min-h-[52px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Jogar de Novo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onBackHub();
              }}
              className="hc-button min-h-[52px] rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
            >
              <Home className="w-5 h-5" />
              <span>Início</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
