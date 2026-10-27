import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Volume2,
  HelpCircle,
  Home,
  RotateCw,
  RotateCcw,
  Sparkles,
  Accessibility,
  GraduationCap,
  Settings,
  Star,
  ArrowRight,
  Lightbulb,
  Waves,
} from 'lucide-react';
import { CustomAvatarConfig, AppSettings } from '../utils/storage';
import { GameIntroModal } from '../components/GameIntroModal';
import { DraggableMinimizableDock } from '../components/DraggableMinimizableDock';
import { soundEngine } from '../utils/soundAndSpeech';
import {
  detectSoftwareGl,
  buildStudioWorkshopEnvironment,
  create3DPointerIndicator,
  SparkBurstManager,
} from '../utils/threeEnvironment';

interface Game4Props {
  starsEarned: [boolean, boolean, boolean];
  avatarConfig: CustomAvatarConfig;
  isSpeaking: boolean;
  settings?: AppSettings;
  onCompleteLevel: (level: 1 | 2 | 3) => void;
  onRecordAttempt: () => void;
  onRecordHint: () => void;
  onBackHub: () => void;
  onOpenAccessibility?: () => void;
  onOpenTeacher?: () => void;
  onOpenSettings?: () => void;
}

interface RawTangramPieceDef {
  id: string;
  name: string;
  symbol: string;
  color: number;
  cssColor: string;
  /**
   * Vértices exatos no espaço do tabuleiro central (X, Z) — tesselação plana 100% sem sobreposição!
   */
  boardVertices: Array<[number, number]>;
  /** Simetria rotacional em graus (90 para quadrados/losangos, 180 para paralelogramos, 360 para triângulos) */
  symmetryDeg: 90 | 180 | 360;
  /** Posição inicial na bandeja lateral da mesa 3D */
  trayX: number;
  trayZ: number;
  /** Rotação inicial na bandeja no Nível 2 (em graus) */
  level2InitialRotDeg?: number;
}

interface TangramPieceSpec extends RawTangramPieceDef {
  /** Centróide calculado automaticamente a partir de boardVertices */
  targetX: number;
  targetZ: number;
  targetRotDeg: number;
  /** Vértices locais centrados em (0,0) com recuo (inset) para junta de madeira sem sobreposição */
  localVertices: Array<[number, number]>;
}

interface TangramFigureConfig {
  id: 'house' | 'cat' | 'rocket';
  title: string;
  spokenPrompt: string;
  pieces: TangramPieceSpec[];
}

/**
 * Calcula o centróide e aplica um leve recuo interno (inset) em cada vértice
 * para compensar o chanfro (bevel) 3D e criar a junta clássica do Tangram de madeira sem sobreposição.
 */
function buildPieceSpecs(defs: RawTangramPieceDef[], insetAmount = 0.022): TangramPieceSpec[] {
  return defs.map((def) => {
    const n = def.boardVertices.length;
    const cx = def.boardVertices.reduce((acc, [x]) => acc + x, 0) / n;
    const cz = def.boardVertices.reduce((acc, [, z]) => acc + z, 0) / n;

    const localVertices: Array<[number, number]> = def.boardVertices.map(([x, z]) => {
      const dx = x - cx;
      const dz = z - cz;
      const dist = Math.hypot(dx, dz) || 1;
      const shrink = Math.max(0.75, (dist - insetAmount) / dist);
      return [dx * shrink, dz * shrink];
    });

    return {
      ...def,
      targetX: cx,
      targetZ: cz,
      targetRotDeg: 0,
      localVertices,
    };
  });
}

