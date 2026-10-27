import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Volume2,
  HelpCircle,
  Home,
  Check,
  RotateCcw,
  Sparkles,
  Accessibility,
  GraduationCap,
  Settings,
  Star,
  ArrowRight,
  Lightbulb,
  Zap,
  RotateCw,
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

interface Game3Props {
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

type DrawingId = 'balloon' | 'house' | 'car';

export interface ColorOption {
  id: string;
  name: string;
  /** Cor viva de alto contraste para UI */
  hex: string;
  /** Cor profunda calibrada para esmalte PBR 3D (evita lavar sob luz forte) */
  threeHex: string;
  /** Símbolo geométrico para acessibilidade / daltonismo */
  symbol: string;
}

export const PALETTE: ColorOption[] = [
  { id: 'red', name: 'Vermelho Vivo', hex: '#DC2626', threeHex: '#CC1414', symbol: '●' },
  { id: 'blue', name: 'Azul Royal', hex: '#0284C7', threeHex: '#0062B8', symbol: '▲' },
  { id: 'yellow', name: 'Amarelo Ouro', hex: '#EAB308', threeHex: '#E59400', symbol: '★' },
  { id: 'green', name: 'Verde Esmeralda', hex: '#16A34A', threeHex: '#058240', symbol: '■' },
  { id: 'brown', name: 'Laranja Coral', hex: '#EA580C', threeHex: '#D44206', symbol: '◆' },
  { id: 'purple', name: 'Roxo Violeta', hex: '#7C3AED', threeHex: '#641EE6', symbol: '♥' },
];

interface PaintStep {
  regionId: string;
  regionName: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  symbol: string;
}

const DRAWING_SCHEMAS: Record<
  DrawingId,
  {
    title: string;
    level1Steps: PaintStep[];
    level2Steps: PaintStep[];
    allRegions: Array<{ id: string; name: string }>;
  }
> = {
  balloon: {
    title: 'Balão 3D',
    allRegions: [
      { id: 'top', name: 'a cúpula do balão' },
      { id: 'stripe', name: 'a faixa do meio' },
      { id: 'basket', name: 'o cesto do balão' },
      { id: 'cloud', name: 'a nuvem 3D' },
    ],
    level1Steps: [
      {
        regionId: 'top',
        regionName: 'a cúpula do balão',
        colorId: 'red',
        colorName: 'Vermelho Vivo',
        colorHex: '#DC2626',
        symbol: '●',
      },
      {
        regionId: 'basket',
        regionName: 'o cesto do balão',
        colorId: 'brown',
        colorName: 'Laranja Coral',
        colorHex: '#EA580C',
        symbol: '◆',
      },
    ],
    level2Steps: [
      {
        regionId: 'top',
        regionName: 'a cúpula do balão',
        colorId: 'red',
        colorName: 'Vermelho Vivo',
        colorHex: '#DC2626',
        symbol: '●',
      },
      {
        regionId: 'stripe',
        regionName: 'a faixa do meio',
        colorId: 'yellow',
        colorName: 'Amarelo Ouro',
        colorHex: '#EAB308',
        symbol: '★',
      },
      {
        regionId: 'basket',
        regionName: 'o cesto do balão',
        colorId: 'brown',
        colorName: 'Laranja Coral',
        colorHex: '#EA580C',
        symbol: '◆',
      },
      {
        regionId: 'cloud',
        regionName: 'a nuvem 3D',
        colorId: 'blue',
        colorName: 'Azul Royal',
        colorHex: '#0284C7',
        symbol: '▲',
      },
    ],
  },
  house: {
    title: 'Casinha 3D',
    allRegions: [
      { id: 'roof', name: 'o telhado 3D' },
      { id: 'wall', name: 'as paredes da casa' },
      { id: 'door', name: 'a porta da frente' },
      { id: 'tree', name: 'o pinheiro do jardim' },
    ],
    level1Steps: [
      {
        regionId: 'roof',
        regionName: 'o telhado 3D',
        colorId: 'red',
        colorName: 'Vermelho Vivo',
        colorHex: '#DC2626',
        symbol: '●',
      },
      {
        regionId: 'door',
        regionName: 'a porta da frente',
        colorId: 'yellow',
        colorName: 'Amarelo Ouro',
        colorHex: '#EAB308',
        symbol: '★',
      },
    ],
    level2Steps: [
      {
        regionId: 'roof',
        regionName: 'o telhado 3D',
        colorId: 'red',
        colorName: 'Vermelho Vivo',
        colorHex: '#DC2626',
        symbol: '●',
      },
      {
        regionId: 'wall',
        regionName: 'as paredes',
        colorId: 'blue',
        colorName: 'Azul Royal',
        colorHex: '#0284C7',
        symbol: '▲',
      },
      {
        regionId: 'door',
        regionName: 'a porta',
        colorId: 'yellow',
        colorName: 'Amarelo Ouro',
        colorHex: '#EAB308',
        symbol: '★',
      },
      {
        regionId: 'tree',
        regionName: 'o pinheiro',
        colorId: 'green',
        colorName: 'Verde Esmeralda',
        colorHex: '#16A34A',
        symbol: '■',
      },
    ],
  },
  car: {
    title: 'Carrinho 3D',
    allRegions: [
      { id: 'cabin', name: 'a cabine do carro' },
      { id: 'chassis', name: 'a carroceria esportiva' },
      { id: 'wheels', name: 'as quatro rodas' },
      { id: 'flag', name: 'o aerofólio traseiro' },
    ],
    level1Steps: [
      {
        regionId: 'chassis',
        regionName: 'a carroceria esportiva',
        colorId: 'blue',
        colorName: 'Azul Royal',
        colorHex: '#0284C7',
        symbol: '▲',
      },
      {
        regionId: 'wheels',
        regionName: 'as quatro rodas',
        colorId: 'yellow',
        colorName: 'Amarelo Ouro',
        colorHex: '#EAB308',
        symbol: '★',
      },
    ],
    level2Steps: [
      {
        regionId: 'cabin',
        regionName: 'a cabine do carro',
        colorId: 'purple',
        colorName: 'Roxo Violeta',
        colorHex: '#7C3AED',
        symbol: '♥',
      },
      {
        regionId: 'chassis',
        regionName: 'a carroceria',
        colorId: 'blue',
        colorName: 'Azul Royal',
        colorHex: '#0284C7',
        symbol: '▲',
      },
      {
        regionId: 'wheels',
        regionName: 'as quatro rodas',
        colorId: 'yellow',
        colorName: 'Amarelo Ouro',
        colorHex: '#EAB308',
        symbol: '★',
      },
      {
        regionId: 'flag',
        regionName: 'o aerofólio',
        colorId: 'green',
        colorName: 'Verde Esmeralda',
        colorHex: '#16A34A',
        symbol: '■',
      },
    ],
  },
};

function createSymbolCapTexture(symbol: string, bgHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 256);

