import React from 'react';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sliders,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Bell,
  Bot,
  MousePointerClick,
  HeartHandshake,
} from 'lucide-react';
import { AppSettings } from '../utils/storage';
import { soundEngine } from '../utils/soundAndSpeech';

interface GameSettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (next: Partial<AppSettings>) => void;
  onClose: () => void;
}

/**
 * Painel de Configurações Gerais e de Áudio (Ícone de Engrenagem no Topo Direito).
 * Permite ativar/desativar narrações, narração automática, sons normais do jogo
 * e ajustar volumes individuais (Master, Sons de Interação 3D, Fanfarras/Robô e Voz).
 */
export const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const isSfxActive = !settings.sfxMuted;
  const masterPct = Math.round((settings.masterVolume ?? 1.0) * 100);
  const sfxPct = Math.round((settings.sfxVolume ?? 0.85) * 100);
  const fanfarePct = Math.round((settings.fanfareVolume ?? 0.85) * 100);
  const voicePct = Math.round((settings.voiceVolume ?? 0.9) * 100);

  const handleToggleNarration = () => {
    soundEngine.playTap();
    const nextEnabled = !settings.narrationEnabled;
    if (!nextEnabled) {
      soundEngine.stopSpeaking();
      onUpdateSettings({
        narrationEnabled: false,
        autoNarration: false,
      });
    } else {
      onUpdateSettings({
        narrationEnabled: true,
        autoNarration: true,
      });
      window.setTimeout(() => {
        soundEngine.speakPreview('Narrações ativadas! Agora você pode ouvir a voz do Robô Bit.');
      }, 60);
    }
  };

  const handleToggleAutoNarration = () => {
    soundEngine.playTap();
    const nextAuto = !settings.autoNarration;
    if (nextAuto && !settings.narrationEnabled) {
      onUpdateSettings({
        narrationEnabled: true,
        autoNarration: true,
      });
    } else {
      if (!nextAuto) soundEngine.stopSpeaking();
      onUpdateSettings({
        autoNarration: nextAuto,
      });
    }
  };

  const handleToggleGameSounds = () => {
    const nextMuted = !settings.sfxMuted;
    onUpdateSettings({ sfxMuted: nextMuted });
    if (!nextMuted) {
      window.setTimeout(() => {
        soundEngine.playMechanicalAttach();
      }, 50);
    }
  };

  const handleResetDefaultAudio = () => {
    onUpdateSettings({
      narrationEnabled: false,
      autoNarration: false,
      sfxMuted: false,
      masterVolume: 1.0,
      sfxVolume: 0.85,
      fanfareVolume: 0.85,
      voiceVolume: 0.9,
      speechRate: 0.95,
      hoverSpeech: false,
    });
    soundEngine.stopSpeaking();
    window.setTimeout(() => {
      soundEngine.playWoodBlockSnap();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 overflow-y-auto select-none">
      <div className="hc-surface w-full max-w-2xl rounded-3xl bg-slate-900 border-2 border-slate-700 p-5 md:p-7 shadow-2xl my-6 max-h-[92vh] overflow-y-auto text-white">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Central de Controle · Áudio & Jogo
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold font-display">
                Configurações do Jogo
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

        {/* 1. Ativar / Desativar Narrações e Sons do Jogo */}
        <div className="mb-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-400 mb-3 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4" />
            <span>1. Ativar ou Desativar Áudio e Narrações</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sons Normais do Jogo (Efeitos 3D) */}
            <button
              type="button"
              onClick={handleToggleGameSounds}
              className={`hc-button p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all ${
                isSfxActive
                  ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-lg'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSfxActive
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isSfxActive ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-extrabold">Sons do Jogo (3D)</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Cliques, peças 3D, pincel e comemorações
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-extrabold shrink-0 ${
                  isSfxActive
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isSfxActive ? 'ATIVADO' : 'MUDO'}
              </span>
            </button>

            {/* Narrações de Voz (Geral) */}
            <button
              type="button"
              onClick={handleToggleNarration}
              className={`hc-button p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all ${
                settings.narrationEnabled
                  ? 'bg-sky-500/15 border-sky-400 text-white shadow-lg'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    settings.narrationEnabled
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.narrationEnabled ? (
                    <Mic className="w-5 h-5" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-extrabold">Narrações por Voz</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Voz falada do Robô Bit em português
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-extrabold shrink-0 ${
                  settings.narrationEnabled
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.narrationEnabled ? 'ATIVADO' : 'OFF'}
              </span>
            </button>

            {/* Narração Automática nas Fases */}
            <button
              type="button"
              onClick={handleToggleAutoNarration}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all ${
                settings.narrationEnabled && settings.autoNarration
                  ? 'bg-amber-400/15 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs md:text-sm font-bold">Narração Automática</div>
                  <div className="text-[11px] text-slate-400">
                    Falar sozinho ao abrir fases (Padrão: OFF)
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.narrationEnabled && settings.autoNarration ? 'ATIVO' : 'OFF'}
              </span>
            </button>

            {/* Leitura ao Passar o Mouse */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                const nextHover = !settings.hoverSpeech;
                onUpdateSettings({
                  hoverSpeech: nextHover,
                  narrationEnabled: nextHover ? true : settings.narrationEnabled,
                });
              }}
              className={`hc-button p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all ${
                settings.narrationEnabled && settings.hoverSpeech
                  ? 'bg-purple-500/15 border-purple-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-xs md:text-sm font-bold">Ler ao Apontar o Mouse</div>
                  <div className="text-[11px] text-slate-400">
                    Narra botões ao passar o cursor
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900">
                {settings.narrationEnabled && settings.hoverSpeech ? 'ATIVO' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Controle de Volumes Individuais */}
        <div className="mb-6 rounded-2xl bg-slate-950 border border-slate-800 p-4 md:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>2. Controles de Volumes Individuais</span>
            </h3>

            <button
              type="button"
              onClick={handleResetDefaultAudio}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 flex items-center gap-1.5"
              title="Restaurar configuração padrão (Sem narração automática e sons ativos)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Restaurar Padrão</span>
            </button>
          </div>

          {/* Slider 1: Volume Geral (Master) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Volume Geral (Master)</span>
              </span>
              <span className="text-amber-400 font-extrabold tabular-nums">{masterPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume ?? 1.0}
              onChange={(e) =>
                onUpdateSettings({ masterVolume: parseFloat(e.target.value) })
              }
              aria-label="Volume Geral Master"
              className="w-full h-2.5 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Slider 2: Volume dos Efeitos de Interação 3D */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-200 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>Sons de Interação (Peças 3D, Madeira, Pincel e Cliques)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (settings.sfxMuted) onUpdateSettings({ sfxMuted: false });
                    soundEngine.playWoodBlockSnap();
                  }}
                  className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-emerald-300" />
                  <span>Testar</span>
                </button>
                <span className="text-emerald-400 font-extrabold tabular-nums w-10 text-right">
                  {sfxPct}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume ?? 0.85}
              onChange={(e) =>
                onUpdateSettings({
                  sfxVolume: parseFloat(e.target.value),
                  sfxMuted: false,
                })
              }
              aria-label="Volume dos Sons de Interação"
              className="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Slider 3: Volume de Comemorações, Fanfarras e Sons do Robô */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Comemorações, Fanfarras & Bip-Bop do Robô</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (settings.sfxMuted) onUpdateSettings({ sfxMuted: false });
                    soundEngine.playRobotBipBop('lights');
                  }}
                  className="px-2.5 py-0.5 rounded-md bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/50 text-pink-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-pink-300" />
                  <span>Testar</span>
                </button>
                <span className="text-pink-400 font-extrabold tabular-nums w-10 text-right">
                  {fanfarePct}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.fanfareVolume ?? 0.85}
              onChange={(e) =>
                onUpdateSettings({
                  fanfareVolume: parseFloat(e.target.value),
                  sfxMuted: false,
                })
              }
              aria-label="Volume de Comemorações e Robô"
              className="w-full h-2.5 bg-slate-800 rounded-lg accent-pink-400 cursor-pointer"
            />
          </div>

          {/* Slider 4: Volume da Voz / Narração */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-200 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-sky-400" />
                <span>Volume da Voz (Narração do Robô Bit)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.speakPreview(
                      'Olá! Este é o volume da minha voz na oficina 3D!'
                    );
                  }}
                  className="px-2.5 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-sky-300" />
                  <span>Testar Voz</span>
                </button>
                <span className="text-sky-400 font-extrabold tabular-nums w-10 text-right">
                  {voicePct}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.voiceVolume ?? 0.9}
              onChange={(e) =>
                onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })
              }
              aria-label="Volume da Voz de Narração"
              className="w-full h-2.5 bg-slate-800 rounded-lg accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Velocidade da Voz */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-300">
              Velocidade da Narração:
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
                    soundEngine.playTap();
                    onUpdateSettings({ speechRate: opt.rate });
                  }}
                  className={`min-h-[36px] px-3 rounded-xl text-xs font-bold border transition-all ${
                    Math.abs((settings.speechRate || 0.95) - opt.rate) < 0.05
                      ? 'bg-sky-500 text-slate-950 border-white shadow-md'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Preferências Rápidas de Jogo e Dicas Visuais */}
        <div className="mb-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 mb-2.5">
            3. Preferências de Jogo e Auxílio Visual 3D
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({ visualGuidePulse: !settings.visualGuidePulse });
              }}
              className={`hc-button p-3 rounded-2xl border flex items-center justify-between gap-2 text-left ${
                settings.visualGuidePulse
                  ? 'bg-amber-400/15 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold">Seta Guia 3D & Brilho Pulsante</span>
              </div>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-slate-900">
                {settings.visualGuidePulse ? 'ATIVO' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onUpdateSettings({ calmMode: !settings.calmMode });
              }}
              className={`hc-button p-3 rounded-2xl border flex items-center justify-between gap-2 text-left ${
                settings.calmMode
                  ? 'bg-purple-500/15 border-purple-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-bold">Modo Sensorial Calmo (TEA)</span>
              </div>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-slate-900">
                {settings.calmMode ? 'ATIVO' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">
            Suas preferências ficam salvas automaticamente neste dispositivo.
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onClose();
            }}
            className="hc-button min-h-[48px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shrink-0"
          >
            <Check className="w-5 h-5" />
            <span>Concluir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