const TANGRAM_FIGURES: Record<1 | 2 | 3, TangramFigureConfig> = {
  1: {
    id: 'house',
    title: 'Casinha de Madeira 3D',
    spokenPrompt:
      'Fase 1: Arraste os blocos de madeira 3D até a silhueta correspondente no centro para montar a Casinha!',
    pieces: buildPieceSpecs([
      {
        id: 'roof_main',
        name: 'Telhado Vermelho',
        symbol: '●',
        color: 0xd91616,
        cssColor: '#DC2626',
        // Triângulo isósceles grande: Z de -1.05 até -0.15, X de -0.90 até +0.90
        boardVertices: [
          [-0.9, -0.15],
          [0.9, -0.15],
          [0.0, -1.05],
        ],
        symmetryDeg: 360,
        trayX: -2.25,
        trayZ: -0.85,
      },
      {
        id: 'chimney',
        name: 'Chaminé Verde Esmeralda',
        symbol: '■',
        color: 0x058240,
        cssColor: '#16A34A',
        // Encaixada exatamente sobre a rampa direita do telhado (Z = X - 1.05), zero sobreposição!
        boardVertices: [
          [0.35, -1.02],
          [0.7, -1.02],
          [0.7, -0.35],
          [0.35, -0.7],
        ],
        symmetryDeg: 360,
        trayX: 2.25,
        trayZ: -0.85,
      },
      {
        id: 'wall_left',
        name: 'Parede Azul Royal',
        symbol: '▲',
        color: 0x0062b8,
        cssColor: '#0284C7',
        // Metade inferior-esquerda do quadrado da parede: X de -0.72 a +0.72, Z de -0.15 a +0.95
        boardVertices: [
          [-0.72, -0.15],
          [-0.72, 0.95],
          [0.72, 0.95],
        ],
        symmetryDeg: 360,
        trayX: -2.25,
        trayZ: 0.48,
      },
      {
        id: 'wall_right',
        name: 'Parede Amarelo Ouro',
        symbol: '★',
        color: 0xe59400,
        cssColor: '#EAB308',
        // Metade superior-direita do quadrado da parede: compartilha a diagonal (-0.72,-0.15)->(0.72,0.95)
        boardVertices: [
          [-0.72, -0.15],
          [0.72, -0.15],
          [0.72, 0.95],
        ],
        symmetryDeg: 360,
        trayX: 2.25,
        trayZ: 0.48,
      },
    ]),
  },
  2: {
    id: 'cat',
    title: 'Gatinho Tangram 3D (7 Peças)',
    spokenPrompt:
      'Fase 2: Monte o Gatinho clássico de 7 peças de madeira! Se uma peça estiver inclinada, gire 45 graus ou arraste até o encaixe dela!',
    pieces: buildPieceSpecs([
      {
        id: 'ear_l',
        name: 'Orelha Esquerda Rosa',
        symbol: '♥',
        color: 0xdb2777,
        cssColor: '#DB2777',
        // Compartilha a aresta superior-esquerda da cabeça losango: (-0.34, -0.68) até (0, -1.02)
        boardVertices: [
          [-0.34, -0.68],
          [0.0, -1.02],
          [-0.34, -1.2],
        ],
        symmetryDeg: 360,
        trayX: -2.35,
        trayZ: -1.05,
        level2InitialRotDeg: 315,
      },
      {
        id: 'ear_r',
        name: 'Orelha Direita Laranja',
        symbol: '◆',
        color: 0xd44206,
        cssColor: '#EA580C',
        // Compartilha a aresta superior-direita da cabeça losango: (0, -1.02) até (0.34, -0.68)
        boardVertices: [
          [0.0, -1.02],
          [0.34, -0.68],
          [0.34, -1.2],
        ],
        symmetryDeg: 360,
        trayX: 2.35,
        trayZ: -1.05,
        level2InitialRotDeg: 0,
      },
      {
        id: 'head_sq',
        name: 'Cabeça Amarelo Ouro',
        symbol: '★',
        color: 0xe59400,
        cssColor: '#EAB308',
        // Quadrado em posição de losango (simetria de 90°): centro em (0, -0.68)
        boardVertices: [
          [0.0, -1.02],
          [0.34, -0.68],
          [0.0, -0.34],
          [-0.34, -0.68],
        ],
        symmetryDeg: 90,
        trayX: -2.35,
        trayZ: -0.3,
        level2InitialRotDeg: 45,
      },
      {
        id: 'chest_tri',
        name: 'Peito Verde Esmeralda',
        symbol: '■',
        color: 0x058240,
        cssColor: '#16A34A',
        // Toca o vértice inferior da cabeça (0, -0.34) e desce até Z = 0.12
        boardVertices: [
          [0.0, -0.34],
          [-0.46, 0.12],
          [0.46, 0.12],
        ],
        symmetryDeg: 360,
        trayX: 2.35,
        trayZ: -0.3,
        level2InitialRotDeg: 0,
      },
      {
        id: 'body_top',
        name: 'Costas Vermelhas',
        symbol: '●',
        color: 0xd91616,
        cssColor: '#DC2626',
        // Compartilha a base do peito Z = 0.12 e desce até Z = 1.00 na esquerda
        boardVertices: [
          [-0.46, 0.12],
          [0.46, 0.12],
          [-0.46, 1.0],
        ],
        symmetryDeg: 360,
        trayX: -2.35,
        trayZ: 0.55,
        level2InitialRotDeg: 315,
      },
      {
        id: 'body_bot',
        name: 'Barriga Azul Royal',
        symbol: '▲',
        color: 0x0062b8,
        cssColor: '#0284C7',
        // Compartilha a diagonal (-0.46, 1.00) -> (0.46, 0.12) com as Costas Vermelhas
        boardVertices: [
          [0.46, 0.12],
          [0.46, 1.0],
          [-0.46, 1.0],
        ],
        symmetryDeg: 360,
        trayX: 2.35,
        trayZ: 0.55,
        level2InitialRotDeg: 0,
      },
      {
        id: 'tail_para',
        name: 'Rabinho Roxo Violeta',
        symbol: '✦',
        color: 0x641ee6,
        cssColor: '#7C3AED',
        // Sai da lateral direita inferior da barriga (X = 0.46, Z de 0.68 a 1.00) para a direita
        boardVertices: [
          [0.46, 0.68],
          [0.98, 0.42],
          [0.98, 0.74],
          [0.46, 1.0],
        ],
        symmetryDeg: 180,
        trayX: 0,
        trayZ: 1.25,
        level2InitialRotDeg: 315,
      },
    ]),
  },
  3: {
    id: 'rocket',
    title: 'Foguete Espacial Tangram 3D',
    spokenPrompt:
      'Fase 3: Monte o Foguete Espacial de 7 blocos de madeira 3D! Encaixe cada forma geométrica no altar dourado!',
    pieces: buildPieceSpecs([
      {
        id: 'nose',
        name: 'Ponta Vermelha',
        symbol: '●',
        color: 0xd91616,
        cssColor: '#DC2626',
        // Triângulo superior: Z de -1.12 a -0.62
        boardVertices: [
          [0.0, -1.12],
          [-0.46, -0.62],
          [0.46, -0.62],
        ],
        symmetryDeg: 360,
        trayX: -2.35,
        trayZ: -1.05,
      },
      {
        id: 'upper_hull',
        name: 'Cabine Amarelo Ouro',
        symbol: '★',
        color: 0xe59400,
        cssColor: '#EAB308',
        // Quadrado central superior: Z de -0.62 a -0.14
        boardVertices: [
          [-0.46, -0.62],
          [0.46, -0.62],
          [0.46, -0.14],
          [-0.46, -0.14],
        ],
        symmetryDeg: 90,
        trayX: 2.35,
        trayZ: -1.05,
      },
      {
        id: 'mid_left',
        name: 'Tanque Azul Royal',
        symbol: '▲',
        color: 0x0062b8,
        cssColor: '#0284C7',
        // Triângulo grande superior-esquerdo do tanque: Z de -0.14 a +0.64
        boardVertices: [
          [-0.46, -0.14],
          [0.46, -0.14],
          [-0.46, 0.64],
        ],
        symmetryDeg: 360,
        trayX: -2.35,
        trayZ: -0.25,
      },
      {
        id: 'mid_right',
        name: 'Tanque Verde Esmeralda',
        symbol: '■',
        color: 0x058240,
        cssColor: '#16A34A',
        // Triângulo grande inferior-direito do tanque: Z de -0.14 a +0.64
        boardVertices: [
          [0.46, -0.14],
          [0.46, 0.64],
          [-0.46, 0.64],
        ],
        symmetryDeg: 360,
        trayX: 2.35,
        trayZ: -0.25,
      },
      {
        id: 'fin_left',
        name: 'Asa Esquerda Rosa',
        symbol: '♥',
        color: 0xdb2777,
        cssColor: '#DB2777',
        // Encaixada na lateral esquerda externa (X de -0.46 a -0.92, Z de 0.14 a 0.64)
        boardVertices: [
          [-0.46, 0.14],
          [-0.46, 0.64],
          [-0.92, 0.64],
        ],
        symmetryDeg: 360,
        trayX: -2.35,
        trayZ: 0.55,
      },
      {
        id: 'fin_right',
        name: 'Asa Direita Laranja',
        symbol: '◆',
        color: 0xd44206,
        cssColor: '#EA580C',
        // Encaixada na lateral direita externa (X de +0.46 a +0.92, Z de 0.14 a 0.64)
        boardVertices: [
          [0.46, 0.14],
          [0.92, 0.64],
          [0.46, 0.64],
        ],
        symmetryDeg: 360,
        trayX: 2.35,
        trayZ: 0.55,
      },
      {
        id: 'thruster',
        name: 'Propulsor Roxo',
        symbol: '✦',
        color: 0x641ee6,
        cssColor: '#7C3AED',
        // Base propulsora abaixo de Z = 0.64 (Z de 0.64 a 1.02)
        boardVertices: [
          [-0.3, 0.64],
          [0.3, 0.64],
          [0.46, 1.02],
          [-0.46, 1.02],
        ],
        symmetryDeg: 360,
        trayX: 0,
        trayZ: 1.25,
      },
    ]),
  },
};

