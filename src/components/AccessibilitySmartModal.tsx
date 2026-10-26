import React from 'react';
import {
  X,
  Accessibility,
  Eye,
  Volume2,
  VolumeX,
  Sparkles,
  Hand,
  HeartHandshake,
  Contrast,
  Type,
  Check,
  MousePointerClick,
} from 'lucide-react';
import { AppSettings } from '../utils/storage';
import { soundEngine } from '../utils/soundAndSpeech';

interface AccessibilitySmartModalProps {
  settings: AppSettings;
  onUpdateSettings: (next: Partial<AppSettings>) => void;
  onClose: () => void;
}

/**
 * Central de Acessibilidade Inteligente e Desenho Universal para a Aprendizagem (DUA/UDL).
 * Oferece perfis adaptativos de 1 clique (TEA, TDAH, Daltonismo com Símbolos, Baixa Visão e Coordenação Motora)
 * além de ajustes finos em tempo real para todos os 6 jogos 3D.
 */
export const AccessibilitySmartModal: React.FC<AccessibilitySmartModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const applySmartPreset = (
    preset: 'guided' | 'colorblind' | 'tea_calm' | 'motor_reader'
  ) => {
    soundEngine.playSuccessSnap();
    if (preset === 'guided') {
      onUpdateSettings({
        visualGuidePulse: true,
        colorBlindMode: true,
        calmMode: false,
        hoverSpeech: false,
        motorAssist: true,
        highContrast: false,
        largeText: false,
        speechRate: 0.95,
      });
      soundEngine.speak('Perfil Guia Visual Inteligente ativado!');
    } else if (preset === 'colorblind') {
      onUpdateSettings({
        colorBlindMode: true,
        visualGuidePulse: true,
        highContrast: true,
      });
      soundEngine.speak(
        'Modo Daltonismo com símbolos geométricos e alto contraste de cores ativado!'
      );
    } else if (preset === 'tea_calm') {
      onUpdateSettings({
        calmMode: true,
        speechRate: 0.82,
        visualGuidePulse: true,
        highContrast: false,
      });
      soundEngine.speak(
        'Modo Sensorial Calmo ativado! Movimentos suaves e narração tranquila.'
      );
    } else if (preset === 'motor_reader') {
      onUpdateSettings({
        motorAssist: true,
        hoverSpeech: true,
        largeText: true,
        visualGuidePulse: true,
        speechRate: 0.85,
      });
      soundEngine.speak(
        'Assistência Motora e Leitura ao Apontar ativadas! Passe o mouse nos botões para ouvir.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 overflow-y-auto">
      <div className="hc-surface w-full max-w-3xl rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 md:p-7 shadow-2xl my-6 max-h-[92vh] overflow-y-auto text-white">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
              <Accessibility className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                Desenho Universal para a Aprendizagem (DUA)
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold font-display">
                Acessibilidade Inteligente Adaptativa
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onClose();
            }}
            className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
          >
            <X className="w-5 h-5" />
            <span>Fechar</span>
          </button>
        </div>

        {/* 1. Perfis Inteligentes de 1 Toque */}
        <div className="mb-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-2.5">
            1. Perfis Inteligentes de Adaptação Rápida (Toque para Ativar)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => applySmartPreset('guided')}
              className="hc-button text-left p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400 transition-all flex items-start gap-3"
            >
              <Sparkles className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-white">
                  Foco Guiado & Pistas Visuais (TDAH / Padrão)
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ativa setas 3D pulsantes, halo brilhante na peça correta e destaque onde ler/clicar.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applySmartPreset('colorblind')}
              className="hc-button text-left p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-400 transition-all flex items-start gap-3"
            >
              <Eye className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-white">
                  Daltonismo + Símbolos Geométricos (● ▲ ★ ■)
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Associa cada cor viva a um símbolo geométrico único nos potes de tinta e cartões.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applySmartPreset('tea_calm')}
              className="hc-button text-left p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-400 transition-all flex items-start gap-3"
            >
              <HeartHandshake className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-white">
                  Modo Sensorial Calmo (TEA / Autismo)
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suaviza o giro da câmera 3D, reduz partículas intensas e desacelera a fala do Bit.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applySmartPreset('motor_reader')}
              className="hc-button text-left p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-400 transition-all flex items-start gap-3"
            >
              <Hand className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-white">
                  Coordenação Motora + Leitor ao Apontar
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Amplia o imã de encaixe 3D, aumenta fontes e lê em voz alta ao passar o mouse.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Recursos Inteligentes Individuais */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
            2. Recursos Inteligentes Personalizáveis
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Guia Visual Pulsante (Glow + Setas 3D) */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({ visualGuidePulse: !settings.visualGuidePulse });
              }}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left ${
                settings.visualGuidePulse
                  ? 'bg-amber-400/15 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MousePointerClick className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold">Indicadores Visuais (Glow e Seta 3D)</div>
                  <div className="text-[11px] text-slate-400">
                    Mostra onde clicar, qual tinta pegar e onde ler
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.visualGuidePulse ? 'ATIVO' : 'OFF'}
              </span>
            </button>

            {/* Símbolos para Daltonismo */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({ colorBlindMode: !settings.colorBlindMode });
              }}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left ${
                settings.colorBlindMode
                  ? 'bg-sky-500/15 border-sky-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold">Símbolos nas Cores (Daltonismo)</div>
                  <div className="text-[11px] text-slate-400">
                    Exibe ● ▲ ★ ■ ◆ ♥ junto com cada cor viva
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.colorBlindMode ? 'ATIVO' : 'OFF'}
              </span>
            </button>

            {/* Leitura Automática ao Passar o Mouse */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({ hoverSpeech: !settings.hoverSpeech });
              }}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left ${
                settings.hoverSpeech
                  ? 'bg-emerald-500/15 border-emerald-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold">Leitor ao Passar o Mouse</div>
                  <div className="text-[11px] text-slate-400">
                    Narra instruções e botões ao apontar (Pré-leitores)
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.hoverSpeech ? 'ATIVO' : 'OFF'}
              </span>
            </button>

            {/* Modo Sensorial Calmo (TEA) */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({ calmMode: !settings.calmMode });
              }}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left ${
                settings.calmMode
                  ? 'bg-purple-500/15 border-purple-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HeartHandshake className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold">Modo Sensorial Calmo (TEA)</div>
                  <div className="text-[11px] text-slate-400">
                    Reduz estímulos visuais rápidos e giro 3D
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.calmMode ? 'ATIVO' : 'OFF'}
              </span>
            </button>

            {/* Alto Contraste WCAG */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({ highContrast: !settings.highContrast });
              }}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left ${
                settings.highContrast
                  ? 'bg-amber-400/15 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Contrast className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold">Alto Contraste Máximo (WCAG AAA)</div>
                  <div className="text-[11px] text-slate-400">
                    Bordas brancas/amarelas nítidas em todos os painéis
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.highContrast ? 'ATIVO' : 'OFF'}
              </span>
            </button>

            {/* Fonte Ampliada + Assistência Motora */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({
                  largeText: !settings.largeText,
                  motorAssist: !settings.largeText,
                });
              }}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left ${
                settings.largeText
                  ? 'bg-sky-500/15 border-sky-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Type className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold">Fonte Grande + Imã 3D Ampliado</div>
                  <div className="text-[11px] text-slate-400">
                    Facilita a leitura e o encaixe das peças 3D
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.largeText ? 'GRANDE' : 'NORMAL'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Controles de Voz e Velocidade da Narração */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="smart-voice-vol"
                className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5"
              >
                <span>Volume da Narração do Robô Bit:</span>
                <span className="text-sky-400 tabular-nums">
                  {Math.round(settings.voiceVolume * 100)}%
                </span>
              </label>
              <input
                id="smart-voice-vol"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.voiceVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ voiceVolume: val });
                }}
                className="w-full h-2.5 bg-slate-800 rounded-lg accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-300 mb-1.5">
                Velocidade da Fala:
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { rate: 0.78, label: '🐢 Pausada' },
                  { rate: 0.95, label: '✨ Normal' },
                  { rate: 1.12, label: '🐇 Dinâmica' },
                ].map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ speechRate: opt.rate });
                      soundEngine.speak('Velocidade da voz ajustada!');
                    }}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-bold border ${
                      Math.abs((settings.speechRate || 0.95) - opt.rate) < 0.05
                        ? 'bg-sky-500 text-slate-950 border-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUpdateSettings({ sfxMuted: !settings.sfxMuted })}
              className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold flex items-center gap-2"
            >
              {settings.sfxMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>Sons 3D: {settings.sfxMuted ? 'Mudo' : 'Ativos'}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onClose();
            }}
            className="hc-button min-h-[48px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg"
          >
            <Check className="w-5 h-5" />
            <span>Salvar e Voltar ao Jogo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
