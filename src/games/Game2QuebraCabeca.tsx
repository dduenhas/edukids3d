import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Volume2,
  HelpCircle,
  Home,
  Eye,
  RotateCw,
  RotateCcw,
  Star,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Waves,
  Settings,
} from 'lucide-react';
import { CustomAvatarConfig } from '../utils/storage';
import { GameIntroModal } from '../components/GameIntroModal';
import { DraggableMinimizableDock } from '../components/DraggableMinimizableDock';
import { soundEngine } from '../utils/soundAndSpeech';
import {
  detectSoftwareGl,
  buildStudioWorkshopEnvironment,
  SparkBurstManager,
  create3DPointerIndicator,
} from '../utils/threeEnvironment';

interface Game2Props {
  starsEarned: [boolean, boolean, boolean];
  avatarConfig: CustomAvatarConfig;
  isSpeaking: boolean;
  onCompleteLevel: (level: 1 | 2 | 3) => void;
  onRecordAttempt: () => void;
  onRecordHint: () => void;
  onBackHub: () => void;
  onOpenSettings?: () => void;
}

type PuzzleTheme = 'rocket' | 'cake' | 'flower';

interface TileState {
  pieceIndex: number;
  currentSlot: number | null;
  rotation: number; // 0, 90, 180, 270
}

const PUZZLE_LIGHT_COLORS = [
  { hex: '#FACC15', num: 0xfacc15, name: 'Ouro Solar' },
  { hex: '#38BDF8', num: 0x38bdf8, name: 'Azul Estelar' },
  { hex: '#F472B6', num: 0xf472b6, name: 'Rosa Mágico' },
  { hex: '#34D399', num: 0x34d399, name: 'Verde Esmeralda' },
];

/**
 * Desenha a pintura de alta resolução (768x768) de cada tema do Quebra-Cabeça 3D
 * para ser aplicada como textura PBR envernizada sobre os blocos de madeira 3D!
 */
