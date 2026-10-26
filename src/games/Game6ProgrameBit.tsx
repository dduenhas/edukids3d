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
} from 'lucide-react';
import { CustomAvatarConfig } from '../utils/storage';
import { ThreeBitStage, RobotGridState } from '../components/ThreeBitStage';
import { GameIntroModal, CelebrationOverlay } from '../components/GameIntroModal';
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
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [commands, setCommands] = useState<DirectionCmd[]>([]);
  const [activeCmdIndex, setActiveCmdIndex] = useState<number | null>(null);
  const [bugCmdIndex, setBugCmdIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

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
          onTileClick={(tx, tz) => {
            if (level !== 3 || isRunning) return;
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
            onClick={() =>
              soundEngine.speak(
                'Toque nas setas coloridas abaixo para montar a fila de comandos e aperte Executar!'
              )
            }
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
        </div>
      </header>

      {/* Dock Flutuante Inferior Arrastável e Minimizável de Programação (Setas + Fila + Executar) */}
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

      {showCelebration && (
        <CelebrationOverlay
          levelCompleted={level}
          message="Uau! Seu programa funcionou perfeitamente e levou o Robô Bit direto até a estrela!"
          onNextLevel={
            level < 3
              ? () => {
                  setLevel((level + 1) as 1 | 2 | 3);
                  setShowCelebration(false);
                }
              : undefined
          }
          onReplay={() => {
            resetRobotToStart(level, true);
            setShowCelebration(false);
          }}
          onBackHub={onBackHub}
        />
      )}
    </div>
  );
};
