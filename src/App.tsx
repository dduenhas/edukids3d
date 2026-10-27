import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Star,
  Download,
  ChevronDown,
  ChevronUp,
  Camera,
  GraduationCap,
  Accessibility,
  WifiOff,
  Sparkles,
  Settings,
} from 'lucide-react';
import {
  EduGamesProgress,
  GameId,
  loadProgress,
  saveProgress,
  resetAllProgress,
  CustomAvatarConfig,
  AppSettings,
} from './utils/storage';
import { soundEngine } from './utils/soundAndSpeech';
import { usePWAInstall } from './hooks/usePWAInstall';
import { ThreeBitStage } from './components/ThreeBitStage';
import { CharacterAvatarSvg } from './components/CharacterAvatarSvg';
import { TeacherPanelModal } from './components/TeacherPanelModal';
import { AccessibilitySmartModal } from './components/AccessibilitySmartModal';
import { GameSettingsModal } from './components/GameSettingsModal';
import { Game1MonteAmiguinho } from './games/Game1MonteAmiguinho';
import { Game2QuebraCabeca } from './games/Game2QuebraCabeca';
import { Game3PinteRegras } from './games/Game3PinteRegras';
import { Game4TangramBit } from './games/Game4TangramBit';
import { Game5ContinueSequencia } from './games/Game5ContinueSequencia';
import { Game6ProgrameBit } from './games/Game6ProgrameBit';

interface HubGameCard {
  id: GameId;
  number: string;
  title: string;
  spokenName: string;
  pilar: string;
  bncc: string;
  accentColor: string;
  badgeBg: string;
}

const HUB_GAMES: HubGameCard[] = [
  {
    id: 'monte-amiguinho',
    number: '01',
    title: 'Monte o Amiguinho 3D',
    spokenName: 'Jogo um: Monte o Amiguinho em 3D! Vamos conectar as peças do robô na oficina!',
    pilar: 'Decomposição',
    bncc: 'EI03CO01',
    accentColor: 'border-sky-400/70 hover:border-sky-300',
    badgeBg: 'bg-sky-500 text-slate-950',
  },
  {
    id: 'quebra-cabeca',
    number: '02',
    title: 'Quebra-Cabeça 3D',
    spokenName: 'Jogo dois: Quebra-Cabeça Mágico 3D! Encaixe os blocos esculpidos!',
    pilar: 'Decomposição e Abstração',
    bncc: 'EI03CO01',
    accentColor: 'border-pink-400/70 hover:border-pink-300',
    badgeBg: 'bg-pink-500 text-slate-950',
  },
  {
    id: 'pinte-regras',
    number: '03',
    title: 'Pinte Esculturas 3D',
    spokenName: 'Jogo três: Pinte Seguindo as Regras! Mova o pincel 3D com o mouse e pinte o brinquedo!',
    pilar: 'Algoritmos (Passos)',
    bncc: 'EI03CO02',
    accentColor: 'border-amber-400/70 hover:border-amber-300',
    badgeBg: 'bg-amber-400 text-slate-950',
  },
  {
    id: 'tangram-bit',
    number: '04',
    title: 'Tangram de Madeira 3D',
    spokenName: 'Jogo quatro: Tangram de Madeira 3D! Monte figuras com blocos geométricos!',
    pilar: 'Abstração e Espaço',
    bncc: 'EI03CO01',
    accentColor: 'border-emerald-400/70 hover:border-emerald-300',
    badgeBg: 'bg-emerald-500 text-slate-950',
  },
  {
    id: 'continue-sequencia',
    number: '05',
    title: 'Trilho de Padrões 3D',
    spokenName: 'Jogo cinco: Continue a Sequência 3D! Descubra o padrão de joias e bichinhos!',
    pilar: 'Reconhecimento de Padrões',
    bncc: 'EI03CO01',
    accentColor: 'border-purple-400/70 hover:border-purple-300',
    badgeBg: 'bg-purple-400 text-slate-950',
  },
  {
    id: 'programe-bit',
    number: 'Bônus',
    title: 'Tabuleiro do Bit 3D',
    spokenName: 'Jogo Bônus: Programe o Robô Bit no tabuleiro de mármore 3D!',
    pilar: 'Algoritmos e Depuração',
    bncc: 'EI03CO02 · EI03CO03',
    accentColor: 'border-yellow-400/70 hover:border-yellow-300',
    badgeBg: 'bg-yellow-400 text-slate-950',
  },
];

