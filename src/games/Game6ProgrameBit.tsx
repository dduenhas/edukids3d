import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  HelpCircle,
  Home,
  Play,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Camera,
  Settings,
  Sparkles,
  Star,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { CustomAvatarConfig } from '../utils/storage';
import { ThreeBitStage, RobotGridState } from '../components/ThreeBitStage';
import { GameIntroModal } from '../components/GameIntroModal';
import { DraggableMinimizableDock } from '../components/DraggableMinimizableDock';
import { soundEngine } from '../utils/soundAndSpeech';

interface Game6Props {
  starsEarned: [boolean, boolean, boolean];
  avatarConfig: CustomAvatarConfig;
  isSpeaking: boolean;
  onCompleteLevel: (level: 1 | 2 | 3) => void;
  onRecordAttempt: () => void;
  onRecordHint: () => void;
  onBackHub: () => void;
  onOpenSettings?: () => void;
}

type DirectionCmd = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';

interface LevelMapConfig {
  gridSize: number;
  startPos: { x: number; z: number };
  starPos: { x: number; z: number };
  obstacles: Array<{ x: number; z: number }>;
}

const LEVEL_MAPS: Record<1 | 2 | 3, LevelMapConfig> = {
  1: {
    gridSize: 4,
    startPos: { x: 0, z: 3 },
    starPos: { x: 3, z: 3 },
    obstacles: [
      { x: 1, z: 1 },
      { x: 2, z: 1 },
    ],
  },
  2: {
    gridSize: 4,
    startPos: { x: 0, z: 3 },
    starPos: { x: 3, z: 0 },
    obstacles: [
      { x: 1, z: 3 },
      { x: 1, z: 2 },
      { x: 2, z: 0 },
    ],
  },
  3: {
    gridSize: 4,
    startPos: { x: 0, z: 3 },
    starPos: { x: 3, z: 0 },
    obstacles: [
      { x: 1, z: 2 },
      { x: 2, z: 1 },
    ],
  },
};

/**
 * Jogo Bônus — "Programe o Robô Bit 3D" (Pilar: Algoritmos Explícitos & Depuração)
 * Tabuleiro 3D em tela cheia sobre a bancada de mármore e runas douradas com braseiro aceso.
 */