function createPuzzleArtworkCanvas(theme: PuzzleTheme): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  if (theme === 'rocket') {
    const bg = ctx.createRadialGradient(384, 384, 50, 384, 384, 540);
    bg.addColorStop(0, '#1E1B4B');
    bg.addColorStop(1, '#090D16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 768);

    // Estrelas e planetas
    ctx.fillStyle = '#FDE047';
    [
      [110, 120, 16],
      [640, 140, 20],
      [140, 560, 14],
      [620, 540, 18],
      [220, 280, 10],
    ].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Planeta Saturno
    ctx.fillStyle = '#A855F7';
    ctx.beginPath();
    ctx.arc(600, 290, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F3E8FF';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(600, 290, 98, 22, -0.25, 0, Math.PI * 2);
    ctx.stroke();

    // Chamas propulsoras
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(295, 540);
    ctx.lineTo(384, 725);
    ctx.lineTo(473, 540);
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(325, 540);
    ctx.lineTo(384, 675);
    ctx.lineTo(443, 540);
    ctx.fill();

    // Aletas vermelhas
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(275, 430);
    ctx.lineTo(165, 585);
    ctx.lineTo(295, 555);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(493, 430);
    ctx.lineTo(603, 585);
    ctx.lineTo(473, 555);
    ctx.fill();

    // Corpo do Foguete
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.roundRect(270, 210, 228, 345, 85);
    ctx.fill();
    ctx.stroke();

    // Ponta vermelha
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(276, 265);
    ctx.quadraticCurveTo(384, 55, 492, 265);
    ctx.closePath();
    ctx.fill();

    // Escotilha azul brilhante
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(384, 370, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (theme === 'cake') {
    const bg = ctx.createRadialGradient(384, 384, 60, 384, 384, 540);
    bg.addColorStop(0, '#311042');
    bg.addColorStop(1, '#13071E');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 768);

    // Prato dourado
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.ellipse(384, 650, 290, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Camada inferior rosa
    ctx.fillStyle = '#F472B6';
    ctx.strokeStyle = '#FCE7F3';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(140, 440, 488, 200, 42);
    ctx.fill();
    ctx.stroke();

    // Camada superior azul
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.roundRect(205, 280, 358, 175, 38);
    ctx.fill();
    ctx.stroke();

    // Velas e Chamas
    [300, 384, 468].forEach((vx) => {
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(vx - 18, 155, 36, 125);
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(vx, 118, 24, 38, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, 768);
    bg.addColorStop(0, '#0284C7');
    bg.addColorStop(0.75, '#065F46');
    bg.addColorStop(1, '#064E3B');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 768);

    // Sol dourado
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(145, 145, 82, 0, Math.PI * 2);
    ctx.fill();

    // Caule verde
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 38;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(384, 360);
    ctx.lineTo(384, 680);
    ctx.stroke();

    // Pétalas
    ctx.fillStyle = '#F472B6';
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      ctx.beginPath();
      ctx.arc(384 + Math.cos(ang) * 135, 345 + Math.sin(ang) * 135, 78, 0, Math.PI * 2);
      ctx.fill();
    }

    // Miolo sorridente
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(384, 345, 92, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moldura dourada interna
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 754, 754);

  return canvas;
}

/**
 * Jogo 2 em 3D Interativo — "Quebra-Cabeça de Blocos 3D" (Decomposição + Abstração)
 * Ao completar todos os blocos do quadro 3D, a tela se divide em DUAS COLUNAS:
 * - Coluna Esquerda: O Quadro 3D completo se ergue levemente como um troféu iluminado,
 *   permitindo clicar nos blocos para fazer ondas 3D, acender luzes mágicas e girar um pouquinho (±45°)!
 * - Coluna Direita: O Box de Parabéns com a estrela ganha e botões de próxima fase.
 */
export const Game2QuebraCabeca: React.FC<Game2Props> = ({
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
  const [theme, setTheme] = useState<PuzzleTheme>('rocket');
  const [previewSeconds, setPreviewSeconds] = useState<number>(3);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [hintPiece, setHintPiece] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Estados de Interação com o Quebra-Cabeça 3D Pronto
  const [lightColorIdx, setLightColorIdx] = useState(0);
  const [lightsActive, setLightsActive] = useState(false);
  const [boardYawDeg, setBoardYawDeg] = useState(0); // Limitado entre -45° e +45°
  const [puzzleFeedbackText, setPuzzleFeedbackText] = useState(
    'Toque nos blocos do seu Quadro 3D para fazer uma onda mágica, acender luzes ou girar um pouquinho!'
  );

  const mountRef = useRef<HTMLDivElement | null>(null);

  const cols = level === 1 ? 2 : 3;
  const rows = level === 1 ? 2 : level === 2 ? 2 : 3;

  // Refs de animação interativa do Quadro 3D Pronto
  const interactionRef = useRef({
    waveTimeLeft: 0,
    lightPulseTimeLeft: 0,
    clickedBlockIdx: -1,
    clickedBlockBounce: 0,
    targetYawRad: 0,
    currentYawRad: 0,
    currentTiltX: 0,
    currentLiftY: 0,
    triggerBurstRequest: null as { pos: [number, number, number]; color: string } | null,
  });

  // Funções de Interação com o Quadro 3D Completo
  const triggerPuzzleLights = () => {
    const nextIdx = (lightColorIdx + 1) % PUZZLE_LIGHT_COLORS.length;
    const chosenColor = PUZZLE_LIGHT_COLORS[nextIdx];
    setLightColorIdx(nextIdx);
    setLightsActive(true);
    interactionRef.current.lightPulseTimeLeft = 2.6;
    interactionRef.current.waveTimeLeft = 1.6;
    interactionRef.current.triggerBurstRequest = {
      pos: [0, 0.75, 0],
      color: chosenColor.hex,
    };
    soundEngine.playPaintBrushSplash();
    soundEngine.playRobotBipBop('lights');

    const themePhrase =
      theme === 'rocket'
        ? 'Foguete 3D iluminado pronto para decolar!'
        : theme === 'cake'
        ? 'As velinhas do Bolo de Festa 3D estão brilhando!'
        : 'O Jardim 3D brilhou com a luz dourada do sol!';

    setPuzzleFeedbackText(`💡 Luz ${chosenColor.name}! ${themePhrase}`);
    soundEngine.speak(themePhrase);
  };

  const triggerPuzzleWave = (centerBlockIdx: number = -1) => {
    interactionRef.current.waveTimeLeft = 2.5;
    interactionRef.current.lightPulseTimeLeft = 1.8;
    if (centerBlockIdx >= 0) {
      interactionRef.current.clickedBlockIdx = centerBlockIdx;
      interactionRef.current.clickedBlockBounce = 1.0;
    }
    interactionRef.current.triggerBurstRequest = {
      pos: [0, 0.65, 0],
      color: '#34D399',
    };
    soundEngine.playWoodBlockSnap();
    soundEngine.playRobotBipBop('limbs');
    setPuzzleFeedbackText('🌊 Onda 3D! Veja os blocos esculpidos de madeira dançando em relevo!');
  };

  const rotatePuzzleLimited = (deltaDeg: number) => {
    soundEngine.playRobotBipBop('spin');
    setBoardYawDeg((prev) => {
      const clamped = Math.max(-45, Math.min(45, prev + deltaDeg));
      interactionRef.current.targetYawRad = THREE.MathUtils.degToRad(clamped);
      return clamped;
    });
    setPuzzleFeedbackText('🔄 Girando o Quadro 3D um pouquinho para ver o brilho do verniz!');
  };

  const stateRef = useRef({
    level,
    theme,
    cols,
    rows,
    previewSeconds,
    tiles,
    selectedPiece,
    hintPiece,
    showCelebration,
    lightsActive,
    lightColorIdx,
    onPlacePiece: (_pIdx: number, _slotIdx: number) => {},
    onSelectPiece: (_pIdx: number) => {},
    onRotatePiece: (_pIdx: number) => {},
    onInteractCompletedBlock: (_pIdx: number) => {},
  });

  const startNewPuzzle = (lvl: 1 | 2 | 3, thm: PuzzleTheme = theme) => {
    const c = lvl === 1 ? 2 : 3;
    const r = lvl === 1 ? 2 : lvl === 2 ? 2 : 3;
    const count = c * r;

    const indices = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5);
    const initialTiles: TileState[] = indices.map((pieceIdx, i) => ({
      pieceIndex: pieceIdx,
      currentSlot: null,
      rotation: lvl === 2 && i % 2 === 0 ? 90 : 0,
    }));

    setTiles(initialTiles);
    setSelectedPiece(null);
    setHintPiece(null);
    setShowCelebration(false);
    setLightsActive(false);
    setBoardYawDeg(0);
    interactionRef.current.targetYawRad = 0;
    interactionRef.current.currentYawRad = 0;
    interactionRef.current.waveTimeLeft = 0;
    setPreviewSeconds(3);

    soundEngine.speak(
      'Observe os blocos 3D montados na mesa por três segundos! Depois que eles voarem, encaixe cada bloco de volta!'
    );
    void thm;
  };

  useEffect(() => {
    if (!showIntro) {
      startNewPuzzle(level, theme);
    }
  }, [level, theme, showIntro]);

  useEffect(() => {
    if (showIntro || previewSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setPreviewSeconds((s) => {
        if (s === 1) soundEngine.playWoodBlockSnap();
        return s - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [previewSeconds, showIntro]);

  const rotatePiece = (pieceIndex: number) => {
    soundEngine.playWoodBlockSnap();
    setTiles((prev) =>
      prev.map((t) =>
        t.pieceIndex === pieceIndex ? { ...t, rotation: (t.rotation + 90) % 360 } : t
      )
    );
  };

  const handlePlaceInSlot = (pieceIndex: number, targetSlot: number) => {
    onRecordAttempt();
    const tile = stateRef.current.tiles.find((t) => t.pieceIndex === pieceIndex);
    if (!tile || tile.currentSlot !== null) return;

    if (tile.rotation !== 0) {
      soundEngine.playGentleHint();
      soundEngine.speak('Este bloco 3D está girado! Toque em Girar Bloco antes de encaixar.');
      return;
    }

    if (pieceIndex === targetSlot) {
      soundEngine.playWoodBlockSnap();
      const updated = stateRef.current.tiles.map((t) =>
        t.pieceIndex === pieceIndex ? { ...t, currentSlot: targetSlot } : t
      );
      setTiles(updated);
      setSelectedPiece(null);
      setHintPiece(null);

      if (updated.every((t) => t.currentSlot === t.pieceIndex && t.rotation === 0)) {
        onCompleteLevel(stateRef.current.level);
        window.setTimeout(() => {
          setShowCelebration(true);
          setLightsActive(true);
          interactionRef.current.waveTimeLeft = 3.0;
          interactionRef.current.lightPulseTimeLeft = 3.0;
          soundEngine.playVictoryFanfare();
          soundEngine.playPaintBrushSplash();
          soundEngine.speak(
            'Parabéns! Você completou o Quebra-Cabeça 3D! Toque nos blocos ao lado para fazer ondas 3D, acender luzes e girar o quadro um pouquinho!'
          );
        }, 650);
      }
    } else {
      soundEngine.playGentleHint();
      setHintPiece(pieceIndex);
      soundEngine.speak('Quase! Olhe o espaço que está brilhando em dourado no tabuleiro!');
    }
  };

  useEffect(() => {
    stateRef.current.level = level;
    stateRef.current.theme = theme;
    stateRef.current.cols = cols;
    stateRef.current.rows = rows;
    stateRef.current.previewSeconds = previewSeconds;
    stateRef.current.tiles = tiles;
    stateRef.current.selectedPiece = selectedPiece;
    stateRef.current.hintPiece = hintPiece;
    stateRef.current.showCelebration = showCelebration;
    stateRef.current.lightsActive = lightsActive;
    stateRef.current.lightColorIdx = lightColorIdx;
    stateRef.current.onPlacePiece = handlePlaceInSlot;
    stateRef.current.onRotatePiece = rotatePiece;
    stateRef.current.onSelectPiece = (pIdx: number) => {
      soundEngine.playTap();
      setSelectedPiece(pIdx);
    };
    stateRef.current.onInteractCompletedBlock = (pIdx: number) => {
      triggerPuzzleWave(pIdx);
    };
  });

  // Cena 3D Interativa do Quebra-Cabeça de Blocos
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 5.2, 4.9);
    camera.lookAt(0, 0, 0.25);
    const currentLookAt = new THREE.Vector3(0, 0, 0.25);

    const { updateEnvironment } = buildStudioWorkshopEnvironment(scene, renderer, isSoftwareGl);
    const sparkManager = new SparkBurstManager(scene);
    const pointer3D = create3DPointerIndicator(scene);

    // Grupo Raiz do Quadro 3D (Permite inclinar como cavalete e girar ±45° quando concluído!)
    const puzzleShowcaseGroup = new THREE.Group();
    scene.add(puzzleShowcaseGroup);

    // Moldura Esculpida Central na Mesa 3D
    const frameGroup = new THREE.Group();
    const frameBaseMat = new THREE.MeshStandardMaterial({
      color: '#451A03',
      roughness: 0.35,
      metalness: 0.35,
    });
    const frameBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.86, 0.1, 2.86),
      frameBaseMat
    );
    frameBase.position.y = 0.05;
    frameBase.receiveShadow = true;
    frameGroup.add(frameBase);

    // Aro Luminoso Dourado ao redor da moldura 3D
    const frameGlowRimMat = new THREE.MeshStandardMaterial({
      color: '#FACC15',
      roughness: 0.22,
      metalness: 0.8,
      emissive: '#D97706',
      emissiveIntensity: 0.35,
    });
    const borderBars = [
      { w: 2.94, d: 0.08, x: 0, z: -1.43 },
      { w: 2.94, d: 0.08, x: 0, z: 1.43 },
      { w: 0.08, d: 2.8, x: -1.43, z: 0 },
      { w: 0.08, d: 2.8, x: 1.43, z: 0 },
    ];
    borderBars.forEach((b) => {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, 0.18, b.d),
        frameGlowRimMat
      );
      bar.position.set(b.x, 0.09, b.z);
      frameGroup.add(bar);
    });

    puzzleShowcaseGroup.add(frameGroup);

    // Luz Dinâmica Mágica sobre o Quadro 3D Completo
    const puzzleMagicLight = new THREE.PointLight(0xfacc15, 0, 5.5);
    puzzleMagicLight.position.set(0, 1.8, 0.6);
    puzzleShowcaseGroup.add(puzzleMagicLight);

    const slotsGroup = new THREE.Group();
    const blocksGroup = new THREE.Group();
    puzzleShowcaseGroup.add(slotsGroup, blocksGroup);

    interface Block3DEntry {
      pieceIndex: number;
      col: number;
      row: number;
      mesh: THREE.Mesh;
      slotMesh: THREE.Mesh;
      targetSlotPos: THREE.Vector3;
      trayPos: THREE.Vector3;
    }

    let blockEntries: Block3DEntry[] = [];
    let builtKey = '';

    const rebuildPuzzle3D = () => {
      const st = stateRef.current;
      const key = `${st.level}-${st.theme}-${st.tiles.map((t) => t.pieceIndex).join(',')}`;
      if (key === builtKey) return;
      builtKey = key;

      while (slotsGroup.children.length > 0) slotsGroup.remove(slotsGroup.children[0]);
      while (blocksGroup.children.length > 0) blocksGroup.remove(blocksGroup.children[0]);
      blockEntries = [];

      const fullCanvas = createPuzzleArtworkCanvas(st.theme);
      const boardSize = 2.52;
      const tileW = boardSize / st.cols;
      const tileH = boardSize / st.rows;

      const sideWoodMat = new THREE.MeshStandardMaterial({
        color: '#D97706',
        roughness: 0.35,
        metalness: 0.45,
      });

      st.tiles.forEach((tileState, trayOrderIdx) => {
        const pIdx = tileState.pieceIndex;
        const c = pIdx % st.cols;
        const r = Math.floor(pIdx / st.cols);

        // Recorta a sub-textura exata daquele bloco 3D
        const subCanvas = document.createElement('canvas');
        subCanvas.width = 256;
        subCanvas.height = 256;
        const subCtx = subCanvas.getContext('2d')!;
        const srcW = fullCanvas.width / st.cols;
        const srcH = fullCanvas.height / st.rows;
        subCtx.drawImage(fullCanvas, c * srcW, r * srcH, srcW, srcH, 0, 0, 256, 256);

        // Borda chanfrada dourada no bloco
        subCtx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
        subCtx.lineWidth = 8;
        subCtx.strokeRect(4, 4, 248, 248);

        const subTex = new THREE.CanvasTexture(subCanvas);
        subTex.colorSpace = THREE.SRGBColorSpace;
        subTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const topMat = new THREE.MeshPhysicalMaterial({
          map: subTex,
          roughness: 0.16,
          metalness: 0.1,
          clearcoat: isSoftwareGl ? 0 : 0.9,
        });

        const blockGeo = new THREE.BoxGeometry(tileW * 0.96, 0.22, tileH * 0.96);
        const blockMesh = new THREE.Mesh(blockGeo, [
          sideWoodMat,
          sideWoodMat,
          topMat,
          sideWoodMat,
          sideWoodMat,
          sideWoodMat,
        ]);
        blockMesh.castShadow = !isSoftwareGl;
        blockMesh.receiveShadow = true;
        blockMesh.userData = { pieceIndex: pIdx };

        // Posição no quadro central
        const slotX = (c - (st.cols - 1) / 2) * tileW;
        const slotZ = (r - (st.rows - 1) / 2) * tileH;
        const targetSlotPos = new THREE.Vector3(slotX, 0.19, slotZ);

        // Posição nas laterais da mesa de mármore quando embaralhado
        const isLeft = trayOrderIdx % 2 === 0;
        const sideRow = Math.floor(trayOrderIdx / 2);
        const trayX = isLeft ? -2.35 - (sideRow % 2) * 0.55 : 2.35 + (sideRow % 2) * 0.55;
        const trayZ = -1.1 + sideRow * 0.85;
        const trayPos = new THREE.Vector3(trayX, 0.15, trayZ);

        blockMesh.position.copy(targetSlotPos);
        blocksGroup.add(blockMesh);

        // Slot guia no quadro central
        const slotMat = new THREE.MeshStandardMaterial({
          map: st.level === 3 ? subTex : null,
          color: st.level === 3 ? '#64748B' : '#1E293B',
          roughness: 0.65,
        });
        const slotMesh = new THREE.Mesh(
          new THREE.BoxGeometry(tileW * 0.94, 0.04, tileH * 0.94),
          slotMat
        );
        slotMesh.position.set(slotX, 0.09, slotZ);
        slotMesh.userData = { slotIndex: pIdx };
        slotsGroup.add(slotMesh);

        blockEntries.push({
          pieceIndex: pIdx,
          col: c,
          row: r,
          mesh: blockMesh,
          slotMesh,
          targetSlotPos,
          trayPos,
        });
      });
    };

    rebuildPuzzle3D();

    // Raycasting para Arrastar Blocos 3D na Mesa OU Interagir/Girar o Quadro 3D Pronto!
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.35);
    const dragPoint = new THREE.Vector3();
    let draggingPieceIdx: number | null = null;
    let isDraggingBoardSpin = false;
    let spinStartX = 0;
    let spinStartYaw = 0;
    let spinMoved = false;
    let clickedCompletedBlockIdx: number | null = null;

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);

      const blockHits = raycaster.intersectObjects(blocksGroup.children, false);

      // MODO CELEBRAÇÃO (Quadro 3D Completo): Clicar num bloco faz onda/brilho e arrastar gira ±45°!
      if (stateRef.current.showCelebration) {
        if (blockHits.length > 0 || raycaster.intersectObjects(frameGroup.children, false).length > 0) {
          const hitIdx = blockHits[0]?.object.userData?.pieceIndex as number | undefined;
          clickedCompletedBlockIdx = typeof hitIdx === 'number' ? hitIdx : 0;
          isDraggingBoardSpin = true;
          spinMoved = false;
          spinStartX = e.clientX;
          spinStartYaw = interactionRef.current.targetYawRad;
          renderer.domElement.setPointerCapture(e.pointerId);
        }
        return;
      }

      if (stateRef.current.previewSeconds > 0) return;

      if (blockHits.length > 0) {
        const pIdx = blockHits[0].object.userData?.pieceIndex as number | undefined;
        const tState = stateRef.current.tiles.find((t) => t.pieceIndex === pIdx);
        if (typeof pIdx === 'number' && tState && tState.currentSlot === null) {
          draggingPieceIdx = pIdx;
          stateRef.current.onSelectPiece(pIdx);
          renderer.domElement.setPointerCapture(e.pointerId);
          return;
        }
      }

      // Se tocou num slot do quadro central com uma peça selecionada
      const sel = stateRef.current.selectedPiece;
      if (sel !== null) {
        const slotHits = raycaster.intersectObjects(slotsGroup.children, false);
        if (slotHits.length > 0) {
          const targetSlot = slotHits[0].object.userData?.slotIndex as number;
          if (typeof targetSlot === 'number') {
            const entry = blockEntries.find((b) => b.pieceIndex === targetSlot);
            if (entry && sel === targetSlot) {
              sparkManager.triggerBurst(entry.targetSlotPos, '#FACC15');
            }
            stateRef.current.onPlacePiece(sel, targetSlot);
          }
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingBoardSpin) {
        const dx = e.clientX - spinStartX;
        if (Math.abs(dx) > 6) {
          spinMoved = true;
        }
        const maxRad = THREE.MathUtils.degToRad(45);
        interactionRef.current.targetYawRad = THREE.MathUtils.clamp(
          spinStartYaw + dx * 0.008,
          -maxRad,
          maxRad
        );
        return;
      }

      if (draggingPieceIdx === null) return;
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        const entry = blockEntries.find((b) => b.pieceIndex === draggingPieceIdx);
        if (entry) {
          entry.mesh.position.x = THREE.MathUtils.clamp(dragPoint.x, -3.3, 3.3);
          entry.mesh.position.y = 0.52;
          entry.mesh.position.z = THREE.MathUtils.clamp(dragPoint.z, -2.2, 2.2);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDraggingBoardSpin) {
        isDraggingBoardSpin = false;
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {
          // Ignora
        }
        if (!spinMoved && clickedCompletedBlockIdx !== null) {
          const entry = blockEntries.find((b) => b.pieceIndex === clickedCompletedBlockIdx);
          if (entry) {
            const worldPos = entry.targetSlotPos.clone().applyMatrix4(puzzleShowcaseGroup.matrixWorld);
            sparkManager.triggerBurst(worldPos, '#FACC15');
          }
          stateRef.current.onInteractCompletedBlock(clickedCompletedBlockIdx);
        } else if (spinMoved) {
          soundEngine.playRobotBipBop('spin');
        }
        clickedCompletedBlockIdx = null;
        return;
      }

      if (draggingPieceIdx === null) return;
      const pIdx = draggingPieceIdx;
      draggingPieceIdx = null;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }

      const entry = blockEntries.find((b) => b.pieceIndex === pIdx);
      if (!entry) return;

      // Encontra o slot mais próximo
      let closestSlot = -1;
      let minDist = 0.95;
      blockEntries.forEach((other) => {
        const d = entry.mesh.position.distanceTo(other.targetSlotPos);
        if (d < minDist) {
          minDist = d;
          closestSlot = other.pieceIndex;
        }
      });

      if (closestSlot !== -1) {
        if (closestSlot === pIdx) {
          sparkManager.triggerBurst(entry.targetSlotPos, '#34D399');
        }
        stateRef.current.onPlacePiece(pIdx, closestSlot);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    let frameId = 0;
    let isUnmounted = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (isUnmounted) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isUnmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isUnmounted) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;
      const inter = interactionRef.current;

      rebuildPuzzle3D();
      updateEnvironment(elapsed);
      sparkManager.update(dt);

      if (inter.triggerBurstRequest) {
        sparkManager.triggerBurst(
          new THREE.Vector3(...inter.triggerBurstRequest.pos),
          inter.triggerBurstRequest.color
        );
        inter.triggerBurstRequest = null;
      }

      inter.waveTimeLeft = Math.max(0, inter.waveTimeLeft - dt);
      inter.lightPulseTimeLeft = Math.max(0, inter.lightPulseTimeLeft - dt);
      inter.clickedBlockBounce = Math.max(0, inter.clickedBlockBounce - dt * 2.5);
      inter.currentYawRad = THREE.MathUtils.damp(
        inter.currentYawRad,
        inter.targetYawRad,
        8,
        dt
      );

      // Enquadramento de Câmera: Quando concluído (`showCelebration`), posiciona o Quadro 3D na COLUNA ESQUERDA
      // e inclina suavemente o quadro como um cavalete de exposição para o aluno ver e interagir!
      const isWideViewport = (container?.clientWidth || window.innerWidth) >= 768;
      const targetCamPos =
        st.showCelebration && isWideViewport
          ? new THREE.Vector3(1.15, 3.65, 4.15)
          : st.showCelebration
          ? new THREE.Vector3(0, 4.0, 4.45)
          : new THREE.Vector3(0, 5.2, 4.9);

      const targetLookAt =
        st.showCelebration && isWideViewport
          ? new THREE.Vector3(1.15, 0.35, 0.1)
          : st.showCelebration
          ? new THREE.Vector3(0, 0.25, 0.15)
          : new THREE.Vector3(0, 0, 0.25);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 5, dt);

      currentLookAt.x = THREE.MathUtils.damp(currentLookAt.x, targetLookAt.x, 5, dt);
      currentLookAt.y = THREE.MathUtils.damp(currentLookAt.y, targetLookAt.y, 5, dt);
      currentLookAt.z = THREE.MathUtils.damp(currentLookAt.z, targetLookAt.z, 5, dt);
      camera.lookAt(currentLookAt);

      // Ergue e inclina levemente o quadro completo na celebração para destacar o relevo 3D!
      const targetTiltX = st.showCelebration ? 0.36 : 0;
      const targetLiftY = st.showCelebration ? 0.42 : 0;
      const targetYaw = st.showCelebration ? inter.currentYawRad : 0;

      puzzleShowcaseGroup.position.y = THREE.MathUtils.damp(
        puzzleShowcaseGroup.position.y,
        targetLiftY,
        6,
        dt
      );
      puzzleShowcaseGroup.rotation.x = THREE.MathUtils.damp(
        puzzleShowcaseGroup.rotation.x,
        targetTiltX,
        6,
        dt
      );
      puzzleShowcaseGroup.rotation.y = THREE.MathUtils.damp(
        puzzleShowcaseGroup.rotation.y,
        targetYaw,
        8,
        dt
      );

      // Luzes mágicas da moldura 3D
      const activeLightColor = PUZZLE_LIGHT_COLORS[st.lightColorIdx] || PUZZLE_LIGHT_COLORS[0];
      const isGlowing = st.lightsActive || inter.lightPulseTimeLeft > 0;
      puzzleMagicLight.color.setHex(activeLightColor.num);
      puzzleMagicLight.intensity = THREE.MathUtils.damp(
        puzzleMagicLight.intensity,
        isGlowing ? 2.6 + Math.sin(elapsed * 12) * 0.9 : 0,
        8,
        dt
      );
      frameGlowRimMat.color.set(activeLightColor.hex);
      frameGlowRimMat.emissive.set(activeLightColor.hex);
      frameGlowRimMat.emissiveIntensity = isGlowing
        ? 0.95 + Math.sin(elapsed * 8) * 0.35
        : 0.35;

      blockEntries.forEach((entry) => {
        const tState = st.tiles.find((t) => t.pieceIndex === entry.pieceIndex);
        if (!tState) return;

        const isPlaced = tState.currentSlot !== null || st.showCelebration;
        const isSelected = st.selectedPiece === entry.pieceIndex;
        const isHint = st.hintPiece === entry.pieceIndex;

        // Durante os 3 segundos iniciais ou quando encaixado, os blocos ficam no quadro!
        if (st.previewSeconds > 0 || isPlaced) {
          // Onda 3D diagonal quando o aluno interage com o quadro completo!
          let waveOffsetY = 0;
          if (inter.waveTimeLeft > 0) {
            const phase = elapsed * 9 - (entry.col + entry.row) * 0.85;
            waveOffsetY += Math.max(0, Math.sin(phase)) * 0.24;
          }
          if (
            inter.clickedBlockIdx === entry.pieceIndex &&
            inter.clickedBlockBounce > 0
          ) {
            waveOffsetY += Math.sin(inter.clickedBlockBounce * Math.PI) * 0.32;
          }

          entry.mesh.position.x = THREE.MathUtils.damp(
            entry.mesh.position.x,
            entry.targetSlotPos.x,
            10,
            dt
          );
          entry.mesh.position.y = THREE.MathUtils.damp(
            entry.mesh.position.y,
            entry.targetSlotPos.y + waveOffsetY,
            12,
            dt
          );
          entry.mesh.position.z = THREE.MathUtils.damp(
            entry.mesh.position.z,
            entry.targetSlotPos.z,
            10,
            dt
          );
          entry.mesh.rotation.y = THREE.MathUtils.damp(entry.mesh.rotation.y, 0, 8, dt);
        } else if (draggingPieceIdx !== entry.pieceIndex) {
          const liftY = isSelected || isHint ? 0.35 + Math.sin(elapsed * 6) * 0.08 : 0;
          entry.mesh.position.x = THREE.MathUtils.damp(
            entry.mesh.position.x,
            entry.trayPos.x,
            7,
            dt
          );
          entry.mesh.position.y = THREE.MathUtils.damp(
            entry.mesh.position.y,
            entry.trayPos.y + liftY,
            7,
            dt
          );
          entry.mesh.position.z = THREE.MathUtils.damp(
            entry.mesh.position.z,
            entry.trayPos.z,
            7,
            dt
          );
          const targetRot = -THREE.MathUtils.degToRad(tState.rotation);
          entry.mesh.rotation.y = THREE.MathUtils.damp(entry.mesh.rotation.y, targetRot, 9, dt);
        }

        // Destaca o slot no quadro quando é dica ou selecionado
        const slotMat = entry.slotMesh.material as THREE.MeshStandardMaterial;
        if (isHint || isSelected) {
          slotMat.color.set('#FACC15');
        } else {
          slotMat.color.set(st.level === 3 ? '#94A3B8' : '#1E293B');
        }
      });

      // Atualiza Seta Guia Dourada 3D durante o jogo
      const focusIdx =
        st.selectedPiece !== null
          ? st.selectedPiece
          : st.hintPiece !== null
          ? st.hintPiece
          : st.tiles.find((t) => t.currentSlot === null)?.pieceIndex ?? null;

      if (!st.showCelebration && st.previewSeconds <= 0 && focusIdx !== null) {
        const entry = blockEntries.find((b) => b.pieceIndex === focusIdx);
        if (entry) {
          if (st.selectedPiece === focusIdx) {
            pointer3D.update(
              elapsed,
              new THREE.Vector3(entry.targetSlotPos.x, 0.32, entry.targetSlotPos.z),
              true,
              0x38bdf8
            );
          } else {
            pointer3D.update(
              elapsed,
              new THREE.Vector3(entry.trayPos.x, 0.42, entry.trayPos.z),
              true,
              0xfacc15
            );
          }
        } else {
          pointer3D.update(elapsed, null, false);
        }
      } else {
        pointer3D.update(elapsed, null, false);
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      pointer3D.dispose();
      renderer.dispose();
    };
  }, []);

  const handleHint = () => {
    onRecordHint();
    soundEngine.playTap();
    const nextUnplaced = tiles.find((t) => t.currentSlot === null);
    if (!nextUnplaced) return;
    setSelectedPiece(nextUnplaced.pieceIndex);
    setHintPiece(nextUnplaced.pieceIndex);
    if (nextUnplaced.rotation !== 0) {
      soundEngine.speak('Dica do Bit: Toque no botão Girar Bloco e depois encaixe no espaço dourado!');
    } else {
      soundEngine.speak('Dica do Bit: Arraste o bloco flutuante até o espaço dourado no centro da mesa!');
    }
  };

  const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 100) / 20}%`,
    delay: `${(i % 6) * 0.15}s`,
    color: ['#FBBF24', '#38BDF8', '#34D399', '#F472B6', '#A78BFA'][i % 5],
  }));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* PALCO 3D EM TELA CHEIA */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* BARRA SUPERIOR FLUTUANTE */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onBackHub();
            }}
            className="hc-button min-h-[48px] px-4 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm flex items-center gap-2 shadow-xl"
          >
            <Home className="w-5 h-5 text-sky-400" />
            <span>Salão 3D</span>
          </button>

          <div className="hc-surface rounded-2xl bg-slate-900/95 border border-slate-700 px-4 py-2 shadow-xl flex items-center gap-2">
            <span className="font-bold font-display text-base text-white">
              Quebra-Cabeça 3D
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="text-xs text-pink-400 font-semibold">Decomposição + Abstração</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {([1, 2, 3] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setLevel(lvl);
              }}
              className={`hc-button min-h-[48px] px-4 rounded-2xl font-bold text-xs shadow-xl ${
                level === lvl
                  ? 'bg-pink-500 text-slate-950 border-2 border-white'
                  : 'bg-slate-900/95 border border-slate-700 text-slate-200'
              }`}
            >
              Fase {lvl} {starsEarned[lvl - 1] ? '⭐' : ''}
            </button>
          ))}

          {!showCelebration && (
            <>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  setPreviewSeconds(3);
                  soundEngine.speak('Olhe o quadro 3D montado por três segundos!');
                }}
                className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-indigo-500/95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xl"
              >
                <Eye className="w-5 h-5" />
                <span>Olhar (3s)</span>
              </button>

              <button
                type="button"
                onClick={handleHint}
                className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-amber-500/95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xl"
              >
                <HelpCircle className="w-5 h-5" />
                <span>Dica</span>
              </button>
            </>
          )}

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
      </div>

      {/* AVISO DE MEMORIZAÇÃO 3 SEGUNDOS */}
      {previewSeconds > 0 && !showCelebration && (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center z-10">
          <div className="rounded-2xl bg-slate-900/95 border-2 border-amber-400 px-6 py-2.5 text-amber-300 font-bold text-base shadow-2xl tabular-nums animate-guide-glow">
            Memorize o Quadro 3D! Voando os blocos em {previewSeconds}...
          </div>
        </div>
      )}

      {/* DOCK INFERIOR FLUTUANTE ARRASTÁVEL E MINIMIZÁVEL (Durante a montagem) */}
      {!showCelebration && (
        <DraggableMinimizableDock
          title={`Controles do Quebra-Cabeça 3D (${tiles.filter((t) => t.currentSlot !== null).length}/${tiles.length} encaixados)`}
          minimizedLabel="Mostrar Controles do Quebra-Cabeça"
          maxWidthClass="max-w-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(
                [
                  { id: 'rocket', label: '🚀 Foguete' },
                  { id: 'cake', label: '🎂 Bolo' },
                  { id: 'flower', label: '🌻 Flor' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setTheme(t.id);
                  }}
                  className={`min-h-[46px] px-3.5 rounded-2xl text-xs font-bold border ${
                    theme === t.id
                      ? 'bg-pink-500/25 border-pink-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {level === 2 && selectedPiece !== null && (
                <button
                  type="button"
                  onClick={() => rotatePiece(selectedPiece)}
                  className="hc-button min-h-[46px] px-4 rounded-2xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg animate-guide-glow"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Girar Bloco 90°</span>
                </button>
              )}

              {selectedPiece !== null && (
                <button
                  type="button"
                  onClick={() => handlePlaceInSlot(selectedPiece, selectedPiece)}
                  className="hc-button min-h-[46px] px-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <span>Encaixar Bloco Selecionado</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  soundEngine.speak(
                    'Arraste os blocos de madeira 3D das laterais da mesa até o quadro dourado no centro!'
                  )
                }
                className="hc-button min-h-[46px] px-3.5 rounded-2xl bg-slate-800 text-sky-300 font-bold text-xs flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>Instrução</span>
              </button>
            </div>
          </div>
        </DraggableMinimizableDock>
      )}

      {/* =====================================================================
          CELEBRAÇÃO EM DUAS COLUNAS (QUADRO 3D COMPLETO INTERATIVO À ESQUERDA + BOX DE PARABÉNS À DIREITA)
          Sem fundo escuro cobrindo o resultado! O aluno vê e interage com o Quebra-Cabeça 3D pronto!
         ===================================================================== */}
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col md:flex-row items-center justify-between p-4 md:px-8 lg:px-14 pt-20 pb-6 gap-4">
          {/* Confete festivo */}
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

          {/* COLUNA 1 (ESQUERDA): Exposição Interativa do Quebra-Cabeça 3D Pronto */}
          <div className="w-full md:w-7/12 h-full flex flex-col justify-between items-center py-2">
            {/* Banner de Feedback Interativo no Topo da Coluna do Quadro 3D */}
            <div className="pointer-events-auto hc-surface rounded-2xl bg-slate-900/95 border-2 border-pink-400 px-4 py-2 shadow-2xl flex items-center gap-2.5 animate-guide-glow">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs md:text-sm font-extrabold text-white">
                {puzzleFeedbackText}
              </span>
            </div>

            {/* Área central livre para clicar nos blocos 3D do quadro ou arrastar para girar */}
            <div className="flex-1" />

            {/* Barra de Controles para Interagir com o Quadro 3D Completo */}
            <div className="pointer-events-auto hc-surface w-full max-w-xl rounded-3xl bg-slate-900/95 border-2 border-slate-700 p-3 shadow-2xl flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={triggerPuzzleLights}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Lightbulb className="w-5 h-5" />
                <span>Acender Moldura & Brilho!</span>
              </button>

              <button
                type="button"
                onClick={() => triggerPuzzleWave(-1)}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-pink-400 hover:bg-pink-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Waves className="w-5 h-5" />
                <span>Onda de Blocos 3D!</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => rotatePuzzleLimited(-15)}
                  disabled={boardYawDeg <= -45}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar quadro um pouquinho para a esquerda"
                >
                  <RotateCcw className="w-4 h-4 text-pink-400" />
                  <span>Girar Esq.</span>
                </button>

                <span className="text-[11px] font-mono text-amber-300 px-1.5 tabular-nums">
                  {boardYawDeg > 0 ? `+${boardYawDeg}°` : `${boardYawDeg}°`}
                </span>

                <button
                  type="button"
                  onClick={() => rotatePuzzleLimited(15)}
                  disabled={boardYawDeg >= 45}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar quadro um pouquinho para a direita"
                >
                  <span>Girar Dir.</span>
                  <RotateCw className="w-4 h-4 text-pink-400" />
                </button>
              </div>
            </div>
          </div>

          {/* COLUNA 2 (DIREITA): Card de Parabéns! Estrela Ganha! */}
          <div className="pointer-events-auto hc-surface w-full md:w-5/12 max-w-md rounded-3xl bg-slate-900/95 border-2 border-amber-400/80 p-6 md:p-7 text-center shadow-2xl">
            <div className="mx-auto mb-3 w-20 h-20 rounded-full bg-amber-400/20 flex items-center justify-center animate-gentle-bounce">
              <Star className="w-12 h-12 text-amber-400 fill-amber-400" />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-amber-300 text-sm font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Fase {level} Concluída!</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">
              Parabéns! Estrela Ganha!
            </h3>

            <p className="text-sm md:text-base text-slate-200 mb-4">
              “Incrível! Você encaixou todos os blocos esculpidos em 3D e completou a obra de arte! Veja e interaja com seu quadro ao lado!”
            </p>

            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 mb-5 text-left text-xs text-slate-300 space-y-1">
              <div className="font-bold text-pink-300 flex items-center gap-1.5">
                <span>🧩</span>
                <span>Experimente no Quadro 3D ao lado:</span>
              </div>
              <p>• Toque em qualquer <strong>bloco de madeira 3D</strong> para disparar uma onda em relevo;</p>
              <p>• Clique em <strong>Acender Moldura</strong> para mudar as luzes mágicas;</p>
              <p>• Arraste levemente para os lados para <strong>girar um pouquinho (`±45°`)</strong>.</p>
            </div>

            <div className="flex flex-col gap-3">
              {level < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap();
                    setLevel((level + 1) as 1 | 2 | 3);
                    setShowCelebration(false);
                  }}
                  className="hc-button w-full min-h-[54px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 whitespace-nowrap shadow-lg"
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
                    startNewPuzzle(level, theme);
                  }}
                  className="hc-button min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
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
                  className="hc-button min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIntro && (
        <GameIntroModal
          title="Quebra-Cabeça 3D"
          pilarLabel="Decomposição e Abstração"
          bnccCode="EI03CO01"
          spokenIntro="Olhe bem os blocos 3D montados na mesa de mármore! Quando eles se espalharem, arraste cada bloco de volta ao quadro dourado!"
          currentLevel={level}
          starsEarned={starsEarned}
          avatarConfig={avatarConfig}
          isSpeaking={isSpeaking}
          onSelectLevel={(lvl) => setLevel(lvl)}
          onStartPlay={() => setShowIntro(false)}
        />
      )}
    </div>
  );
};