function isRotationAligned(currentDeg: number, targetDeg: number, symmetryDeg: 90 | 180 | 360): boolean {
  const diff = (((currentDeg - targetDeg) % symmetryDeg) + symmetryDeg) % symmetryDeg;
  return diff < 5 || Math.abs(diff - symmetryDeg) < 5;
}

function createExtrudedTangramMesh(
  spec: TangramPieceSpec,
  isSilhouette = false
): THREE.Mesh {
  const shape = new THREE.Shape();
  spec.localVertices.forEach(([vx, vz], idx) => {
    if (idx === 0) shape.moveTo(vx, -vz);
    else shape.lineTo(vx, -vz);
  });
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: isSilhouette ? 0.025 : 0.17,
    bevelEnabled: !isSilhouette,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.018,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);

  const mat = isSilhouette
    ? new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.36,
      })
    : new THREE.MeshPhysicalMaterial({
        color: spec.color,
        roughness: 0.24,
        metalness: 0.05,
        clearcoat: 0.82,
        clearcoatRoughness: 0.14,
      });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !isSilhouette;
  mesh.receiveShadow = true;

  // Contorno nítido de madeira/ouro tanto na peça quanto no berço da silhueta para separar visualmente cada forma
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: isSilhouette ? 0xfde047 : 0xfef9c3,
      transparent: true,
      opacity: isSilhouette ? 0.65 : 0.75,
    })
  );
  mesh.add(line);

  return mesh;
}