export default function App() {
  const [progress, setProgress] = useState<EduGamesProgress>(() => loadProgress());
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [hoveredHubGame, setHoveredHubGame] = useState<GameId | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'front' | 'top'>('iso');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showIOSInstallModal, setShowIOSInstallModal] = useState(false);

  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();

  useEffect(() => {
    soundEngine.setSettings(
      progress.settings.voiceVolume ?? 0.9,
      progress.settings.sfxMuted ?? false,
      progress.settings.speechRate ?? 0.95,
      progress.settings.hoverSpeech ?? false,
      progress.settings.narrationEnabled ?? false,
      progress.settings.autoNarration ?? false,
      progress.settings.masterVolume ?? 1.0,
      progress.settings.sfxVolume ?? 0.85,
      progress.settings.fanfareVolume ?? 0.85
    );
    document.documentElement.setAttribute(
      'data-high-contrast',
      progress.settings.highContrast ? 'true' : 'false'
    );
    document.documentElement.setAttribute(
      'data-font-scale',
      progress.settings.largeText ? 'large' : 'normal'
    );
    document.documentElement.setAttribute(
      'data-calm-mode',
      progress.settings.calmMode ? 'true' : 'false'
    );
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    soundEngine.onSpeakingChange((speaking) => setIsSpeaking(speaking));
  }, []);

  useEffect(() => {
    if (!activeGame) return;
    const interval = window.setInterval(() => {
      setProgress((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          [activeGame]: {
            ...prev.metrics[activeGame],
            totalSecondsPlayed: prev.metrics[activeGame].totalSecondsPlayed + 1,
          },
        },
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeGame]);

  useEffect(() => {
    if (activeGame) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGame]);

  const handleUpdateSettings = (next: Partial<AppSettings>) => {
    setProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...next,
      },
    }));
  };

  const handleCompleteLevel = (gameId: GameId, level: 1 | 2 | 3) => {
    setProgress((prev) => {
      const currentStars = [...prev.stars[gameId]] as [boolean, boolean, boolean];
      currentStars[level - 1] = true;
      return {
        ...prev,
        stars: {
          ...prev.stars,
          [gameId]: currentStars,
        },
        metrics: {
          ...prev.metrics,
          [gameId]: {
            ...prev.metrics[gameId],
            completions: prev.metrics[gameId].completions + 1,
          },
        },
      };
    });
  };

  const handleRecordAttempt = (gameId: GameId) => {
    setProgress((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [gameId]: {
          ...prev.metrics[gameId],
          attempts: prev.metrics[gameId].attempts + 1,
        },
      },
    }));
  };

  const handleRecordHint = (gameId: GameId) => {
    setProgress((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [gameId]: {
          ...prev.metrics[gameId],
          hintsUsed: prev.metrics[gameId].hintsUsed + 1,
        },
      },
    }));
  };

  const handleSaveCustomAvatar = (customAvatar: CustomAvatarConfig) => {
    setProgress((prev) => ({
      ...prev,
      customAvatar,
    }));
  };

  const totalStarsEarned = (Object.values(progress.stars) as [boolean, boolean, boolean][]).reduce(
    (sum, s) => sum + s.filter(Boolean).length,
    0
  );

  const handleBackToHub = () => {
    soundEngine.stopSpeaking();
    setHoveredHubGame(null);
    setActiveGame(null);
  };

  // Renderiza o jogo ativo junto com os modais globais de Fundamentação Pedagógica e Acessibilidade Inteligente
  const renderActiveGame = () => {
    if (activeGame === 'monte-amiguinho') {
      return (
        <Game1MonteAmiguinho
          starsEarned={progress.stars['monte-amiguinho']}
          avatarConfig={progress.customAvatar}
          isSpeaking={isSpeaking}
          onCompleteLevel={(lvl) => handleCompleteLevel('monte-amiguinho', lvl)}
          onRecordAttempt={() => handleRecordAttempt('monte-amiguinho')}
          onRecordHint={() => handleRecordHint('monte-amiguinho')}
          onSaveCustomAvatar={handleSaveCustomAvatar}
          onBackHub={handleBackToHub}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      );
    }

    if (activeGame === 'quebra-cabeca') {
      return (
        <Game2QuebraCabeca
          starsEarned={progress.stars['quebra-cabeca']}
          avatarConfig={progress.customAvatar}
          isSpeaking={isSpeaking}
          onCompleteLevel={(lvl) => handleCompleteLevel('quebra-cabeca', lvl)}
          onRecordAttempt={() => handleRecordAttempt('quebra-cabeca')}
          onRecordHint={() => handleRecordHint('quebra-cabeca')}
          onBackHub={handleBackToHub}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      );
    }

    if (activeGame === 'pinte-regras') {
      return (
        <Game3PinteRegras
          starsEarned={progress.stars['pinte-regras']}
          avatarConfig={progress.customAvatar}
          isSpeaking={isSpeaking}
          settings={progress.settings}
          onCompleteLevel={(lvl) => handleCompleteLevel('pinte-regras', lvl)}
          onRecordAttempt={() => handleRecordAttempt('pinte-regras')}
          onRecordHint={() => handleRecordHint('pinte-regras')}
          onBackHub={handleBackToHub}
          onOpenAccessibility={() => setShowAccessibilityModal(true)}
          onOpenTeacher={() => setShowTeacherModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      );
    }

    if (activeGame === 'tangram-bit') {
      return (
        <Game4TangramBit
          starsEarned={progress.stars['tangram-bit']}
          avatarConfig={progress.customAvatar}
          isSpeaking={isSpeaking}
          settings={progress.settings}
          onCompleteLevel={(lvl) => handleCompleteLevel('tangram-bit', lvl)}
          onRecordAttempt={() => handleRecordAttempt('tangram-bit')}
          onRecordHint={() => handleRecordHint('tangram-bit')}
          onBackHub={handleBackToHub}
          onOpenAccessibility={() => setShowAccessibilityModal(true)}
          onOpenTeacher={() => setShowTeacherModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      );
    }

    if (activeGame === 'continue-sequencia') {
      return (
        <Game5ContinueSequencia
          starsEarned={progress.stars['continue-sequencia']}
          avatarConfig={progress.customAvatar}
          isSpeaking={isSpeaking}
          onCompleteLevel={(lvl) => handleCompleteLevel('continue-sequencia', lvl)}
          onRecordAttempt={() => handleRecordAttempt('continue-sequencia')}
          onRecordHint={() => handleRecordHint('continue-sequencia')}
          onBackHub={handleBackToHub}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      );
    }

    if (activeGame === 'programe-bit') {
      return (
        <Game6ProgrameBit
          starsEarned={progress.stars['programe-bit']}
          avatarConfig={progress.customAvatar}
          isSpeaking={isSpeaking}
          onCompleteLevel={(lvl) => handleCompleteLevel('programe-bit', lvl)}
          onRecordAttempt={() => handleRecordAttempt('programe-bit')}
          onRecordHint={() => handleRecordHint('programe-bit')}
          onBackHub={handleBackToHub}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      );
    }

    return null;
  };

  const hoveredGameMeta = HUB_GAMES.find((g) => g.id === hoveredHubGame);

  return (
    <>
      {activeGame ? (
        renderActiveGame()
      ) : (
        <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-50 select-none">
          {/* Canvas 3D Three.js em 100vw x 100vh */}
          <div className="absolute inset-0 w-full h-full">
            <ThreeBitStage
              mode="hub"
              cameraPreset={cameraPreset}
              isSpeaking={isSpeaking}
              primaryColor={progress.customAvatar.primaryColor}
              accentColor={progress.customAvatar.accentColor}
              onRobotClick={() => {
                soundEngine.playVictoryFanfare();
                soundEngine.speakManual(
                  'Oi amiguinho! Eu sou o Robô Bit! Toque em qualquer brinquedo 3D sobre a mesa de mármore ou nos cartões abaixo para brincar!'
                );
              }}
              onHoverHubGame={(gameId) => {
                setHoveredHubGame(gameId);
                if (gameId) {
                  const gm = HUB_GAMES.find((g) => g.id === gameId);
                  if (gm) soundEngine.speakHover(gm.title);
                }
              }}
              onSelectHubGame={(gameId) => {
                soundEngine.playMechanicalAttach();
                setActiveGame(gameId);
              }}
            />
          </div>

          {/* Barra Perimetral Superior */}
          <header className="pointer-events-none fixed top-0 inset-x-0 z-20 p-3 md:px-6 flex flex-wrap items-start justify-between gap-3">
            {/* Identidade + Avatar 2D/3D + Contador de Estrelas */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-2.5">
              <div className="hc-surface flex items-center gap-3 rounded-2xl bg-slate-900/95 border border-slate-700 px-3.5 py-2 shadow-2xl">
                <div
                  onClick={() => {
                    soundEngine.playTap();
                    setActiveGame('monte-amiguinho');
                  }}
                  className="cursor-pointer rounded-xl bg-slate-950 border border-slate-800 p-1 shrink-0 hover:scale-105 transition-transform"
                  title="Toque para personalizar seu Robô 3D!"
                >
                  <CharacterAvatarSvg
                    config={progress.customAvatar}
                    size={42}
                    isSpeaking={isSpeaking}
                  />
                </div>
                <div>
                  <span className="block text-base md:text-lg font-extrabold tracking-tight text-white font-display whitespace-nowrap">
                    EduGames Kids 3D
                  </span>
                  <span className="block text-[11px] text-amber-400 font-semibold whitespace-nowrap">
                    Oficina 3D · BNCC Computação (4–5 anos)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  soundEngine.speakManual(`Você já conquistou ${totalStarsEarned} estrelas de 18!`);
                }}
                className="hc-surface min-h-[48px] px-4 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 flex items-center gap-2 shadow-2xl"
                title="Estrelas conquistadas"
              >
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="text-base font-extrabold text-white tabular-nums">
                  {totalStarsEarned} / 18
                </span>
              </button>

              {!isOnline && (
                <div className="rounded-2xl bg-amber-500 text-slate-950 px-3 py-2 text-xs font-extrabold flex items-center gap-1.5 shadow-xl">
                  <WifiOff className="w-4 h-4" />
                  <span>Offline</span>
                </div>
              )}
            </div>

            {/* Controles de Câmera + Botão de Acessibilidade Inteligente + Chapéu de Formatura (Fundamentação Pedagógica) */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setCameraPreset((c) => (c === 'iso' ? 'front' : c === 'front' ? 'top' : 'iso'));
                }}
                className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 shadow-2xl text-xs font-bold"
                title="Alternar Câmera 3D"
              >
                <Camera className="w-5 h-5 text-sky-400" />
                <span className="hidden sm:inline">
                  {cameraPreset === 'iso' ? 'Mesa 3D' : cameraPreset === 'front' ? 'Perto' : 'Topo'}
                </span>
              </button>

              {!isInstalled && (isInstallable || isIOS) && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    if (isInstallable) install();
                    else setShowIOSInstallModal(true);
                  }}
                  className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-2xl whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">Instalar</span>
                </button>
              )}

              {/* Botão de Acessibilidade Inteligente */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setShowAccessibilityModal(true);
                }}
                onMouseEnter={() => soundEngine.speakHover('Acessibilidade Inteligente')}
                className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border-2 border-sky-400 text-sky-200 flex items-center gap-2 shadow-2xl text-xs font-extrabold whitespace-nowrap"
                aria-label="Abrir Acessibilidade Inteligente"
                title="Recursos Inteligentes de Acessibilidade (Daltonismo, TEA, TDAH, Leitor, Alto Contraste)"
              >
                <Accessibility className="w-5 h-5 text-sky-400" />
                <span>Acessibilidade</span>
              </button>

              {/* Chapéu de Formatura: Abre diretamente a Página de Fundamentação Pedagógica & Painel do Professor */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setShowTeacherModal(true);
                }}
                onMouseEnter={() =>
                  soundEngine.speakHover('Fundamentação Pedagógica e Painel do Professor')
                }
                className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border-2 border-amber-400 text-amber-200 flex items-center gap-2 shadow-2xl text-xs font-extrabold whitespace-nowrap"
                title="Abrir Fundamentação Pedagógica (BNCC Computação) e Relatório Formativo"
              >
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <span className="hidden md:inline">Pedagógico (BNCC)</span>
              </button>

              {/* Ícone de Engrenagem no Topo Direito: Configurações de Narrações, Sons e Volumes Individuais */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setShowSettingsModal(true);
                }}
                onMouseEnter={() =>
                  soundEngine.speakHover('Configurações de Áudio, Narrações e Volumes')
                }
                className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-slate-600 hover:border-amber-400 text-slate-100 flex items-center gap-2 shadow-2xl text-xs font-extrabold whitespace-nowrap transition-all"
                aria-label="Abrir Configurações de Áudio, Narração e Volumes"
                title="Configurações: Ativar/Desativar Narrações, Sons do Jogo e Volumes Individuais"
              >
                <Settings className="w-5 h-5 text-amber-400" />
                <span>Configurações</span>
              </button>
            </div>
          </header>

          {/* Indicador Flutuante quando o mouse aponta para um Brinquedo 3D sobre a Mesa */}
          {hoveredGameMeta && (
            <div className="pointer-events-none fixed top-20 inset-x-0 z-20 flex justify-center px-4">
              <div className="rounded-full bg-slate-900/95 border-2 border-amber-400 px-5 py-1.5 text-xs md:text-sm font-extrabold text-white flex items-center gap-2 shadow-2xl animate-guide-glow">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  Clique no brinquedo 3D para abrir: <strong>{hoveredGameMeta.title}</strong> (
                  {hoveredGameMeta.pilar})
                </span>
              </div>
            </div>
          )}

          {/* Dock Flutuante Inferior com os 6 Jogos 3D */}
          <div className="pointer-events-none fixed bottom-3 inset-x-0 z-20 px-3 md:px-6 flex flex-col items-center">
            <div className="pointer-events-auto flex flex-col items-center max-w-6xl w-full">
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    soundEngine.speakManual(
                      'Toque em um dos seis brinquedos 3D sobre a mesa de mármore ou escolha um cartão brilhante abaixo!'
                    );
                  }}
                  className="min-h-[36px] px-4 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg animate-guide-glow"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 Ouvir o Robô Bit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDockCollapsed((c) => !c)}
                  className="min-h-[36px] px-3.5 py-1 rounded-full bg-slate-900/95 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 shadow-lg"
                >
                  {dockCollapsed ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span>{dockCollapsed ? 'Mostrar Barra de Jogos' : 'Minimizar Barra'}</span>
                </button>
              </div>

              {!dockCollapsed && (
                <div className="hc-surface w-full rounded-3xl bg-slate-900/95 border border-slate-700 p-2.5 shadow-2xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {HUB_GAMES.map((game) => {
                    const gameStars = progress.stars[game.id];
                    const earnedCount = gameStars.filter(Boolean).length;
                    const isHovered = hoveredHubGame === game.id;
                    return (
                      <div
                        key={game.id}
                        onClick={() => {
                          soundEngine.playMechanicalAttach();
                          setActiveGame(game.id);
                        }}
                        onMouseEnter={() => {
                          setHoveredHubGame(game.id);
                          soundEngine.speakHover(game.title);
                        }}
                        onMouseLeave={() => setHoveredHubGame(null)}
                        className={`cursor-pointer rounded-2xl bg-slate-950/95 border-2 ${
                          game.accentColor
                        } p-2.5 flex flex-col justify-between transition-all hover:-translate-y-1 active:scale-95 ${
                          isHovered ? 'ring-2 ring-amber-400 scale-105' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${game.badgeBg}`}
                          >
                            {game.number}
                          </span>

                          <div
                            className="flex items-center gap-0.5"
                            title={`${earnedCount}/3 estrelas`}
                          >
                            {[0, 1, 2].map((idx) => (
                              <Star
                                key={idx}
                                className={`w-3.5 h-3.5 ${
                                  gameStars[idx]
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundEngine.playTap();
                              soundEngine.speakManual(game.spokenName);
                            }}
                            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400"
                            title="Ouvir nome do jogo"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <h2 className="text-xs md:text-sm font-extrabold text-white font-display leading-tight">
                            {game.title}
                          </h2>
                          <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                            {game.pilar}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* MODAL DE INSTRUÇÃO PARA INSTALAÇÃO NO iOS SAFARI */}
          {showIOSInstallModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
              <div className="hc-surface w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <h3 className="text-lg font-bold text-white font-display">
                  Instalar no iPad ou iPhone
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.
                  <br />
                  2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong> para
                  jogar offline em tela cheia!
                </p>
                <button
                  type="button"
                  onClick={() => setShowIOSInstallModal(false)}
                  className="w-full min-h-[48px] rounded-xl bg-sky-500 text-slate-950 font-bold text-sm"
                >
                  Entendi
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CENTRAL DE ACESSIBILIDADE INTELIGENTE (Acessível da Home e de dentro dos Jogos) */}
      {showAccessibilityModal && (
        <AccessibilitySmartModal
          settings={progress.settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowAccessibilityModal(false)}
        />
      )}

      {/* PÁGINA DE FUNDAMENTAÇÃO PEDAGÓGICA & PAINEL DO PROFESSOR (Chapéu de Formatura) */}
      {showTeacherModal && (
        <TeacherPanelModal
          progress={progress}
          onResetProgress={() => setProgress(resetAllProgress())}
          onClose={() => setShowTeacherModal(false)}
        />
      )}

      {/* PAINEL DE CONFIGURAÇÕES DE ÁUDIO, NARRAÇÕES E VOLUMES INDIVIDUAIS (Ícone Engrenagem) */}
      {showSettingsModal && (
        <GameSettingsModal
          settings={progress.settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
}