export const Game6ProgrameBit: React.FC<Game6Props> = ({
  starsEarned,
  avatarConfig,
  isSpeaking,
  onCompleteLevel,
  onRecordAttempt,
  onRecordHint,
  onBackHub,
  onOpenSettings,
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [commands, setCommands] = useState<DirectionCmd[]>([]);
  const [activeCmdIndex, setActiveCmdIndex] = useState<number | null>(null);
  const [bugCmdIndex, setBugCmdIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAngleDeg, setCelebrationAngleDeg] = useState(0);
  const [celebrationPulseCount, setCelebrationPulseCount] = useState(0);
  const [celebrationFeedback, setCelebrationFeedback] = useState(
    'Toque no Robô Bit no tabuleiro 3D para ouvir Bip-Bop-Buzzz, saltar ou girar!'
  );

  const [gridState, setGridState] = useState<RobotGridState>({
    gridSize: 4,
    robotPos: { x: 0, z: 3 },
    robotDir: 1,
    starPos: { x: 3, z: 3 },
    obstacles: LEVEL_MAPS[1].obstacles,
    isCelebrating: false,
    isErrorBounce: false,
  });

  const runTimerRef = useRef<number | null>(null);

  const resetRobotToStart = (lvl: 1 | 2 | 3 = level, clearQueue = false) => {
    if (runTimerRef.current) clearTimeout(runTimerRef.current);
    const cfg = LEVEL_MAPS[lvl];
    setIsRunning(false);
    setActiveCmdIndex(null);
    setBugCmdIndex(null);
    if (clearQueue) setCommands([]);
    setGridState((prev) => ({
      gridSize: cfg.gridSize,
      robotPos: { ...cfg.startPos },
      robotDir: 1,
      starPos: lvl === 3 ? prev.starPos : { ...cfg.starPos },
      obstacles: lvl === 3 ? prev.obstacles : [...cfg.obstacles],
      isCelebrating: false,
      isErrorBounce: false,
    }));
  };

  useEffect(() => {
    if (showIntro) return;
    const cfg = LEVEL_MAPS[level];
    setCommands([]);
    setActiveCmdIndex(null);
    setBugCmdIndex(null);
    setShowCelebration(false);
    setCelebrationAngleDeg(0);
    setGridState({
      gridSize: cfg.gridSize,
      robotPos: { ...cfg.startPos },
      robotDir: 1,
      starPos: { ...cfg.starPos },
      obstacles: [...cfg.obstacles],
      isCelebrating: false,
      isErrorBounce: false,
    });

    if (level === 1) {
      soundEngine.speak(
        'Toque nas setas para montar a fila de comandos e levar o Robô Bit pelo tabuleiro 3D até a estrela dourada!'
      );
    } else if (level === 2) {
      soundEngine.speak(
        'Cuidado com os cristais de rubi no tabuleiro! Monte o caminho desviando dos obstáculos e aperte o botão verde!'
      );
    } else {
      soundEngine.speak(
        'Modo criador 3D! Toque nas casas do tabuleiro para colocar ou tirar cristais e depois programe o Robô Bit!'
      );
    }
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current);
    };
  }, [level, showIntro]);

  const addCommand = (cmd: DirectionCmd) => {
    if (isRunning || commands.length >= 10) return;
    soundEngine.playTap();
    const labels: Record<DirectionCmd, string> = {
      UP: 'Para cima',
      RIGHT: 'Para a direita',
      DOWN: 'Para baixo',
      LEFT: 'Para a esquerda',
    };
    soundEngine.speak(labels[cmd]);

    if (bugCmdIndex !== null) {
      setCommands((prev) => prev.map((c, idx) => (idx === bugCmdIndex ? cmd : c)));
      setBugCmdIndex(null);
      resetRobotToStart(level, false);
    } else {
      setCommands((prev) => [...prev, cmd]);
    }
  };

  const executeAlgorithm = () => {
    if (isRunning || commands.length === 0) {
      soundEngine.speak('Primeiro escolha algumas setas para montar o caminho do Bit!');
      return;
    }
    onRecordAttempt();
    const cfg = LEVEL_MAPS[level];
    let currX = cfg.startPos.x;
    let currZ = cfg.startPos.z;
    setGridState((prev) => ({
      ...prev,
      robotPos: { x: currX, z: currZ },
      robotDir: 1,
      isCelebrating: false,
      isErrorBounce: false,
    }));
    setIsRunning(true);
    setBugCmdIndex(null);

    const stepDelay = 680;

    const runStep = (idx: number) => {
      if (idx >= commands.length) {
        if (currX === gridState.starPos.x && currZ === gridState.starPos.z) {
          setIsRunning(false);
          setActiveCmdIndex(null);
          soundEngine.playVictoryFanfare();
          setGridState((prev) => ({ ...prev, isCelebrating: true }));
          onCompleteLevel(level);
          setShowCelebration(true);
        } else {
          setIsRunning(false);
          setActiveCmdIndex(null);
          soundEngine.playGentleHint();
          soundEngine.speak(
            'Quase chegamos! O Robô Bit parou antes da estrela. Adicione mais setas na fila!'
          );
        }
        return;
      }

      setActiveCmdIndex(idx);
      const cmd = commands[idx];
      let nextX = currX;
      let nextZ = currZ;
      let nextDir: 0 | 1 | 2 | 3 = 1;

      if (cmd === 'UP') {
        nextZ -= 1;
        nextDir = 0;
      } else if (cmd === 'RIGHT') {
        nextX += 1;
        nextDir = 1;
      } else if (cmd === 'DOWN') {
        nextZ += 1;
        nextDir = 2;
      } else if (cmd === 'LEFT') {
        nextX -= 1;
        nextDir = 3;
      }

      const outOfBounds =
        nextX < 0 || nextX >= gridState.gridSize || nextZ < 0 || nextZ >= gridState.gridSize;
      const hitObstacle = gridState.obstacles.some((o) => o.x === nextX && o.z === nextZ);

      if (outOfBounds || hitObstacle) {
        soundEngine.playGentleHint();
        setIsRunning(false);
        setBugCmdIndex(idx);
        setGridState((prev) => ({ ...prev, robotDir: nextDir, isErrorBounce: true }));
        soundEngine.speak(
          `Opa! No passo número ${idx + 1} tem um obstáculo! Toque em outra seta para corrigir o passo destacado em amarelo.`
        );
        return;
      }

      currX = nextX;
      currZ = nextZ;
      soundEngine.playRobotStep(idx);
      setGridState((prev) => ({
        ...prev,
        robotPos: { x: currX, z: currZ },
        robotDir: nextDir,
      }));

      runTimerRef.current = window.setTimeout(() => runStep(idx + 1), stepDelay);
    };

    runTimerRef.current = window.setTimeout(() => runStep(0), 250);
  };

  const handleHint = () => {
    onRecordHint();
    soundEngine.playTap();
    const start = LEVEL_MAPS[level].startPos;
    const goal = gridState.starPos;
    if (goal.z < start.z) {
      soundEngine.speak(
        'Dica do Bit: A estrela está lá no topo do tabuleiro! Coloque setas para cima e para a direita!'
      );
    } else {
      soundEngine.speak(
        'Dica do Bit: A estrela está à direita! Coloque três setas para a direita e aperte Executar!'
      );
    }
  };

  const rotateBoardBounded = (deltaDeg: number) => {
    setCelebrationAngleDeg((prev) => Math.max(-45, Math.min(45, prev + deltaDeg)));
    soundEngine.playTap();
  };

  const renderArrowIcon = (cmd: DirectionCmd, className = 'w-6 h-6') => {
    if (cmd === 'UP') return <ArrowUp className={className} />;
    if (cmd === 'RIGHT') return <ArrowRight className={className} />;
    if (cmd === 'DOWN') return <ArrowDown className={className} />;
    return <ArrowLeft className={className} />;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* Palco 3D Fullscreen (Tabuleiro de Mármore e Runas Douradas + Braseiro) */}
      <div className="absolute inset-0 w-full h-full">
        <ThreeBitStage
          mode="robot-grid"
          cameraPreset={cameraPreset}
          isSpeaking={isSpeaking}
          primaryColor={avatarConfig.primaryColor}
          accentColor={avatarConfig.accentColor}
          gridState={gridState}
          showcaseSplitView={showCelebration}
          showcaseYawDeg={celebrationAngleDeg}
          showcasePulseCount={celebrationPulseCount}
          onRobotClick={() => {
            soundEngine.playRobotBeepBop();
            setCelebrationPulseCount((c) => c + 1);
            if (showCelebration) {
              setCelebrationFeedback('Bip-Bop-Buzzz! O Robô Bit deu um super pulo na estrela dourada!');
            }
          }}
          onTileClick={(tx, tz) => {
            if (level !== 3 || isRunning || showCelebration) return;
            if (
              (tx === gridState.robotPos.x && tz === gridState.robotPos.z) ||
              (tx === gridState.starPos.x && tz === gridState.starPos.z)
            ) {
              return;
            }
            soundEngine.playTap();
            setGridState((prev) => {
              const exists = prev.obstacles.some((o) => o.x === tx && o.z === tz);
              return {
                ...prev,
                obstacles: exists
                  ? prev.obstacles.filter((o) => !(o.x === tx && o.z === tz))
                  : [...prev.obstacles, { x: tx, z: tz }],
              };
            });
          }}
        />
      </div>

      {/* Header Perimetral Flutuante */}
      <header className="pointer-events-none fixed top-0 inset-x-0 z-20 p-3 md:px-6 flex items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onBackHub();
            }}
            className="hc-button min-h-[48px] px-4 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-sm flex items-center gap-2 shadow-xl"
          >
            <Home className="w-5 h-5 text-yellow-400" />
            <span className="hidden sm:inline">Início</span>
          </button>

          <div className="hc-surface px-4 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-xl flex items-center gap-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-yellow-400">
              Bônus 3D
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <h1 className="text-sm md:text-base font-bold font-display whitespace-nowrap">
              Programe o Robô Bit
            </h1>
          </div>
        </div>

        {/* Seletor de Fases */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/95 border border-slate-700 rounded-2xl p-1.5 shadow-xl">
          {([1, 2, 3] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setLevel(lvl);
              }}
              className={`min-h-[40px] px-3 rounded-xl font-bold text-xs transition-all ${
                level === lvl
                  ? 'bg-yellow-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Fase {lvl} {starsEarned[lvl - 1] ? '⭐' : ''}
            </button>
          ))}
        </div>

        {/* Câmera, Ouvir e Dica */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCameraPreset((c) => (c === 'iso' ? 'top' : c === 'top' ? 'front' : 'iso'))
            }
            className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xl"
            title="Mudar ângulo da câmera 3D"
          >
            <Camera className="w-5 h-5 text-sky-400" />
            <span className="hidden md:inline">
              {cameraPreset === 'iso' ? 'Vista 3D' : cameraPreset === 'top' ? 'Vista Topo' : 'Vista Frente'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              soundEngine.speakManual(
                'Toque nas setas coloridas abaixo para montar a fila de comandos e aperte Executar!'
              );
            }}
            className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 shadow-xl"
          >
            <Volume2 className="w-5 h-5 text-sky-400" />
          </button>

          <button
            type="button"
            onClick={handleHint}
            className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 shadow-xl"
          >
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <span className="hidden sm:inline">Dica</span>
          </button>

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onOpenSettings();
              }}
              className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-slate-600 hover:border-amber-400 text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-xl"
              title="Configurações de Áudio, Narração e Volumes"
              aria-label="Abrir Configurações"
            >
              <Settings className="w-5 h-5 text-amber-400" />
              <span className="hidden lg:inline">Configurações</span>
            </button>
          )}
        </div>
      </header>

      {/* Dock Flutuante Inferior Arrastável e Minimizável de Programação (oculto na celebração) */}
      {!showCelebration && (
        <DraggableMinimizableDock
          title={`Programação do Robô Bit (${commands.length}/10 passos)`}
          minimizedLabel="Mostrar Painel de Programação"
          maxWidthClass="max-w-5xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* 1. Botões Direcionais */}
            <div className="flex items-center gap-2 shrink-0">
              {(
                [
                  { cmd: 'UP', label: 'Cima', color: 'bg-sky-500 hover:bg-sky-400 text-slate-950' },
                  { cmd: 'RIGHT', label: 'Direita', color: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' },
                  { cmd: 'DOWN', label: 'Baixo', color: 'bg-amber-400 hover:bg-amber-300 text-slate-950' },
                  { cmd: 'LEFT', label: 'Esquerda', color: 'bg-purple-400 hover:bg-purple-300 text-slate-950' },
                ] as const
              ).map((btn) => (
                <button
                  key={btn.cmd}
                  type="button"
                  disabled={isRunning}
                  onMouseEnter={() => soundEngine.speakHover(`Seta para ${btn.label}`)}
                  onClick={() => addCommand(btn.cmd)}
                  className={`hc-button min-h-[54px] min-w-[64px] px-3 rounded-2xl ${btn.color} font-extrabold flex flex-col items-center justify-center gap-0.5 shadow-md active:scale-95 disabled:opacity-40`}
                >
                  {renderArrowIcon(btn.cmd, 'w-6 h-6')}
                  <span className="text-[11px]">{btn.label}</span>
                </button>
              ))}
            </div>

            {/* 2. Fila de Comandos Compacta */}
            <div className="flex-1 w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 min-h-[54px] flex items-center gap-1.5 overflow-x-auto">
              {commands.length === 0 ? (
                <span className="text-xs text-slate-400 mx-auto">
                  Toque nas setas para programar os passos do Robô Bit (máx. 10)...
                </span>
              ) : (
                commands.map((cmd, idx) => {
                  const isRunningStep = activeCmdIndex === idx;
                  const isBugStep = bugCmdIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isRunning}
                      onClick={() => {
                        soundEngine.playTap();
                        setCommands((prev) => prev.filter((_, i) => i !== idx));
                        setBugCmdIndex(null);
                      }}
                      className={`min-h-[44px] min-w-[44px] px-2 rounded-xl border-2 flex flex-col items-center justify-center shrink-0 transition-all ${
                        isBugStep
                          ? 'bg-amber-400/25 border-amber-400 text-amber-300 scale-110 animate-guide-glow'
                          : isRunningStep
                          ? 'bg-emerald-500/30 border-emerald-400 text-white scale-110'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-rose-400'
                      }`}
                      title="Toque para remover este passo"
                    >
                      <span className="text-[9px] font-mono text-slate-400 tabular-nums">
                        {idx + 1}
                      </span>
                      {renderArrowIcon(cmd, 'w-4 h-4')}
                    </button>
                  );
                })
              )}
            </div>

            {/* 3. Botões Reiniciar e Executar */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  resetRobotToStart(level, true);
                }}
                className="hc-button min-h-[52px] px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
                title="Limpar fila e voltar ao início"
              >
                {commands.length > 0 ? (
                  <Trash2 className="w-5 h-5 text-rose-400" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">Limpar</span>
              </button>

              <button
                type="button"
                disabled={isRunning}
                onClick={executeAlgorithm}
                className="hc-button min-h-[52px] px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm md:text-base flex items-center gap-2 shadow-lg active:scale-95 whitespace-nowrap"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Executar!</span>
              </button>
            </div>
          </div>
        </DraggableMinimizableDock>
      )}

      {showIntro && (
        <GameIntroModal
          title="Programe o Robô Bit 3D"
          pilarLabel="Algoritmos Explícitos e Depuração"
          bnccCode="EI03CO02 · EI03CO03"
          spokenIntro="Ajude o Robô Bit a chegar até a estrela brilhante no tabuleiro de mármore! Escolha as setas para montar o caminho e aperte Executar!"
          currentLevel={level}
          starsEarned={starsEarned}
          avatarConfig={avatarConfig}
          isSpeaking={isSpeaking}
          onSelectLevel={(lvl) => setLevel(lvl)}
          onStartPlay={() => setShowIntro(false)}
        />
      )}

      {/* Vitrine 2 Colunas Lado a Lado: Tabuleiro 3D & Robô Bit (Esquerda) + Box de Parabéns (Direita) */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-40 pointer-events-none flex flex-col md:flex-row items-center justify-between p-4 md:px-8 md:pt-20 md:pb-6 gap-4"
          role="dialog"
          aria-modal="true"
          aria-label="Parabéns! Algoritmo 3D Concluído"
        >
          {/* Coluna Esquerda: Controles Interativos do Tabuleiro & Robô Bit 3D */}
          <div className="w-full md:w-7/12 h-full flex flex-col justify-between items-center py-2">
            <div className="pointer-events-auto hc-surface bg-slate-950/90 border-2 border-yellow-400/70 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 max-w-lg">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
              <p className="text-xs md:text-sm font-extrabold text-yellow-100">
                {celebrationFeedback}
              </p>
            </div>

            <div className="pointer-events-auto hc-surface bg-slate-950/92 border border-slate-700/90 rounded-3xl p-3 shadow-2xl flex flex-col items-center gap-2.5 max-w-xl w-full">
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playRobotBeepBop();
                    setCelebrationPulseCount((c) => c + 1);
                    setCelebrationFeedback('Bip-Bop-Buzzz! O Robô Bit acendeu as luzes e comemorou na estrela!');
                  }}
                  className="hc-button min-h-[46px] px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Acender Luzes &amp; Bip-Bop!</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSparkle();
                    setCelebrationPulseCount((c) => c + 1);
                    setCelebrationFeedback('Super Pulo da Vitória 3D ativado no Tabuleiro de Mármore!');
                  }}
                  className="hc-button min-h-[46px] px-4 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  <span>Pulo da Vitória 3D!</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => rotateBoardBounded(-15)}
                  className="hc-button min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar um pouquinho para a esquerda"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Girar Esq.</span>
                </button>

                <span className="text-[11px] font-mono font-bold text-amber-300 px-2 tabular-nums">
                  {celebrationAngleDeg}°
                </span>

                <button
                  type="button"
                  onClick={() => rotateBoardBounded(15)}
                  className="hc-button min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar um pouquinho para a direita"
                >
                  <span>Girar Dir.</span>
                  <RotateCcw className="w-3.5 h-3.5 text-yellow-400 -scale-x-100" />
                </button>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Box de Parabéns Lado a Lado */}
          <div className="pointer-events-auto w-full md:w-5/12 max-w-md hc-surface rounded-3xl bg-slate-900/95 border-2 border-amber-400/70 p-6 md:p-7 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center animate-bounce">
              <Star className="w-9 h-9 text-amber-400 fill-amber-400" />
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-400/40 px-3 py-1 rounded-full mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Fase {level} Concluída!
            </span>

            <h2 className="text-xl md:text-2xl font-extrabold font-display text-white mb-2">
              Parabéns! Estrela Ganha!
            </h2>

            <p className="text-slate-200 text-xs md:text-sm leading-relaxed mb-4">
              &ldquo;Uau! Seu programa de {commands.length} passos funcionou perfeitamente e levou o Robô Bit direto até a estrela dourada ao lado!&rdquo;
            </p>

            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 mb-5 text-left text-xs text-slate-300 space-y-1">
              <div className="font-extrabold text-yellow-300">
                🤖 Experimente no Tabuleiro 3D ao lado:
              </div>
              <p>• Toque no <strong>Robô Bit 3D</strong> para ele dar um pulo com faíscas;</p>
              <p>• Clique em <strong>Acender Luzes &amp; Bip-Bop</strong> para ouvir o som;</p>
              <p>• Use os botões para <strong>girar o tabuleiro um pouquinho (±45°)</strong>.</p>
            </div>

            <div className="flex flex-col gap-2.5">
              {level < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setLevel((level + 1) as 1 | 2 | 3);
                    setShowCelebration(false);
                  }}
                  className="hc-button w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <span>Próxima Fase</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    resetRobotToStart(level, true);
                    setShowCelebration(false);
                  }}
                  className="hc-button min-h-[46px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs md:text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Jogar de Novo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    onBackHub();
                  }}
                  className="hc-button min-h-[46px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs md:text-sm flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4 text-sky-400" />
                  <span>Início</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