export const Game4TangramBit: React.FC<Game4Props> = ({
  starsEarned,
  avatarConfig,
  isSpeaking,
  settings,
  onCompleteLevel,
  onRecordAttempt,
  onRecordHint,
  onBackHub,
  onOpenAccessibility,
  onOpenTeacher,
  onOpenSettings,
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [pieceRotations, setPieceRotations] = useState<Record<string, number>>({});
  const [hintPieceId, setHintPieceId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Estados de Interação com o Tangram 3D Pronto (Coluna Esquerda na Celebração)
  const [tangramYawDeg, setTangramYawDeg] = useState(0);
  const [tangramLightsActive, setTangramLightsActive] = useState(false);
  const [tangramFeedbackText, setTangramFeedbackText] = useState(
    'Toque nos blocos de madeira do seu Tangram 3D para fazer ondas, iluminar ou girar!'
  );

  const showCelebrationRef = useRef(false);
  showCelebrationRef.current = showCelebration;

  const interactionRef = useRef({
    waveTimeLeft: 0,
    lightPulseTimeLeft: 0,
    targetYawRad: 0,
    currentYawRad: 0,
  });

  const triggerTangramLights = () => {
    setTangramLightsActive((v) => !v);
    interactionRef.current.lightPulseTimeLeft = 2.6;
    interactionRef.current.waveTimeLeft = 1.6;
    sparksRef.current?.triggerBurst(new THREE.Vector3(0, 0.55, 0), '#FACC15');
    soundEngine.playPaintBrushSplash();
    setTangramFeedbackText('✨ Altar Dourado iluminado! Veja os blocos de madeira 3D brilhando!');
  };

  const triggerTangramWave = () => {
    interactionRef.current.waveTimeLeft = 2.4;
    sparksRef.current?.triggerBurst(new THREE.Vector3(0, 0.45, 0), '#34D399');
    soundEngine.playWoodBlockSnap();
    setTangramFeedbackText('🌊 Clack-Clack! Onda 3D passando pelos blocos de madeira do Tangram!');
  };

  const rotateTangramLimited = (deltaDeg: number) => {
    soundEngine.playRobotBipBop('spin');
    setTangramYawDeg((prev) => {
      const clamped = Math.max(-45, Math.min(45, prev + deltaDeg));
      interactionRef.current.targetYawRad = THREE.MathUtils.degToRad(clamped);
      return clamped;
    });
    setTangramFeedbackText('🔄 Girando o altar 3D para você ver o relevo das peças de madeira!');
  };

  const mountRef = useRef<HTMLDivElement | null>(null);
  const pieceMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const silhouetteMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const sparksRef = useRef<SparkBurstManager | null>(null);

  const placedIdsRef = useRef<string[]>([]);
  placedIdsRef.current = placedIds;
  const pieceRotationsRef = useRef<Record<string, number>>({});
  pieceRotationsRef.current = pieceRotations;
  const selectedPieceIdRef = useRef<string | null>(null);
  selectedPieceIdRef.current = selectedPieceId;
  const hintPieceIdRef = useRef<string | null>(null);
  hintPieceIdRef.current = hintPieceId;

  const figConfig = TANGRAM_FIGURES[level];
  const activeSelectedSpec = figConfig.pieces.find((p) => p.id === selectedPieceId);

  const initLevelState = (lvl: 1 | 2 | 3) => {
    const cfg = TANGRAM_FIGURES[lvl];
    const initialRots: Record<string, number> = {};
    cfg.pieces.forEach((p) => {
      if (lvl === 2 && p.level2InitialRotDeg !== undefined) {
        initialRots[p.id] = p.level2InitialRotDeg;
      } else {
        initialRots[p.id] = 0;
      }
    });
    setPlacedIds([]);
    setPieceRotations(initialRots);
    setSelectedPieceId(cfg.pieces[0]?.id || null);
    setHintPieceId(null);
    setShowCelebration(false);
    setTangramYawDeg(0);
    setTangramLightsActive(false);
    interactionRef.current.targetYawRad = 0;
    interactionRef.current.currentYawRad = 0;
    interactionRef.current.waveTimeLeft = 0;
  };

  useEffect(() => {
    if (showIntro) return;
    initLevelState(level);
    soundEngine.speak(TANGRAM_FIGURES[level].spokenPrompt);
  }, [level, showIntro]);

  const snapPieceToBoard = (piece: TangramPieceSpec, draggedDirectlyToSlot = false) => {
    if (placedIdsRef.current.includes(piece.id)) return;
    onRecordAttempt();

    const currentRot = ((pieceRotationsRef.current[piece.id] || 0) % 360 + 360) % 360;
    const aligned = isRotationAligned(currentRot, piece.targetRotDeg, piece.symmetryDeg);

    // Se a criança arrastou a peça diretamente para cima do encaixe correto no tabuleiro,
    // ou se já está alinhada (considerando a simetria de 90° do quadrado!), encaixa suavemente!
    if (level === 2 && !aligned && !draggedDirectlyToSlot) {
      soundEngine.playGentleHint();
      setSelectedPieceId(piece.id);
      soundEngine.speak(
        `A peça ${piece.name} está girada! Toque no botão amarelo Girar 45 graus ou arraste ela direto para o molde no centro!`
      );
      return;
    }

    // Garante que a rotação final fique alinhada no encaixe 3D
    setPieceRotations((prev) => ({ ...prev, [piece.id]: piece.targetRotDeg }));

    soundEngine.playWoodBlockSnap();
    sparksRef.current?.triggerBurst(
      new THREE.Vector3(piece.targetX, 0.25, piece.targetZ),
      piece.cssColor
    );

    const nextPlaced = [...placedIdsRef.current, piece.id];
    setPlacedIds(nextPlaced);
    setHintPieceId(null);

    const remaining = figConfig.pieces.find((p) => !nextPlaced.includes(p.id));
    setSelectedPieceId(remaining ? remaining.id : null);

    if (nextPlaced.length === figConfig.pieces.length) {
      setTimeout(() => {
        soundEngine.playVictoryFanfare();
        onCompleteLevel(level);
        setShowCelebration(true);
        setTangramLightsActive(true);
        interactionRef.current.waveTimeLeft = 2.6;
        interactionRef.current.lightPulseTimeLeft = 2.6;
        soundEngine.speak(
          `Incrível! Você montou ${figConfig.title} com todas as formas geométricas 3D perfeitamente encaixadas!`
        );
      }, 650);
    } else {
      soundEngine.speak(`Perfeito! ${piece.name} encaixada no lugar exato!`);
    }
  };

  const rotatePiece45 = (pieceId: string) => {
    if (placedIds.includes(pieceId)) return;
    soundEngine.playTap();
    setPieceRotations((prev) => {
      const nextDeg = ((prev[pieceId] || 0) + 45) % 360;
      return { ...prev, [pieceId]: nextDeg };
    });
    const mesh = pieceMeshesRef.current.get(pieceId);
    if (mesh) {
      mesh.position.y = 0.52;
    }
  };

  const snapPieceRef = useRef(snapPieceToBoard);
  snapPieceRef.current = snapPieceToBoard;

  // Cena Three.js em tela cheia
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 5.3, 5.1);
    camera.lookAt(0, -0.05, 0.15);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const env = buildStudioWorkshopEnvironment(scene, renderer, isSoftwareGl);
    const sparks = new SparkBurstManager(scene);
    sparksRef.current = sparks;
    const pointerIndicator3D = create3DPointerIndicator(scene);

    // Bandeja central dourada de encaixe do Tangram
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const trayFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 2.8),
      new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        roughness: 0.25,
        metalness: 0.35,
        clearcoat: 0.75,
      })
    );
    trayFrame.position.set(0, 0.03, -0.1);
    trayFrame.receiveShadow = true;
    boardGroup.add(trayFrame);

    const goldRim = new THREE.Mesh(
      new THREE.BoxGeometry(2.74, 0.06, 2.94),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.22,
        metalness: 0.85,
      })
    );
    goldRim.position.set(0, 0.01, -0.1);
    boardGroup.add(goldRim);

    pieceMeshesRef.current.clear();
    silhouetteMeshesRef.current.clear();

    const cfg = TANGRAM_FIGURES[level];
    cfg.pieces.forEach((spec) => {
      const silMesh = createExtrudedTangramMesh(spec, true);
      silMesh.position.set(spec.targetX, 0.075, spec.targetZ);
      silMesh.rotation.y = THREE.MathUtils.degToRad(spec.targetRotDeg);
      silMesh.userData = { silhouetteId: spec.id };
      boardGroup.add(silMesh);
      silhouetteMeshesRef.current.set(spec.id, silMesh);

      const pieceMesh = createExtrudedTangramMesh(spec, false);
      pieceMesh.position.set(spec.trayX, 0.12, spec.trayZ);
      pieceMesh.userData = { pieceId: spec.id };
      boardGroup.add(pieceMesh);
      pieceMeshesRef.current.set(spec.id, pieceMesh);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.35);
    const intersectPt = new THREE.Vector3();

    let draggingId: string | null = null;
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointer(e);
      pointerDownPos = { x: e.clientX, y: e.clientY };
      raycaster.setFromCamera(pointer, camera);

      const meshes = Array.from(pieceMeshesRef.current.values());
      const hits = raycaster.intersectObjects(meshes, true);

      if (hits.length > 0) {
        if (showCelebrationRef.current) {
          sparks.triggerBurst(hits[0].point, '#FACC15');
          interactionRef.current.waveTimeLeft = 2.2;
          soundEngine.playWoodBlockSnap();
          return;
        }
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.pieceId) {
          obj = obj.parent;
        }
        const pid = obj?.userData?.pieceId as string | undefined;
        if (pid && !placedIdsRef.current.includes(pid)) {
          draggingId = pid;
          setSelectedPieceId(pid);
          soundEngine.playTap();
          renderer.domElement.style.cursor = 'grabbing';
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);

      if (draggingId) {
        const mesh = pieceMeshesRef.current.get(draggingId);
        if (mesh && raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
          mesh.position.x = THREE.MathUtils.clamp(intersectPt.x, -3.0, 3.0);
          mesh.position.z = THREE.MathUtils.clamp(intersectPt.z, -1.7, 1.7);
          mesh.position.y = 0.42;
        }
        return;
      }

      const meshes = Array.from(pieceMeshesRef.current.values());
      const hits = raycaster.intersectObjects(meshes, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!draggingId) return;
      const pid = draggingId;
      draggingId = null;
      renderer.domElement.style.cursor = 'default';

      const spec = cfg.pieces.find((p) => p.id === pid);
      const mesh = pieceMeshesRef.current.get(pid);
      if (!spec || !mesh) return;

      const distMoved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const distToTarget = Math.hypot(
        mesh.position.x - spec.targetX,
        mesh.position.z - spec.targetZ
      );

      const snapTolerance = settings?.motorAssist ? 1.45 : 1.05;
      if (distToTarget < snapTolerance && distMoved >= 12) {
        snapPieceRef.current(spec, true);
      } else if (distMoved < 12) {
        snapPieceRef.current(spec, false);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let frameId = 0;
    let isUnmounted = false;
    const clock = new THREE.Clock();
    const _indicatorPos = new THREE.Vector3();
    const currentLookAt = new THREE.Vector3(0, -0.05, 0.15);

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
      const isCeleb = showCelebrationRef.current;
      const inter = interactionRef.current;

      env.updateEnvironment(elapsed);
      sparks.update(dt);

      inter.waveTimeLeft = Math.max(0, inter.waveTimeLeft - dt);
      inter.lightPulseTimeLeft = Math.max(0, inter.lightPulseTimeLeft - dt);
      inter.currentYawRad = THREE.MathUtils.damp(
        inter.currentYawRad,
        inter.targetYawRad,
        8,
        dt
      );

      // Enquadramento de Câmera: Quando conclui (`isCeleb`), enquadra o Tangram 3D na COLUNA ESQUERDA!
      const isWideViewport = (container?.clientWidth || window.innerWidth) >= 768;
      const targetCamPos =
        isCeleb && isWideViewport
          ? new THREE.Vector3(1.12, 4.15, 4.35)
          : isCeleb
          ? new THREE.Vector3(0, 4.45, 4.65)
          : new THREE.Vector3(0, 5.3, 5.1);

      const targetLookAt =
        isCeleb && isWideViewport
          ? new THREE.Vector3(1.12, 0.15, 0.0)
          : isCeleb
          ? new THREE.Vector3(0, 0.1, 0.0)
          : new THREE.Vector3(0, -0.05, 0.15);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 5, dt);

      currentLookAt.x = THREE.MathUtils.damp(currentLookAt.x, targetLookAt.x, 5, dt);
      currentLookAt.y = THREE.MathUtils.damp(currentLookAt.y, targetLookAt.y, 5, dt);
      currentLookAt.z = THREE.MathUtils.damp(currentLookAt.z, targetLookAt.z, 5, dt);
      camera.lookAt(currentLookAt);

      // Ergue e inclina levemente o altar do Tangram na celebração como um troféu 3D!
      boardGroup.position.y = THREE.MathUtils.damp(
        boardGroup.position.y,
        isCeleb ? 0.35 : 0,
        6,
        dt
      );
      boardGroup.rotation.x = THREE.MathUtils.damp(
        boardGroup.rotation.x,
        isCeleb ? 0.34 : 0,
        6,
        dt
      );
      boardGroup.rotation.y = THREE.MathUtils.damp(
        boardGroup.rotation.y,
        isCeleb ? inter.currentYawRad : 0,
        8,
        dt
      );

      const activeId = hintPieceIdRef.current || selectedPieceIdRef.current;
      let indicatorTargetSpec: TangramPieceSpec | null = null;

      cfg.pieces.forEach((spec, idx) => {
        const mesh = pieceMeshesRef.current.get(spec.id);
        const sil = silhouetteMeshesRef.current.get(spec.id);
        if (!mesh) return;

        const isPlaced = placedIdsRef.current.includes(spec.id) || isCeleb;
        const isSelected = activeId === spec.id && !isPlaced;

        if (isSelected) {
          indicatorTargetSpec = spec;
        }

        if (sil) {
          const silMat = sil.material as THREE.MeshStandardMaterial;
          silMat.opacity = isPlaced
            ? 0.0
            : isSelected
            ? 0.65 + Math.sin(elapsed * 7) * 0.25
            : 0.34;
          sil.visible = !isPlaced;
        }

        if (draggingId === spec.id) return;

        const waveY =
          isCeleb && inter.waveTimeLeft > 0
            ? Math.max(0, Math.sin(elapsed * 9 - idx * 0.7)) * 0.22
            : 0;

        const targetX = isPlaced ? spec.targetX : spec.trayX;
        const targetZ = isPlaced ? spec.targetZ : spec.trayZ;
        const targetY = isPlaced
          ? 0.08 + waveY
          : isSelected
          ? 0.28 + Math.sin(elapsed * 5.5) * 0.05
          : 0.11;

        mesh.position.x = THREE.MathUtils.damp(mesh.position.x, targetX, 10, dt);
        mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetY, 10, dt);
        mesh.position.z = THREE.MathUtils.damp(mesh.position.z, targetZ, 10, dt);

        const deg = isPlaced ? spec.targetRotDeg : pieceRotationsRef.current[spec.id] || 0;
        const targetRotY = THREE.MathUtils.degToRad(deg);
        mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, targetRotY, 11, dt);
      });

      if (!isCeleb && indicatorTargetSpec && (settings?.visualGuidePulse ?? true)) {
        const stSpec = indicatorTargetSpec as TangramPieceSpec;
        _indicatorPos.set(stSpec.targetX, 0.32, stSpec.targetZ);
        pointerIndicator3D.update(elapsed, _indicatorPos, stSpec.cssColor, true);
      } else {
        pointerIndicator3D.update(elapsed, null, '#FACC15', false);
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
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      sparks.dispose();
      env.dispose();
      renderer.dispose();
    };
  }, [level]);

  const handleHint = () => {
    onRecordHint();
    const nextPiece = figConfig.pieces.find((p) => !placedIds.includes(p.id));
    if (!nextPiece) return;
    setHintPieceId(nextPiece.id);
    setSelectedPieceId(nextPiece.id);
    // Na dica, já alinha a peça para facilitar para a criança!
    setPieceRotations((prev) => ({ ...prev, [nextPiece.id]: nextPiece.targetRotDeg }));
    soundEngine.playGentleHint();
    soundEngine.speak(
      `Dica do Bit: Eu já alinhei a peça ${nextPiece.name}! Agora arraste ela ou toque nela para encaixar onde a seta dourada 3D aponta!`
    );
  };

  const activeRotDeg = activeSelectedSpec ? pieceRotations[activeSelectedSpec.id] || 0 : 0;
  const isSelectedAligned = activeSelectedSpec
    ? isRotationAligned(activeRotDeg, activeSelectedSpec.targetRotDeg, activeSelectedSpec.symmetryDeg)
    : true;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* Canvas 3D Fullscreen */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Header Flutuante Perimetral */}
      <header className="pointer-events-none fixed top-0 inset-x-0 z-20 p-3 md:px-6 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onBackHub();
            }}
            className="hc-button min-h-[46px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-xs md:text-sm flex items-center gap-2 shadow-xl"
          >
            <Home className="w-5 h-5 text-emerald-400" />
            <span>Salão 3D</span>
          </button>

          <div className="hc-surface px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-xl flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Jogo 4
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <h1 className="text-sm md:text-base font-bold font-display whitespace-nowrap">
              {figConfig.title}
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {([1, 2, 3] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setLevel(lvl);
              }}
              className={`min-h-[42px] px-3.5 rounded-2xl font-bold text-xs transition-all shadow-xl ${
                level === lvl
                  ? 'bg-emerald-500 text-slate-950 border-2 border-white'
                  : 'bg-slate-900/95 border border-slate-700 text-slate-200'
              }`}
            >
              Fase {lvl} {starsEarned[lvl - 1] ? '⭐' : ''}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              soundEngine.speakManual(figConfig.spokenPrompt);
            }}
            className="hc-button min-h-[42px] px-3.5 rounded-2xl bg-slate-900/95 border border-sky-400/60 text-sky-300 font-bold text-xs flex items-center gap-1.5 shadow-xl"
          >
            <Volume2 className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">Ouvir</span>
          </button>

          <button
            type="button"
            onClick={handleHint}
            className="hc-button min-h-[42px] px-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xl"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Dica</span>
          </button>

          {onOpenAccessibility && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onOpenAccessibility();
              }}
              className="hc-button min-h-[42px] px-3 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-sky-400 font-bold text-xs flex items-center gap-1 shadow-xl"
              title="Acessibilidade Inteligente"
            >
              <Accessibility className="w-4 h-4" />
            </button>
          )}

          {onOpenTeacher && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onOpenTeacher();
              }}
              className="hc-button min-h-[42px] px-3 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1 shadow-xl"
              title="Fundamentação Pedagógica BNCC"
            >
              <GraduationCap className="w-4 h-4" />
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap();
                onOpenSettings();
              }}
              className="hc-button min-h-[42px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-slate-600 hover:border-amber-400 text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-xl"
              title="Configurações de Áudio, Narração e Volumes"
              aria-label="Abrir Configurações"
            >
              <Settings className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </header>

      {/* Faixa de Orientação Visual no Topo Central (Oculta na Celebração) */}
      {!showCelebration && activeSelectedSpec && !placedIds.includes(activeSelectedSpec.id) && (
        <div className="pointer-events-none fixed top-16 inset-x-0 z-10 flex justify-center px-3">
          <div className="pointer-events-auto rounded-full bg-slate-900/95 border-2 border-amber-400 px-4 py-1.5 text-xs font-extrabold text-amber-200 flex items-center gap-2 shadow-2xl animate-guide-glow">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            {level === 2 && !isSelectedAligned ? (
              <span>
                Peça da vez:{' '}
                <strong className="text-white">
                  {activeSelectedSpec.name} ({activeSelectedSpec.symbol})
                </strong>{' '}
                — Toque em <strong className="text-amber-300 underline">Girar 45°</strong> ou arraste até a seta dourada!
              </span>
            ) : (
              <span>
                Peça pronta:{' '}
                <strong className="text-white">
                  {activeSelectedSpec.name} ({activeSelectedSpec.symbol})
                </strong>{' '}
                — Arraste até a seta dourada 3D ou toque nela para encaixar!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dock Flutuante Inferior Arrastável e Minimizável (Oculto na Celebração) */}
      {!showCelebration && (
        <DraggableMinimizableDock
          title={`Blocos de Madeira 3D (${placedIds.length}/${figConfig.pieces.length} encaixados)`}
          minimizedLabel="🧩 Abrir Peças do Tangram"
          maxWidthClass="max-w-4xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {figConfig.pieces.map((p) => {
                const isDone = placedIds.includes(p.id);
                const isSel = selectedPieceId === p.id && !isDone;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isDone}
                    onClick={() => {
                      setSelectedPieceId(p.id);
                      snapPieceToBoard(p, false);
                    }}
                    onMouseEnter={() => soundEngine.speakHover(p.name)}
                    style={{ backgroundColor: isDone ? undefined : p.cssColor }}
                    className={`min-h-[42px] px-3 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all border ${
                      isDone
                        ? 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-50'
                        : isSel
                        ? 'border-2 border-white text-white ring-3 ring-amber-300 scale-105 animate-guide-glow'
                        : 'border-white/40 text-white opacity-90 hover:opacity-100'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-950/45 flex items-center justify-center text-xs font-black">
                      {isDone ? '✓' : p.symbol}
                    </span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {level === 2 && selectedPieceId && !placedIds.includes(selectedPieceId) && (
                <button
                  type="button"
                  onClick={() => rotatePiece45(selectedPieceId)}
                  className={`hc-button min-h-[42px] px-3.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md ${
                    !isSelectedAligned
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 animate-guide-glow'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/50'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Girar 45° {!isSelectedAligned ? '(Alinhar!)' : '(Alinhada ✓)'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap();
                  initLevelState(level);
                }}
                className="hc-button min-h-[42px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
                title="Recomeçar Tangram"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            </div>
          </div>
        </DraggableMinimizableDock>
      )}

      {showIntro && (
        <GameIntroModal
          title="Tangram do Bit 3D"
          pilarLabel="Abstração e Geometria Espacial"
          bnccCode="EI03CO01"
          spokenIntro="Bem-vindo à oficina de Tangram 3D! Arraste os blocos geométricos de madeira até o altar dourado seguindo a seta brilhante!"
          currentLevel={level}
          starsEarned={starsEarned}
          avatarConfig={avatarConfig}
          isSpeaking={isSpeaking}
          onSelectLevel={(lvl) => setLevel(lvl)}
          onStartPlay={() => setShowIntro(false)}
        />
      )}

      {/* CELEBRAÇÃO EM 2 COLUNAS LADO A LADO: TANGRAM 3D COMPLETO (ESQUERDA) + MODAL DE PARABÉNS (DIREITA) */}
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col md:flex-row items-center justify-between p-4 md:px-8 lg:px-14 pt-20 pb-6 gap-4">
          {/* Confete festivo */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                style={{
                  left: `${(i * 100) / 20}%`,
                  animationDelay: `${(i % 6) * 0.15}s`,
                  backgroundColor: ['#FBBF24', '#38BDF8', '#34D399', '#F472B6', '#A78BFA'][i % 5],
                  animation: 'confettiFall 2.8s ease-out forwards',
                }}
                className="absolute top-0 w-3.5 h-3.5 rounded-sm"
              />
            ))}
          </div>

          {/* COLUNA 1 (ESQUERDA): Exposição Interativa do Tangram 3D Completo */}
          <div className="w-full md:w-7/12 h-full flex flex-col justify-between items-center py-2">
            <div className="pointer-events-auto hc-surface rounded-2xl bg-slate-900/95 border-2 border-emerald-400 px-4 py-2 shadow-2xl flex items-center gap-2.5 animate-guide-glow">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs md:text-sm font-extrabold text-white">
                {tangramFeedbackText}
              </span>
            </div>

            <div className="flex-1" />

            <div className="pointer-events-auto hc-surface w-full max-w-xl rounded-3xl bg-slate-900/95 border-2 border-slate-700 p-3 shadow-2xl flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={triggerTangramLights}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Lightbulb className="w-5 h-5" />
                <span>Iluminar Altar 3D!</span>
              </button>

              <button
                type="button"
                onClick={triggerTangramWave}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Waves className="w-5 h-5" />
                <span>Onda nos Blocos!</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => rotateTangramLimited(-15)}
                  disabled={tangramYawDeg <= -45}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Girar Esq.</span>
                </button>

                <span className="text-[11px] font-mono text-amber-300 px-1.5 tabular-nums">
                  {tangramYawDeg > 0 ? `+${tangramYawDeg}°` : `${tangramYawDeg}°`}
                </span>

                <button
                  type="button"
                  onClick={() => rotateTangramLimited(15)}
                  disabled={tangramYawDeg >= 45}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                >
                  <span>Girar Dir.</span>
                  <RotateCw className="w-4 h-4 text-emerald-400" />
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
              “Incrível! Você montou {figConfig.title} com todas as formas geométricas 3D de madeira perfeitamente encaixadas!”
            </p>

            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 mb-5 text-left text-xs text-slate-300 space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span>📐</span>
                <span>Experimente no Tangram 3D ao lado:</span>
              </div>
              <p>• Toque em qualquer <strong>peça de madeira 3D</strong> para disparar uma onda;</p>
              <p>• Clique em <strong>Iluminar Altar 3D</strong> para fazer a figura reluzir;</p>
              <p>• Gire suavemente para os lados (`±45°`) para ver o encaixe perfeito.</p>
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
                    initLevelState(level);
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
    </div>
  );
};