  // Halo interno escuro suave para garantir contraste AAA do símbolo branco
  ctx.beginPath();
  ctx.arc(128, 128, 62, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(9, 13, 22, 0.48)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 82px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, 128, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Jogo 3 em 3D Interativo — "Pinte o Brinquedo 3D Seguindo as Regras" (Pilar: Algoritmos — EI03CO02)
 * - O Pincel Mágico 3D acompanha o movimento do mouse em tempo real pelo cenário 3D!
 * - Cores vivas de alto contraste com símbolos geométricos acessíveis (● ▲ ★ ■ ◆ ♥).
 * - Indicadores visuais em 3D (Seta Dourada Pulsante + Halo + Glow) mostrando exatamente
 *   qual pote de tinta pegar e qual parte da escultura 3D clicar!
 * - Painel inferior arrastável e minimizável para nunca cobrir as tintas.
 */
export const Game3PinteRegras: React.FC<Game3Props> = ({
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
  const [drawing, setDrawing] = useState<DrawingId>('car');
  const [selectedColor, setSelectedColor] = useState<ColorOption>(PALETTE[5]);
  /** Guarda { regionId: colorId } para mapear tanto hex quanto threeHex */
  const [paintedRegions, setPaintedRegions] = useState<Record<string, string>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hintActive, setHintActive] = useState(false);
  const [hoveredTargetLabel, setHoveredTargetLabel] = useState<string | null>(null);
  const [freeHistory, setFreeHistory] = useState<Array<{ regionName: string; colorName: string }>>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Estados de Interação com a Escultura 3D Pintada (Coluna Esquerda na Celebração)
  const [sculptureYawDeg, setSculptureYawDeg] = useState(0);
  const [sculptureLightsActive, setSculptureLightsActive] = useState(false);
  const [sculptureFeedbackText, setSculptureFeedbackText] = useState(
    'Toque na sua Escultura 3D pintada para fazê-la pular, brilhar ou girar um pouquinho!'
  );

  const interactionRef = useRef({
    bounceTimeLeft: 0,
    glowPulseTimeLeft: 0,
    targetYawRad: 0,
    currentYawRad: 0,
    triggerBurstRequest: null as { pos: [number, number, number]; color: string } | null,
  });

  const triggerSculptureLights = () => {
    setSculptureLightsActive((v) => !v);
    interactionRef.current.glowPulseTimeLeft = 2.6;
    interactionRef.current.triggerBurstRequest = {
      pos: [0, 1.25, -0.45],
      color: '#FACC15',
    };
    soundEngine.playPaintBrushSplash();
    setSculptureFeedbackText('✨ Brilho Mágico 3D! Veja como as cores vivas da sua escultura reluzem!');
  };

  const triggerSculptureBounce = () => {
    interactionRef.current.bounceTimeLeft = 2.2;
    interactionRef.current.glowPulseTimeLeft = 1.8;
    interactionRef.current.triggerBurstRequest = {
      pos: [0, 1.15, -0.45],
      color: '#38BDF8',
    };
    soundEngine.playRobotBipBop('limbs');
    setSculptureFeedbackText('🎉 Uhuuul! Sua escultura 3D ganhou vida e está pulando de alegria!');
  };

  const rotateSculptureLimited = (deltaDeg: number) => {
    soundEngine.playRobotBipBop('spin');
    setSculptureYawDeg((prev) => {
      const clamped = Math.max(-55, Math.min(55, prev + deltaDeg));
      interactionRef.current.targetYawRad = THREE.MathUtils.degToRad(clamped);
      return clamped;
    });
    setSculptureFeedbackText('🔄 Girando o torno dourado para você admirar sua pintura 3D!');
  };

  const mountRef = useRef<HTMLDivElement | null>(null);

  const schema = DRAWING_SCHEMAS[drawing];
  const steps = level === 1 ? schema.level1Steps : schema.level2Steps;
  const activeExpectedStep = level !== 3 ? steps[currentStepIndex] : undefined;
  const isRightColorSelected =
    level === 3 || (activeExpectedStep && selectedColor.id === activeExpectedStep.colorId);

  const speakCurrentAlgorithm = (
    lvl: 1 | 2 | 3,
    drw: DrawingId,
    stepIdx: number,
    manual: boolean = false
  ) => {
    const speakFn = (msg: string) =>
      manual ? soundEngine.speakManual(msg) : soundEngine.speak(msg);
    const sc = DRAWING_SCHEMAS[drw];
    if (lvl === 3) {
      speakFn(
        'Ateliê de pintura 3D livre! Mova o pincel 3D com o mouse, escolha qualquer tinta viva e pinte o brinquedo!'
      );
      return;
    }
    const list = lvl === 1 ? sc.level1Steps : sc.level2Steps;
    const current = list[stepIdx];
    if (!current) return;
    const prefix = stepIdx === 0 ? 'Primeiro passo:' : `Passo número ${stepIdx + 1}:`;
    speakFn(
      `${prefix} pegue a tinta ${current.colorName} e pinte ${current.regionName}!`
    );
  };

  const resetCanvas = (lvl: 1 | 2 | 3 = level, drw: DrawingId = drawing) => {
    setPaintedRegions({});
    setCurrentStepIndex(0);
    setHintActive(false);
    setFreeHistory([]);
    setShowCelebration(false);
    setSculptureYawDeg(0);
    setSculptureLightsActive(false);
    interactionRef.current.targetYawRad = 0;
    interactionRef.current.currentYawRad = 0;
    interactionRef.current.bounceTimeLeft = 0;
    const sc = DRAWING_SCHEMAS[drw];
    const firstStep = (lvl === 1 ? sc.level1Steps : sc.level2Steps)[0];
    if (firstStep && lvl !== 3) {
      const col = PALETTE.find((c) => c.id === firstStep.colorId);
      if (col) setSelectedColor(col);
    }
    speakCurrentAlgorithm(lvl, drw, 0);
  };

  useEffect(() => {
    if (!showIntro) {
      resetCanvas(level, drawing);
    }
  }, [level, drawing, showIntro]);

  const handlePaintRegion = (regionId: string) => {
    onRecordAttempt();
    const sc = DRAWING_SCHEMAS[stateRef.current.drawing];
    const regionMeta = sc.allRegions.find((r) => r.id === regionId);
    const activeColor = stateRef.current.selectedColor;

    stateRef.current.brushStrokeImpulse = 1.0;

    if (stateRef.current.level === 3) {
      soundEngine.playPaintBrushSplash();
      setPaintedRegions((prev) => ({ ...prev, [regionId]: activeColor.id }));
      if (regionMeta) {
        setFreeHistory((prev) => [
          ...prev.filter((item) => item.regionName !== regionMeta.name),
          { regionName: regionMeta.name, colorName: activeColor.name },
        ]);
        soundEngine.speak(`Pincelada mágica! ${regionMeta.name} ficou ${activeColor.name}!`);
      }
      return;
    }

    const activeSteps =
      stateRef.current.level === 1 ? sc.level1Steps : sc.level2Steps;
    const expectedStep = activeSteps[stateRef.current.currentStepIndex];
    if (!expectedStep) return;

    if (regionId !== expectedStep.regionId) {
      soundEngine.playGentleHint();
      setHintActive(true);
      soundEngine.speak(
        `Opa! Olhe onde a seta dourada 3D está apontando! Agora é a vez de pintar ${expectedStep.regionName}!`
      );
      return;
    }

    if (activeColor.id !== expectedStep.colorId) {
      soundEngine.playGentleHint();
      setHintActive(true);
      soundEngine.speak(
        `Você encontrou ${expectedStep.regionName}! Mas primeiro toque no pote de tinta ${expectedStep.colorName} que está piscando!`
      );
      return;
    }

    soundEngine.playPaintBrushSplash();
    setPaintedRegions((prev) => ({ ...prev, [regionId]: activeColor.id }));
    setHintActive(false);

    const nextIdx = stateRef.current.currentStepIndex + 1;
    if (nextIdx >= activeSteps.length) {
      onCompleteLevel(stateRef.current.level);
      window.setTimeout(() => {
        setShowCelebration(true);
        setSculptureLightsActive(true);
        interactionRef.current.bounceTimeLeft = 2.2;
        interactionRef.current.glowPulseTimeLeft = 2.8;
        soundEngine.playVictoryFanfare();
        soundEngine.speak(
          'Sua escultura 3D ficou com cores vivas e brilhantes! Brinque com ela ao lado antes de avançar!'
        );
      }, 650);
    } else {
      setCurrentStepIndex(nextIdx);
      speakCurrentAlgorithm(stateRef.current.level, stateRef.current.drawing, nextIdx);
    }
  };

  const stateRef = useRef({
    level,
    drawing,
    selectedColor,
    paintedRegions,
    currentStepIndex,
    hintActive,
    showCelebration,
    sculptureLightsActive,
    visualGuidePulse: settings?.visualGuidePulse ?? true,
    calmMode: settings?.calmMode ?? false,
    hoveredRegionId: null as string | null,
    hoveredPotId: null as string | null,
    brushTargetPos: new THREE.Vector3(0.9, 1.1, 0.5),
    brushVelX: 0,
    brushVelZ: 0,
    brushStrokeImpulse: 0,
    onPaintRegion: handlePaintRegion,
    onSelectColor: (_c: ColorOption) => {},
    onInteractCompletedSculpture: () => {},
  });

  useEffect(() => {
    stateRef.current.level = level;
    stateRef.current.drawing = drawing;
    stateRef.current.selectedColor = selectedColor;
    stateRef.current.paintedRegions = paintedRegions;
    stateRef.current.currentStepIndex = currentStepIndex;
    stateRef.current.hintActive = hintActive;
    stateRef.current.showCelebration = showCelebration;
    stateRef.current.sculptureLightsActive = sculptureLightsActive;
    stateRef.current.visualGuidePulse = settings?.visualGuidePulse ?? true;
    stateRef.current.calmMode = settings?.calmMode ?? false;
    stateRef.current.onPaintRegion = handlePaintRegion;
    stateRef.current.onInteractCompletedSculpture = triggerSculptureBounce;
    stateRef.current.onSelectColor = (c: ColorOption) => {
      soundEngine.playTap();
      stateRef.current.brushStrokeImpulse = 0.85;
      setSelectedColor(c);
      soundEngine.speak(`Tinta ${c.name}`);
    };
  });

  // Inicialização da Cena 3D do Ateliê de Pintura com Pincel 3D Rastreado pelo Mouse
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
    renderer.toneMappingExposure = 1.02;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 3.65, 5.75);
    camera.lookAt(0, 0.82, 0.15);

    const { updateEnvironment } = buildStudioWorkshopEnvironment(scene, renderer, isSoftwareGl);
    const sparkManager = new SparkBurstManager(scene);
    const pointerIndicator3D = create3DPointerIndicator(scene);

    // Torno Giratório Dourado no Centro
    const turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.52, 0.18, 36),
      new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.3, metalness: 0.72 })
    );
    turntable.position.set(0, 0.09, -0.45);
    turntable.receiveShadow = true;
    scene.add(turntable);

    // 6 Potes de Tinta 3D Vivos com Símbolos Acessíveis na Frente da Mesa (z = 1.25 para nunca ficar escondido)
    const potsGroup = new THREE.Group();
    scene.add(potsGroup);
    const potMeshes: Array<{
      colorOpt: ColorOption;
      group: THREE.Group;
      ring: THREE.Mesh;
      worldPos: THREE.Vector3;
    }> = [];

    PALETTE.forEach((col, i) => {
      const pGroup = new THREE.Group();
      const px = (i - 2.5) * 0.94;
      const pz = 1.25;
      pGroup.position.set(px, 0, pz);

      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.3, 0.38, 28),
        new THREE.MeshPhysicalMaterial({
          color: '#0F172A',
          roughness: 0.25,
          metalness: 0.35,
          clearcoat: 0.6,
        })
      );
      jar.position.y = 0.19;
      jar.castShadow = !isSoftwareGl;

      // Faixa lateral colorida viva no pote para identificar a cor de qualquer ângulo
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.335, 0.315, 0.16, 28),
        new THREE.MeshStandardMaterial({
          color: col.threeHex,
          roughness: 0.25,
          metalness: 0.05,
        })
      );
      band.position.y = 0.19;

      // Superfície líquida de tinta viva com símbolo acessível no topo
      const capTex = createSymbolCapTexture(col.symbol, col.threeHex);
      const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.08, 28),
        new THREE.MeshPhysicalMaterial({
          map: capTex,
          roughness: 0.16,
          metalness: 0.02,
          clearcoat: 0.85,
        })
      );
      liquid.position.y = 0.36;

      const selRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.39, 0.04, 14, 32),
        new THREE.MeshBasicMaterial({ color: '#FEF08A' })
      );
      selRing.rotation.x = Math.PI / 2;
      selRing.position.y = 0.05;

      pGroup.add(jar, band, liquid, selRing);
      pGroup.traverse((c) => {
        c.userData = { colorOption: col };
      });
      potsGroup.add(pGroup);
      potMeshes.push({
        colorOpt: col,
        group: pGroup,
        ring: selRing,
        worldPos: new THREE.Vector3(px, 0.62, pz),
      });
    });

    // Pincel Mágico 3D que segue o mouse no espaço 3D!
    const brushGroup = new THREE.Group();
    brushGroup.position.set(1.1, 1.3, 0.6);

    // O pivot (0,0,0) de brushGroup fica próximo à ponta das cerdas para tocar com precisão onde o mouse aponta!
    const tipMat = new THREE.MeshPhysicalMaterial({
      color: '#641EE6',
      emissive: '#641EE6',
      emissiveIntensity: 0.18,
      roughness: 0.18,
      clearcoat: 1.0,
    });
    const tipMesh = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 20), tipMat);
    tipMesh.rotation.x = Math.PI;
    tipMesh.position.y = 0.16;

    const ferruleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.075, 0.18, 20),
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', metalness: 0.88, roughness: 0.18 })
    );
    ferruleMesh.position.y = 0.38;

    const handleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.078, 0.92, 20),
      new THREE.MeshPhysicalMaterial({
        color: '#F59E0B',
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.8,
      })
    );
    handleMesh.position.y = 0.9;

    // Anel luminoso na ponta do pincel para indicar a posição 3D exata
    const brushCursorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.02, 10, 24),
      new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.75 })
    );
    brushCursorRing.rotation.x = Math.PI / 2;
    brushCursorRing.position.y = 0.02;

    brushGroup.add(tipMesh, ferruleMesh, handleMesh, brushCursorRing);
    brushGroup.rotation.z = 0.38;
    brushGroup.rotation.x = 0.22;
    scene.add(brushGroup);

    // Escultura 3D do Brinquedo sobre o Torno
    const sculptureGroup = new THREE.Group();
    sculptureGroup.position.set(0, 0.18, -0.45);
    scene.add(sculptureGroup);

    const regionMaterials: Record<string, THREE.MeshPhysicalMaterial> = {};
    const regionCenters: Record<string, THREE.Vector3> = {};
    let builtDrawing: DrawingId | null = null;

    const rebuildSculptureIfNeeded = () => {
      const drw = stateRef.current.drawing;
      if (drw === builtDrawing) return;
      builtDrawing = drw;

      while (sculptureGroup.children.length > 0) {
        sculptureGroup.remove(sculptureGroup.children[0]);
      }

      const makeRegionMat = (regId: string) => {
        const mat = new THREE.MeshPhysicalMaterial({
          color: '#CBD5E1',
          roughness: 0.32,
          metalness: 0.05,
          clearcoat: isSoftwareGl ? 0 : 0.72,
          clearcoatRoughness: 0.12,
        });
        regionMaterials[regId] = mat;
        return mat;
      };

      const tagRegion = (obj: THREE.Object3D, regId: string, center: [number, number, number]) => {
        regionCenters[regId] = new THREE.Vector3(...center);
        obj.traverse((c) => {
          c.userData = { regionId: regId };
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = !isSoftwareGl;
            c.receiveShadow = true;
          }
        });
        sculptureGroup.add(obj);
      };

      if (drw === 'balloon') {
        const topMat = makeRegionMat('top');
        const topMesh = new THREE.Mesh(new THREE.SphereGeometry(0.78, 28, 20), topMat);
        topMesh.position.set(0, 1.55, 0);
        tagRegion(topMesh, 'top', [0, 2.15, -0.45]);

        const stripeMat = makeRegionMat('stripe');
        const stripeMesh = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.16, 16, 32), stripeMat);
        stripeMesh.rotation.x = Math.PI / 2;
        stripeMesh.position.set(0, 1.35, 0);
        tagRegion(stripeMesh, 'stripe', [0, 1.55, 0.35]);

        const basketMat = makeRegionMat('basket');
        const basketGroup = new THREE.Group();
        const basketBox = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.58), basketMat);
        basketBox.position.y = 0.28;
        basketGroup.add(basketBox);
        [
          [-0.22, -0.22],
          [0.22, -0.22],
          [-0.22, 0.22],
          [0.22, 0.22],
        ].forEach(([rx, rz]) => {
          const rope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8),
            new THREE.MeshStandardMaterial({ color: '#94A3B8' })
          );
          rope.position.set(rx, 0.72, rz);
          basketGroup.add(rope);
        });
        tagRegion(basketGroup, 'basket', [0, 0.72, -0.15]);

        const cloudMat = makeRegionMat('cloud');
        const cloudGroup = new THREE.Group();
        cloudGroup.position.set(-1.15, 1.45, 0.15);
        const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), cloudMat);
        const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), cloudMat);
        c2.position.set(0.28, -0.05, 0);
        const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), cloudMat);
        c3.position.set(-0.26, -0.06, 0);
        cloudGroup.add(c1, c2, c3);
        tagRegion(cloudGroup, 'cloud', [-1.15, 1.9, -0.3]);
      } else if (drw === 'house') {
        const roofMat = makeRegionMat('roof');
        const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(1.12, 0.85, 4), roofMat);
        roofMesh.position.set(-0.25, 1.45, 0);
        roofMesh.rotation.y = Math.PI / 4;
        tagRegion(roofMesh, 'roof', [-0.25, 2.05, -0.45]);

        const wallMat = makeRegionMat('wall');
        const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.02, 1.2), wallMat);
        wallMesh.position.set(-0.25, 0.52, 0);
        tagRegion(wallMesh, 'wall', [-0.25, 1.0, 0.2]);

        const doorMat = makeRegionMat('door');
        const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.14), doorMat);
        doorMesh.position.set(-0.25, 0.36, 0.62);
        tagRegion(doorMesh, 'door', [-0.25, 0.78, 0.25]);

        const treeMat = makeRegionMat('tree');
        const treeGroup = new THREE.Group();
        treeGroup.position.set(0.95, 0, 0.1);
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.15, 0.45, 12),
          new THREE.MeshStandardMaterial({ color: '#78350F' })
        );
        trunk.position.y = 0.22;
        const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.75, 16), treeMat);
        foliage1.position.y = 0.72;
        const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.65, 16), treeMat);
        foliage2.position.y = 1.15;
        treeGroup.add(trunk, foliage1, foliage2);
        tagRegion(treeGroup, 'tree', [0.95, 1.65, -0.35]);
      } else {
        // CARRINHO DE CORRIDA 3D
        const cabinMat = makeRegionMat('cabin');
        const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.46, 0.88), cabinMat);
        cabinMesh.position.set(-0.05, 0.86, 0);
        tagRegion(cabinMesh, 'cabin', [-0.05, 1.35, -0.45]);

        const chassisMat = makeRegionMat('chassis');
        const chassisMesh = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.44, 1.02), chassisMat);
        chassisMesh.position.set(0, 0.44, 0);
        tagRegion(chassisMesh, 'chassis', [0.35, 0.88, 0.1]);

        const wheelsMat = makeRegionMat('wheels');
        const wheelsGroup = new THREE.Group();
        const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 20);
        wheelGeo.rotateX(Math.PI / 2);
        [
          [-0.62, 0.56],
          [0.62, 0.56],
          [-0.62, -0.56],
          [0.62, -0.56],
        ].forEach(([wx, wz]) => {
          const w = new THREE.Mesh(wheelGeo, wheelsMat);
          w.position.set(wx, 0.28, wz);
          wheelsGroup.add(w);
        });
        tagRegion(wheelsGroup, 'wheels', [0.62, 0.75, 0.15]);

        const flagMat = makeRegionMat('flag');
        const spoilerGroup = new THREE.Group();
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 1.08), flagMat);
        wing.position.set(-0.88, 0.92, 0);
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), flagMat);
        postL.position.set(-0.88, 0.74, 0.36);
        const postR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), flagMat);
        postR.position.set(-0.88, 0.74, -0.36);
        spoilerGroup.add(wing, postL, postR);
        tagRegion(spoilerGroup, 'flag', [-0.88, 1.32, -0.45]);
      }
    };

    rebuildSculptureIfNeeded();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const brushWorkPlane = new THREE.Plane(new THREE.Vector3(0, 0.82, 0.57).normalize(), -0.75);
    const planeHitPoint = new THREE.Vector3();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const prevX = stateRef.current.brushTargetPos.x;
      const prevZ = stateRef.current.brushTargetPos.z;

      // 1. Verifica se o mouse está sobre a Escultura 3D
      const sculpHits = raycaster.intersectObjects(sculptureGroup.children, true);
      if (sculpHits.length > 0) {
        const hit = sculpHits[0];
        const regId = hit.object.userData?.regionId as string | undefined;
        stateRef.current.brushTargetPos.copy(hit.point).add(new THREE.Vector3(0, 0.08, 0.08));
        stateRef.current.hoveredRegionId = regId || null;
        stateRef.current.hoveredPotId = null;
        renderer.domElement.style.cursor = 'pointer';

        const sc = DRAWING_SCHEMAS[stateRef.current.drawing];
        const regMeta = sc.allRegions.find((r) => r.id === regId);
        if (regMeta) {
          setHoveredTargetLabel(`Pintar ${regMeta.name}`);
          soundEngine.speakHover(regMeta.name);
        }
      } else {
        // 2. Verifica se o mouse está sobre algum Pote de Tinta 3D
        const potHits = raycaster.intersectObjects(potsGroup.children, true);
        if (potHits.length > 0) {
          const hit = potHits[0];
          const colOpt = hit.object.userData?.colorOption as ColorOption | undefined;
          stateRef.current.brushTargetPos.copy(hit.point).add(new THREE.Vector3(0, 0.12, 0));
          stateRef.current.hoveredPotId = colOpt?.id || null;
          stateRef.current.hoveredRegionId = null;
          renderer.domElement.style.cursor = 'pointer';
          if (colOpt) {
            setHoveredTargetLabel(`Pegar tinta ${colOpt.name} (${colOpt.symbol})`);
            soundEngine.speakHover(`Tinta ${colOpt.name}`);
          }
        } else {
          // 3. Caso contrário, move o Pincel 3D livremente pelo plano 3D da bancada!
          stateRef.current.hoveredRegionId = null;
          stateRef.current.hoveredPotId = null;
          renderer.domElement.style.cursor = 'default';
          setHoveredTargetLabel(null);
          if (raycaster.ray.intersectPlane(brushWorkPlane, planeHitPoint)) {
            stateRef.current.brushTargetPos.set(
              THREE.MathUtils.clamp(planeHitPoint.x, -2.9, 2.9),
              THREE.MathUtils.clamp(planeHitPoint.y, 0.25, 2.45),
              THREE.MathUtils.clamp(planeHitPoint.z, -1.5, 1.9)
            );
          }
        }
      }

      stateRef.current.brushVelX = stateRef.current.brushTargetPos.x - prevX;
      stateRef.current.brushVelZ = stateRef.current.brushTargetPos.z - prevZ;
    };

    const handlePointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // 1. Clicou em um Pote de Tinta 3D
      const potHits = raycaster.intersectObjects(potsGroup.children, true);
      if (potHits.length > 0) {
        const colOpt = potHits[0].object.userData?.colorOption as ColorOption | undefined;
        if (colOpt) {
          stateRef.current.brushTargetPos.copy(potHits[0].point);
          sparkManager.triggerBurst(potHits[0].point, colOpt.hex);
          stateRef.current.onSelectColor(colOpt);
          return;
        }
      }

      // 2. Clicou em uma parte da Escultura 3D para pintar (ou para brincar na celebração!)
      const sculpHits = raycaster.intersectObjects(sculptureGroup.children, true);
      if (sculpHits.length > 0) {
        if (stateRef.current.showCelebration) {
          sparkManager.triggerBurst(sculpHits[0].point, '#FACC15');
          stateRef.current.onInteractCompletedSculpture();
          return;
        }
        const regId = sculpHits[0].object.userData?.regionId as string | undefined;
        if (regId) {
          const hitPt = sculpHits[0].point;
          stateRef.current.brushTargetPos.copy(hitPt);
          sparkManager.triggerBurst(hitPt, stateRef.current.selectedColor.hex);
          stateRef.current.onPaintRegion(regId);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    let frameId = 0;
    let isUnmounted = false;
    const clock = new THREE.Clock();
    const _worldTarget = new THREE.Vector3();
    const currentLookAt = new THREE.Vector3(0, 0.82, 0.15);

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

      rebuildSculptureIfNeeded();
      updateEnvironment(elapsed);
      sparkManager.update(dt);

      if (inter.triggerBurstRequest) {
        sparkManager.triggerBurst(
          new THREE.Vector3(...inter.triggerBurstRequest.pos),
          inter.triggerBurstRequest.color
        );
        inter.triggerBurstRequest = null;
      }

      inter.bounceTimeLeft = Math.max(0, inter.bounceTimeLeft - dt);
      inter.glowPulseTimeLeft = Math.max(0, inter.glowPulseTimeLeft - dt);
      inter.currentYawRad = THREE.MathUtils.damp(
        inter.currentYawRad,
        inter.targetYawRad,
        8,
        dt
      );

      // Enquadramento de Câmera: Quando a fase conclui (`showCelebration`), enquadra a escultura 3D pintada na COLUNA ESQUERDA!
      const isWideViewport = (container?.clientWidth || window.innerWidth) >= 768;
      const targetCamPos =
        st.showCelebration && isWideViewport
          ? new THREE.Vector3(0.95, 2.75, 4.15)
          : st.showCelebration
          ? new THREE.Vector3(0, 2.95, 4.55)
          : new THREE.Vector3(0, 3.65, 5.75);

      const targetLookAt =
        st.showCelebration && isWideViewport
          ? new THREE.Vector3(1.05, 0.95, -0.45)
          : st.showCelebration
          ? new THREE.Vector3(0, 0.9, -0.45)
          : new THREE.Vector3(0, 0.82, 0.15);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 5, dt);

      currentLookAt.x = THREE.MathUtils.damp(currentLookAt.x, targetLookAt.x, 5, dt);
      currentLookAt.y = THREE.MathUtils.damp(currentLookAt.y, targetLookAt.y, 5, dt);
      currentLookAt.z = THREE.MathUtils.damp(currentLookAt.z, targetLookAt.z, 5, dt);
      camera.lookAt(currentLookAt);

      potsGroup.visible = !st.showCelebration;
      brushGroup.visible = !st.showCelebration;

      // Giro e pulo da escultura 3D
      const rotSpeed = st.calmMode ? 0.18 : 0.48;
      const bounceY =
        inter.bounceTimeLeft > 0 ? Math.abs(Math.sin(elapsed * 12)) * 0.28 : 0;
      sculptureGroup.position.y = THREE.MathUtils.damp(
        sculptureGroup.position.y,
        0.18 + bounceY,
        12,
        dt
      );

      if (st.showCelebration) {
        sculptureGroup.rotation.y =
          inter.currentYawRad + Math.sin(elapsed * 0.9) * 0.18;
      } else {
        sculptureGroup.rotation.y = Math.sin(elapsed * rotSpeed) * 0.38;
      }
      turntable.rotation.y = sculptureGroup.rotation.y;

      // Atualiza o Pincel Mágico 3D acompanhando o mouse em tempo real!
      tipMat.color.set(st.selectedColor.threeHex);
      tipMat.emissive.set(st.selectedColor.threeHex);
      (brushCursorRing.material as THREE.MeshBasicMaterial).color.set(st.selectedColor.hex);

      if (st.brushStrokeImpulse > 0.01) {
        st.brushStrokeImpulse = THREE.MathUtils.damp(st.brushStrokeImpulse, 0, 8, dt);
      }
      const strokeDip = Math.sin(st.brushStrokeImpulse * Math.PI) * 0.22;

      brushGroup.position.x = THREE.MathUtils.damp(
        brushGroup.position.x,
        st.brushTargetPos.x,
        18,
        dt
      );
      brushGroup.position.y = THREE.MathUtils.damp(
        brushGroup.position.y,
        st.brushTargetPos.y - strokeDip,
        18,
        dt
      );
      brushGroup.position.z = THREE.MathUtils.damp(
        brushGroup.position.z,
        st.brushTargetPos.z,
        18,
        dt
      );

      const targetRotZ =
        0.35 - THREE.MathUtils.clamp(st.brushVelX * 2.5, -0.45, 0.45) + strokeDip * 1.4;
      const targetRotX =
        0.22 + THREE.MathUtils.clamp(st.brushVelZ * 2.5, -0.35, 0.35);
      brushGroup.rotation.z = THREE.MathUtils.damp(brushGroup.rotation.z, targetRotZ, 12, dt);
      brushGroup.rotation.x = THREE.MathUtils.damp(brushGroup.rotation.x, targetRotX, 12, dt);
      st.brushVelX *= 0.85;
      st.brushVelZ *= 0.85;

      const sc = DRAWING_SCHEMAS[st.drawing];
      const activeSteps = st.level === 1 ? sc.level1Steps : sc.level2Steps;
      const expectedStep = st.level !== 3 && !st.showCelebration ? activeSteps[st.currentStepIndex] : undefined;
      const needsColorPick =
        expectedStep && st.selectedColor.id !== expectedStep.colorId;

      potMeshes.forEach((pm) => {
        const isSel = pm.colorOpt.id === st.selectedColor.id;
        const isHov = pm.colorOpt.id === st.hoveredPotId;
        const isTargetPot =
          (st.visualGuidePulse || st.hintActive) &&
          needsColorPick &&
          pm.colorOpt.id === expectedStep?.colorId;

        pm.ring.visible = isSel || isHov || Boolean(isTargetPot);
        (pm.ring.material as THREE.MeshBasicMaterial).color.set(
          isTargetPot ? '#FACC15' : isSel ? '#FFFFFF' : '#38BDF8'
        );

        const pulseBoost = isTargetPot ? Math.sin(elapsed * 7) * 0.1 : 0;
        const targetScale = (isSel ? 1.2 : isHov ? 1.12 : 1.0) + pulseBoost;
        pm.group.scale.setScalar(THREE.MathUtils.damp(pm.group.scale.x, targetScale, 10, dt));
      });

      const celebrationGlowBoost =
        st.showCelebration && (st.sculptureLightsActive || inter.glowPulseTimeLeft > 0)
          ? 0.22 + Math.abs(Math.sin(elapsed * 7)) * 0.25
          : 0;

      Object.entries(regionMaterials).forEach(([regId, mat]) => {
        const paintedColorId = st.paintedRegions[regId];
        const paintedOpt = PALETTE.find((c) => c.id === paintedColorId);
        const isHoveredReg = st.hoveredRegionId === regId;
        const isTargetReg =
          (st.visualGuidePulse || st.hintActive) &&
          !needsColorPick &&
          expectedStep?.regionId === regId;

        if (paintedOpt) {
          mat.color.set(paintedOpt.threeHex);
          mat.roughness = 0.22;
          mat.emissive.set(paintedOpt.threeHex);
          mat.emissiveIntensity = (isHoveredReg ? 0.22 : 0.08) + celebrationGlowBoost;
        } else if (isTargetReg) {
          const pulse = (Math.sin(elapsed * 6.5) + 1) * 0.5;
          mat.color.set('#FEF08A');
          mat.emissive.set(expectedStep?.colorHex || '#F59E0B');
          mat.emissiveIntensity = 0.25 + pulse * 0.45;
        } else if (isHoveredReg) {
          mat.color.set('#F8FAFC');
          mat.emissive.set(st.selectedColor.threeHex);
          mat.emissiveIntensity = 0.28;
        } else {
          mat.color.set('#CBD5E1');
          mat.roughness = 0.35;
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      });

      if (!st.showCelebration && (st.visualGuidePulse || st.hintActive) && expectedStep) {
        if (needsColorPick) {
          const targetPot = potMeshes.find((p) => p.colorOpt.id === expectedStep.colorId);
          if (targetPot) {
            pointerIndicator3D.update(elapsed, targetPot.worldPos, expectedStep.colorHex, true);
          } else {
            pointerIndicator3D.update(elapsed, null, '#FACC15', false);
          }
        } else {
          const regCenter = regionCenters[expectedStep.regionId];
          if (regCenter) {
            _worldTarget.copy(regCenter);
            pointerIndicator3D.update(elapsed, _worldTarget, expectedStep.colorHex, true);
          } else {
            pointerIndicator3D.update(elapsed, null, '#FACC15', false);
          }
        }
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
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
    };
  }, []);

  const handleTriggerHint = () => {
    onRecordHint();
    soundEngine.playTap();
    if (level === 3) {
      soundEngine.speak(
        'Mova o pincel 3D com o mouse, toque em um pote de tinta viva e depois toque nas partes da escultura!'
      );
      return;
    }
    const expected = steps[currentStepIndex];
    if (!expected) return;
    setHintActive(true);
    const matchingColor = PALETTE.find((c) => c.id === expected.colorId);
    if (matchingColor) setSelectedColor(matchingColor);
    soundEngine.speak(
      `Dica do Bit: Eu já coloquei a tinta ${expected.colorName} no seu pincel 3D! Agora toque em ${expected.regionName} onde a seta dourada está apontando!`
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* PALCO 3D EM TELA CHEIA */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* BARRA SUPERIOR FLUTUANTE */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 md:px-6 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              onBackHub();
            }}
            onMouseEnter={() => soundEngine.speakHover('Voltar ao Salão 3D')}
            className="hc-button min-h-[46px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-xl"
          >
            <Home className="w-5 h-5 text-sky-400" />
            <span>Salão 3D</span>
          </button>

          <div className="hc-surface rounded-2xl bg-slate-900/95 border border-slate-700 px-3.5 py-2 shadow-xl flex items-center gap-2">
            <span className="font-bold font-display text-sm md:text-base text-white">
              Pinte o Brinquedo 3D
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="text-xs text-amber-400 font-semibold">Algoritmos (EI03CO02)</span>
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
              className={`hc-button min-h-[44px] px-3.5 rounded-2xl font-bold text-xs shadow-xl ${
                level === lvl
                  ? 'bg-amber-400 text-slate-950 border-2 border-white'
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
              speakCurrentAlgorithm(level, drawing, currentStepIndex, true);
            }}
            onMouseEnter={() => soundEngine.speakHover('Ouvir passo atual')}
            className="hc-button min-h-[44px] px-3.5 rounded-2xl bg-slate-900/95 border border-sky-400/60 text-sky-300 font-bold text-xs flex items-center gap-1.5 shadow-xl"
          >
            <Volume2 className="w-4 h-4 text-sky-400" />
            <span>Ouvir Passo</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerHint}
            onMouseEnter={() => soundEngine.speakHover('Pedir dica ao Robô Bit')}
            className="hc-button min-h-[44px] px-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xl"
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
              className="hc-button min-h-[44px] px-3 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-sky-400 font-bold text-xs flex items-center gap-1 shadow-xl"
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
              className="hc-button min-h-[44px] px-3 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1 shadow-xl"
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
              className="hc-button min-h-[44px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border-2 border-slate-600 hover:border-amber-400 text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-xl"
              title="Configurações de Áudio, Narração e Volumes"
              aria-label="Abrir Configurações"
            >
              <Settings className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* FAIXA DE ALGORITMO / RECEITA DE PASSOS COM INDICAÇÃO VISUAL CLARA (Oculta na Celebração) */}
      {!showCelebration && (
        <div className="pointer-events-none absolute inset-x-0 top-16 md:top-18 px-3 flex flex-col items-center gap-1.5 z-10">
          {level !== 3 ? (
            <>
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 bg-slate-900/95 border-2 border-slate-700 rounded-2xl p-2 shadow-2xl">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <button
                      key={step.regionId}
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        const col = PALETTE.find((c) => c.id === step.colorId);
                        if (col && isCurrent) setSelectedColor(col);
                        soundEngine.speak(
                          `Passo ${idx + 1}: pinte ${step.regionName} de ${step.colorName}`
                        );
                      }}
                      onMouseEnter={() =>
                        soundEngine.speakHover(
                          `Passo ${idx + 1}: ${step.regionName} na cor ${step.colorName}`
                        )
                      }
                      className={`min-h-[46px] px-3.5 py-1.5 rounded-xl border-2 flex items-center gap-2 text-xs font-extrabold transition-all ${
                        isDone
                          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                          : isCurrent
                          ? 'bg-amber-400/20 border-amber-300 text-white animate-guide-glow'
                          : 'bg-slate-950/90 border-slate-800 text-slate-400 opacity-65'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center tabular-nums text-[11px] font-black ${
                          isDone
                            ? 'bg-emerald-400 text-slate-950'
                            : isCurrent
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </span>
                      <span>{step.regionName}</span>
                      <span
                        style={{ backgroundColor: step.colorHex }}
                        className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                      >
                        {step.symbol}
                      </span>
                      {isCurrent && (
                        <Volume2 className="w-4 h-4 text-amber-300 animate-pointer-bob" />
                      )}
                    </button>
                  );
                })}
              </div>

              {activeExpectedStep && (
                <div className="pointer-events-auto rounded-full bg-slate-950/95 border border-amber-400/80 px-4 py-1 text-xs font-extrabold text-amber-200 flex items-center gap-2 shadow-xl">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {!isRightColorSelected ? (
                    <span>
                      1º Passo: Toque no pote de tinta{' '}
                      <strong className="text-white underline">
                        {activeExpectedStep.colorName} ({activeExpectedStep.symbol})
                      </strong>{' '}
                      onde a seta 3D aponta!
                    </span>
                  ) : (
                    <span>
                      2º Passo: Agora leve o pincel 3D e clique em{' '}
                      <strong className="text-white underline">
                        {activeExpectedStep.regionName}
                      </strong>{' '}
                      que está brilhando!
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/95 border border-slate-700 rounded-2xl px-4 py-2 shadow-2xl">
              <span className="text-xs font-bold text-sky-300">
                Passos pintados em 3D: {freeHistory.length}
              </span>
              <button
                type="button"
                onClick={() => resetCanvas(3, drawing)}
                className="min-h-[38px] px-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
              <button
                type="button"
                disabled={freeHistory.length < 2}
                onClick={() => {
                  const recipeText = freeHistory
                    .map(
                      (item, i) =>
                        `${i === 0 ? 'Primeiro' : 'Depois'} você pintou ${item.regionName} de ${item.colorName}`
                    )
                    .join('. ');
                  soundEngine.playVictoryFanfare();
                  soundEngine.speak(`Que escultura 3D linda! ${recipeText}!`);
                  onCompleteLevel(3);
                  setShowCelebration(true);
                  setSculptureLightsActive(true);
                  interactionRef.current.bounceTimeLeft = 2.2;
                }}
                className="hc-button min-h-[38px] px-4 rounded-xl bg-emerald-500 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Bit, Ler Minha Receita!</span>
              </button>
            </div>
          )}

          {hoveredTargetLabel && (
            <div className="rounded-xl bg-slate-900/95 border border-sky-400 px-3 py-1 text-xs font-extrabold text-sky-200 shadow-lg">
              🖌️ {hoveredTargetLabel}
            </div>
          )}
        </div>
      )}

      {/* PAINEL INFERIOR ARRASTÁVEL E MINIMIZÁVEL (Oculto na Celebração para liberar a visão 3D!) */}
      {!showCelebration && (
        <DraggableMinimizableDock
          title="Ateliê 3D: Brinquedos, Cores Acessíveis e Partes"
          minimizedLabel="🖌️ Abrir Controles de Pintura"
          maxWidthClass="max-w-4xl"
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'balloon', label: '🎈 Balão 3D' },
                    { id: 'house', label: '🏠 Casa 3D' },
                    { id: 'car', label: '🏎️ Carro 3D' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      setDrawing(d.id);
                    }}
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-extrabold border transition-all ${
                      drawing === d.id
                        ? 'bg-amber-400 text-slate-950 border-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {PALETTE.map((col) => {
                  const isSel = selectedColor.id === col.id;
                  const isNeededColor =
                    level !== 3 &&
                    activeExpectedStep?.colorId === col.id &&
                    selectedColor.id !== col.id;

                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playTap();
                        setSelectedColor(col);
                        soundEngine.speak(`Tinta ${col.name}`);
                      }}
                      onMouseEnter={() => soundEngine.speakHover(`Tinta ${col.name}`)}
                      style={{ backgroundColor: col.hex }}
                      className={`min-h-[40px] px-2.5 rounded-xl font-extrabold text-xs text-white flex items-center gap-1.5 transition-all shadow-md ${
                        isSel
                          ? 'ring-3 ring-white scale-105'
                          : isNeededColor
                          ? 'ring-3 ring-amber-300 animate-guide-glow'
                          : 'opacity-90 hover:opacity-100'
                      }`}
                      title={`Tinta ${col.name} (${col.symbol})`}
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-950/45 flex items-center justify-center text-xs font-black">
                        {col.symbol}
                      </span>
                      <span className="hidden sm:inline drop-shadow">{col.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-slate-800/80">
              {schema.allRegions.map((reg) => {
                const isPainted = Boolean(paintedRegions[reg.id]);
                const isTargetPart =
                  level !== 3 &&
                  isRightColorSelected &&
                  activeExpectedStep?.regionId === reg.id;

                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => handlePaintRegion(reg.id)}
                    onMouseEnter={() => soundEngine.speakHover(`Pintar ${reg.name}`)}
                    className={`hc-button min-h-[40px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isTargetPart
                        ? 'bg-amber-400 text-slate-950 border-white font-extrabold animate-guide-glow'
                        : isPainted
                        ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <span>{isPainted ? '✓' : '🖌️'}</span>
                    <span>{reg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </DraggableMinimizableDock>
      )}

      {showIntro && (
        <GameIntroModal
          title="Pinte o Brinquedo 3D"
          pilarLabel="Algoritmos (Etapas Ordenadas)"
          bnccCode="EI03CO02 · EI03CO03"
          spokenIntro="Mova o Pincel Mágico 3D com o mouse! Toque nos potes de tinta viva sobre a mesa e pinte cada parte da escultura 3D seguindo a seta dourada!"
          currentLevel={level}
          starsEarned={starsEarned}
          avatarConfig={avatarConfig}
          isSpeaking={isSpeaking}
          onSelectLevel={(lvl) => setLevel(lvl)}
          onStartPlay={() => setShowIntro(false)}
        />
      )}

      {/* CELEBRAÇÃO EM 2 COLUNAS LADO A LADO: ESCULTURA 3D PINTADA (ESQUERDA) + MODAL DE PARABÉNS (DIREITA) */}
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

          {/* COLUNA 1 (ESQUERDA): Exposição Interativa da Escultura 3D Pintada */}
          <div className="w-full md:w-7/12 h-full flex flex-col justify-between items-center py-2">
            <div className="pointer-events-auto hc-surface rounded-2xl bg-slate-900/95 border-2 border-amber-400 px-4 py-2 shadow-2xl flex items-center gap-2.5 animate-guide-glow">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs md:text-sm font-extrabold text-white">
                {sculptureFeedbackText}
              </span>
            </div>

            <div className="flex-1" />

            <div className="pointer-events-auto hc-surface w-full max-w-xl rounded-3xl bg-slate-900/95 border-2 border-slate-700 p-3 shadow-2xl flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={triggerSculptureLights}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Lightbulb className="w-5 h-5" />
                <span>Acender Brilho Mágico!</span>
              </button>

              <button
                type="button"
                onClick={triggerSculptureBounce}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Zap className="w-5 h-5" />
                <span>Pulo de Alegria 3D!</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => rotateSculptureLimited(-20)}
                  disabled={sculptureYawDeg <= -55}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Girar Esq.</span>
                </button>

                <span className="text-[11px] font-mono text-amber-300 px-1.5 tabular-nums">
                  {sculptureYawDeg > 0 ? `+${sculptureYawDeg}°` : `${sculptureYawDeg}°`}
                </span>

                <button
                  type="button"
                  onClick={() => rotateSculptureLimited(20)}
                  disabled={sculptureYawDeg >= 55}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                >
                  <span>Girar Dir.</span>
                  <RotateCw className="w-4 h-4 text-amber-400" />
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
              “Sua escultura 3D ficou com cores vivas e brilhantes! Você seguiu todos os passos do algoritmo na ordem certa!”
            </p>

            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 mb-5 text-left text-xs text-slate-300 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>🎨</span>
                <span>Experimente no Brinquedo 3D ao lado:</span>
              </div>
              <p>• Toque na <strong>Escultura 3D</strong> para vê-la pular no torno dourado;</p>
              <p>• Clique em <strong>Acender Brilho Mágico</strong> para iluminar sua pintura;</p>
              <p>• Use os botões de giro para admirar todos os ângulos (`±55°`).</p>
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
                    resetCanvas(level, drawing);
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
