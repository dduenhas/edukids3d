import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Volume2,
  HelpCircle,
  Home,
  Check,
  Shuffle,
  Sparkles,
  Star,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  Zap,
  RotateCw,
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
  build3DCharacterPart,
  create3DPointerIndicator,
  RobotPartId,
  CharacterStyle,
} from '../utils/threeEnvironment';

interface Game1Props {
  starsEarned: [boolean, boolean, boolean];
  avatarConfig: CustomAvatarConfig;
  isSpeaking: boolean;
  onCompleteLevel: (level: 1 | 2 | 3) => void;
  onRecordAttempt: () => void;
  onRecordHint: () => void;
  onSaveCustomAvatar: (config: CustomAvatarConfig) => void;
  onBackHub: () => void;
  onOpenSettings?: () => void;
}

interface PartSpec {
  id: RobotPartId;
  label: string;
  spokenName: string;
  /** Posição montada no pedestal central */
  assembledPos: [number, number, number];
  /** Posição desmontada repousando sobre as laterais visíveis da mesa 3D */
  tablePos: [number, number, number];
}

const ALL_PART_SPECS: PartSpec[] = [
  {
    id: 'legs',
    label: 'Pernas 3D',
    spokenName: 'as pernas propulsoras na base',
    assembledPos: [0, 0.56, 0],
    tablePos: [-2.25, 0.36, 0.25],
  },
  {
    id: 'body',
    label: 'Tronco 3D',
    spokenName: 'o tronco no centro do corpo',
    assembledPos: [0, 1.32, 0],
    tablePos: [2.25, 0.44, 0.25],
  },
  {
    id: 'head',
    label: 'Cabeça 3D',
    spokenName: 'a cabeça com visor lá no alto',
    assembledPos: [0, 2.12, 0],
    tablePos: [-2.25, 0.38, -0.85],
  },
  {
    id: 'armLeft',
    label: 'Braço Esq.',
    spokenName: 'o braço mecânico esquerdo',
    assembledPos: [-0.66, 1.35, 0],
    tablePos: [-1.85, 0.36, 1.15],
  },
  {
    id: 'armRight',
    label: 'Braço Dir.',
    spokenName: 'o braço mecânico direito',
    assembledPos: [0.66, 1.35, 0],
    tablePos: [1.85, 0.36, 1.15],
  },
  {
    id: 'hat',
    label: 'Antena / Topo',
    spokenName: 'a antena luminosa no topo da cabeça',
    assembledPos: [0, 2.48, 0],
    tablePos: [2.25, 0.32, -0.85],
  },
];

const ROBOT_LIGHT_COLORS = [
  { hex: '#38BDF8', num: 0x38bdf8, name: 'Azul Elétrico' },
  { hex: '#FACC15', num: 0xfacc15, name: 'Amarelo Solar' },
  { hex: '#34D399', num: 0x34d399, name: 'Verde Esmeralda' },
  { hex: '#F472B6', num: 0xf472b6, name: 'Rosa Neon' },
];

/**
 * Jogo 1 em 3D Interativo — "Monte o Amiguinho 3D" (Pilar: Decomposição)
 * Ao concluir a montagem da última peça em cada fase, abre uma visualização em DUAS COLUNAS:
 * - Coluna Esquerda: O Robô 3D montado vivo no palco, interativo ao clique (acende luzes,
 *   movimenta membros com som robótico "Bip-Bop-Buzzz!" e permite girar um pouquinho para os lados).
 * - Coluna Direita: O Box de Parabéns com a estrela conquistada e botões de avanço.
 */
export const Game1MonteAmiguinho: React.FC<Game1Props> = ({
  starsEarned,
  avatarConfig,
  isSpeaking,
  onCompleteLevel,
  onRecordAttempt,
  onRecordHint,
  onSaveCustomAvatar,
  onBackHub,
  onOpenSettings,
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [characterTheme, setCharacterTheme] = useState<CharacterStyle>('robot');
  const [placedSlots, setPlacedSlots] = useState<Record<RobotPartId, boolean>>({
    legs: false,
    body: false,
    head: false,
    armLeft: false,
    armRight: false,
    hat: false,
  });
  const [selectedPart, setSelectedPart] = useState<RobotPartId | null>(null);
  const [hintPart, setHintPart] = useState<RobotPartId | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [freeConfig, setFreeConfig] = useState<CustomAvatarConfig>(avatarConfig);

  // Estados de Interação com o Robô Pronto (Bip-Bop, Luzes, Membros e Giro Limitado)
  const [lightsColorIdx, setLightsColorIdx] = useState(0);
  const [lightsActive, setLightsActive] = useState(false);
  const [robotYawDeg, setRobotYawDeg] = useState(0); // Limitado entre -55° e +55°
  const [robotFeedbackText, setRobotFeedbackText] = useState(
    'Toque no seu Robô 3D para acender luzes, mexer os braços e ouvir Bip-Bop-Buzzz!'
  );

  const mountRef = useRef<HTMLDivElement | null>(null);

  // Refs de animação interativa no loop 3D
  const interactionRef = useRef({
    limbWaveTimeLeft: 0,
    lightPulseTimeLeft: 0,
    headNodTimeLeft: 0,
    hopTimeLeft: 0,
    targetYawRad: 0,
    currentYawRad: 0,
    triggerBurstRequest: null as { pos: [number, number, number]; color: string } | null,
  });

  const activePartIds: RobotPartId[] =
    level === 1
      ? ['legs', 'body', 'head']
      : ['legs', 'body', 'head', 'armLeft', 'armRight', 'hat'];

  const nextMissingPartId = activePartIds.find((id) => !placedSlots[id]) || null;
  const focusedPartId = selectedPart || hintPart || nextMissingPartId;
  const focusedPartSpec = ALL_PART_SPECS.find((p) => p.id === focusedPartId) || null;
  const placedCount = activePartIds.filter((id) => placedSlots[id]).length;

  // Funções de Interação com o Robô Montado
  const triggerRobotLights = () => {
    const nextIdx = (lightsColorIdx + 1) % ROBOT_LIGHT_COLORS.length;
    const chosenColor = ROBOT_LIGHT_COLORS[nextIdx];
    setLightsColorIdx(nextIdx);
    setLightsActive(true);
    interactionRef.current.lightPulseTimeLeft = 2.6;
    interactionRef.current.headNodTimeLeft = 1.4;
    interactionRef.current.triggerBurstRequest = {
      pos: [0, 2.55, 0],
      color: chosenColor.hex,
    };
    soundEngine.playRobotBipBop('lights');
    setRobotFeedbackText(`💡 Bip-Bop-Buzzz! Luzes ${chosenColor.name} acesas no visor e na antena!`);
    soundEngine.speak(`Bip bop buzzz! Luzes ${chosenColor.name} ativadas!`);
  };

  const triggerRobotLimbs = () => {
    interactionRef.current.limbWaveTimeLeft = 2.8;
    interactionRef.current.hopTimeLeft = 1.6;
    interactionRef.current.headNodTimeLeft = 2.2;
    interactionRef.current.lightPulseTimeLeft = 2.0;
    interactionRef.current.triggerBurstRequest = {
      pos: [0, 1.45, 0],
      color: '#34D399',
    };
    soundEngine.playRobotBipBop('limbs');
    setRobotFeedbackText('🙌 Biiip-Bop! Movendo braços mecânicos, antena e propulsores!');
    soundEngine.speak('Bip bop! Olha como eu mexo os braços e pulo de alegria!');
  };

  const rotateRobotLimited = (deltaDeg: number) => {
    soundEngine.playRobotBipBop('spin');
    setRobotYawDeg((prev) => {
      const clamped = Math.max(-55, Math.min(55, prev + deltaDeg));
      interactionRef.current.targetYawRad = THREE.MathUtils.degToRad(clamped);
      return clamped;
    });
    setRobotFeedbackText('🔄 Whirrr-Bip! Girando um pouquinho para você ver todos os detalhes 3D!');
  };

  const stateRef = useRef({
    level,
    characterTheme,
    placedSlots,
    selectedPart,
    hintPart,
    focusedPartId,
    freeConfig,
    showCelebration,
    lightsActive,
    lightsColorIdx,
    onSnapPart: (_partId: RobotPartId) => {},
    onSelectPart: (_partId: RobotPartId) => {},
    onInteractAssembledPart: (_partId: RobotPartId) => {},
  });

  const triggerSnapPart = (partId: RobotPartId) => {
    if (stateRef.current.placedSlots[partId]) return;
    onRecordAttempt();
    soundEngine.playMechanicalAttach();

    const next = { ...stateRef.current.placedSlots, [partId]: true };
    setPlacedSlots(next);
    setSelectedPart(null);
    setHintPart(null);

    const reqIds: RobotPartId[] =
      stateRef.current.level === 1
        ? ['legs', 'body', 'head']
        : ['legs', 'body', 'head', 'armLeft', 'armRight', 'hat'];

    const allDone = reqIds.every((id) => next[id]);
    if (allDone) {
      // Ao concluir todas as peças da fase, ativa todas no boneco final para que ele tenha braços e antena completos para brincar!
      setPlacedSlots({
        legs: true,
        body: true,
        head: true,
        armLeft: true,
        armRight: true,
        hat: true,
      });
      onCompleteLevel(stateRef.current.level);
      window.setTimeout(() => {
        setShowCelebration(true);
        setLightsActive(true);
        interactionRef.current.limbWaveTimeLeft = 3.0;
        interactionRef.current.lightPulseTimeLeft = 3.0;
        interactionRef.current.hopTimeLeft = 1.8;
        soundEngine.playVictoryFanfare();
        soundEngine.playRobotBipBop('lights');
        soundEngine.speak(
          'Parabéns! Seu amiguinho 3D está pronto e ganhou vida! Clique nele ao lado para acender as luzes, mexer os braços e ouvir bip bop buzzz!'
        );
      }, 650);
    } else {
      const partMeta = ALL_PART_SPECS.find((p) => p.id === partId);
      soundEngine.speak(`Conectado! Você encaixou ${partMeta?.spokenName || 'a peça'}!`);
    }
  };

  useEffect(() => {
    stateRef.current.level = level;
    stateRef.current.characterTheme = characterTheme;
    stateRef.current.placedSlots = placedSlots;
    stateRef.current.selectedPart = selectedPart;
    stateRef.current.hintPart = hintPart;
    stateRef.current.focusedPartId = focusedPartId;
    stateRef.current.freeConfig = freeConfig;
    stateRef.current.showCelebration = showCelebration;
    stateRef.current.lightsActive = lightsActive;
    stateRef.current.lightsColorIdx = lightsColorIdx;
    stateRef.current.onSnapPart = triggerSnapPart;
    stateRef.current.onSelectPart = (pId: RobotPartId) => {
      soundEngine.playTap();
      setSelectedPart(pId);
      const spec = ALL_PART_SPECS.find((s) => s.id === pId);
      if (spec) soundEngine.speak(`Arraste ou toque no pedestal central para conectar ${spec.spokenName}!`);
    };
    stateRef.current.onInteractAssembledPart = (pId: RobotPartId) => {
      if (pId === 'head' || pId === 'hat') {
        triggerRobotLights();
      } else {
        triggerRobotLimbs();
      }
    };
  });

  const initLevel = (lvl: 1 | 2 | 3) => {
    setPlacedSlots({
      legs: lvl === 3,
      body: lvl === 3,
      head: lvl === 3,
      armLeft: lvl === 3,
      armRight: lvl === 3,
      hat: lvl === 3,
    });
    setSelectedPart(null);
    setHintPart(null);
    setShowCelebration(false);
    setLightsActive(lvl === 3);
    setRobotYawDeg(0);
    interactionRef.current.targetYawRad = 0;
    interactionRef.current.currentYawRad = 0;

    if (lvl === 1) {
      soundEngine.speak(
        'O Robô Bit está desmontado na bancada 3D! Arraste as pernas, o tronco e a cabeça até o pedestal brilhante no centro!'
      );
    } else if (lvl === 2) {
      soundEngine.speak(
        'Agora temos seis peças tridimensionais na oficina! Conecte as pernas, o tronco, os dois braços, a cabeça e a antena!'
      );
    } else {
      soundEngine.speak(
        'Oficina de criação 3D! Troque as peças 3D e cores do seu robô e salve como seu mascote!'
      );
    }
  };

  useEffect(() => {
    if (!showIntro) {
      initLevel(level);
    }
  }, [level, characterTheme, showIntro]);

  // Inicialização da Cena 3D Interativa do Jogo 1
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
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 6.1);
    camera.lookAt(0, 0.95, 0.15);
    const currentLookAt = new THREE.Vector3(0, 0.95, 0.15);

    const { updateEnvironment } = buildStudioWorkshopEnvironment(scene, renderer, isSoftwareGl);
    const sparkManager = new SparkBurstManager(scene);
    const pointer3D = create3DPointerIndicator(scene);

    // Pedestal Dourado Central de Montagem
    const pedestalGroup = new THREE.Group();
    const pedDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.2, 0.18, 36),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.3, metalness: 0.7 })
    );
    pedDisc.position.y = 0.09;
    pedDisc.receiveShadow = true;
    const pedGlowRingMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.85,
    });
    const pedGlowRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.048, 14, 44),
      pedGlowRingMat
    );
    pedGlowRing.rotation.x = Math.PI / 2;
    pedGlowRing.position.y = 0.18;
    pedestalGroup.add(pedDisc, pedGlowRing);
    scene.add(pedestalGroup);

    // Luzes Dinâmicas do Robô (Acendem quando a criança clica no robô pronto!)
    const robotChestLight = new THREE.PointLight(0x38bdf8, 0, 4.5);
    robotChestLight.position.set(0, 1.45, 0.65);
    scene.add(robotChestLight);

    const robotAntennaLight = new THREE.PointLight(0xfacc15, 0, 4.5);
    robotAntennaLight.position.set(0, 2.75, 0.25);
    scene.add(robotAntennaLight);

    // Halo Luminoso Extra na Antena quando as luzes do robô estão acesas
    const antennaGlowBulbMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
    });
    const antennaGlowBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      antennaGlowBulbMat
    );
    antennaGlowBulb.position.set(0, 2.66, 0);
    scene.add(antennaGlowBulb);

    // Grupos para os Hologramas Guia (no centro) e para as Peças 3D Móveis
    const ghostsGroup = new THREE.Group();
    const movablePartsGroup = new THREE.Group();
    scene.add(ghostsGroup, movablePartsGroup);

    const partObjects: Record<
      RobotPartId,
      {
        meshGroup: THREE.Group;
        ghostGroup: THREE.Group;
        lockSpin: number;
      }
    > = {} as Record<
      RobotPartId,
      { meshGroup: THREE.Group; ghostGroup: THREE.Group; lockSpin: number }
    >;

    let builtSignature = '';
    const rebuildPartsIfNeeded = () => {
      const st = stateRef.current;
      const sig = `${st.level}-${st.characterTheme}-${st.freeConfig.headType}-${st.freeConfig.bodyType}-${st.freeConfig.legsType}-${st.freeConfig.hatType}-${st.freeConfig.primaryColor}`;
      if (sig === builtSignature) return;
      builtSignature = sig;

      while (ghostsGroup.children.length > 0) ghostsGroup.remove(ghostsGroup.children[0]);
      while (movablePartsGroup.children.length > 0)
        movablePartsGroup.remove(movablePartsGroup.children[0]);

      ALL_PART_SPECS.forEach((spec) => {
        const partStyle: CharacterStyle =
          st.level === 3
            ? spec.id === 'head'
              ? st.freeConfig.headType
              : spec.id === 'body' || spec.id === 'armLeft' || spec.id === 'armRight'
              ? st.freeConfig.bodyType
              : st.freeConfig.legsType
            : st.characterTheme;

        const ghost = build3DCharacterPart(
          spec.id,
          partStyle,
          st.freeConfig.primaryColor,
          st.freeConfig.accentColor,
          true
        );
        ghost.position.set(...spec.assembledPos);
        ghost.traverse((c) => {
          c.userData = { targetSlotId: spec.id };
        });
        ghostsGroup.add(ghost);

        const solid = build3DCharacterPart(
          spec.id,
          partStyle,
          st.freeConfig.primaryColor,
          st.freeConfig.accentColor,
          false
        );
        const isAlreadyPlaced = st.placedSlots[spec.id];
        if (isAlreadyPlaced) {
          solid.position.set(...spec.assembledPos);
        } else {
          solid.position.set(...spec.tablePos);
        }
        solid.traverse((c) => {
          c.userData = { partId: spec.id };
        });
        movablePartsGroup.add(solid);

        partObjects[spec.id] = {
          meshGroup: solid,
          ghostGroup: ghost,
          lockSpin: 0,
        };
      });
    };

    rebuildPartsIfNeeded();

    // Raycasting para Arrastar Peças 3D na Mesa OU Interagir/Girar o Robô Pronto!
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0.35, 1).normalize(), -0.2);
    const dragIntersect = new THREE.Vector3();
    let draggingPartId: RobotPartId | null = null;
    let isDraggingRobotSpin = false;
    let spinDragStartX = 0;
    let spinDragStartYaw = 0;
    let spinPointerMoved = false;
    let clickedAssembledPartId: RobotPartId | null = null;

    const getPointerNDC = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      getPointerNDC(e);
      raycaster.setFromCamera(pointer, camera);

      const partHits = raycaster.intersectObjects(movablePartsGroup.children, true);

      // MODO CELEBRAÇÃO OU NÍVEL 3: Clicar no robô montado acende luzes/mexe membros e arrastar gira um pouquinho!
      if (stateRef.current.showCelebration || stateRef.current.level === 3) {
        if (partHits.length > 0) {
          const hitId = partHits[0].object.userData?.partId as RobotPartId | undefined;
          clickedAssembledPartId = hitId || 'body';
          isDraggingRobotSpin = true;
          spinPointerMoved = false;
          spinDragStartX = e.clientX;
          spinDragStartYaw = interactionRef.current.targetYawRad;
          renderer.domElement.setPointerCapture(e.pointerId);
        }
        return;
      }

      // MODO MONTAGEM (Fases 1 e 2):
      // 1. Verifica se clicou em uma peça 3D ainda não encaixada
      if (partHits.length > 0) {
        const hitId = partHits[0].object.userData?.partId as RobotPartId | undefined;
        if (hitId && !stateRef.current.placedSlots[hitId]) {
          draggingPartId = hitId;
          stateRef.current.onSelectPart(hitId);
          renderer.domElement.setPointerCapture(e.pointerId);
          return;
        }
      }

      // 2. Se já tinha uma peça selecionada e tocou no holograma central ou pedestal, encaixa!
      const sel = stateRef.current.selectedPart;
      if (sel && !stateRef.current.placedSlots[sel]) {
        const ghostHits = raycaster.intersectObjects(
          [...ghostsGroup.children, ...pedestalGroup.children],
          true
        );
        if (ghostHits.length > 0) {
          const pObj = partObjects[sel];
          if (pObj) {
            pObj.lockSpin = Math.PI * 2;
            const spec = ALL_PART_SPECS.find((s) => s.id === sel)!;
            sparkManager.triggerBurst(new THREE.Vector3(...spec.assembledPos), '#FACC15');
          }
          stateRef.current.onSnapPart(sel);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      getPointerNDC(e);

      // Se está girando o robô pronto com o mouse/toque (rotação limitada a ±55°)
      if (isDraggingRobotSpin) {
        const dx = e.clientX - spinDragStartX;
        if (Math.abs(dx) > 6) {
          spinPointerMoved = true;
        }
        const maxRad = THREE.MathUtils.degToRad(55);
        const nextYaw = THREE.MathUtils.clamp(spinDragStartYaw + dx * 0.0085, -maxRad, maxRad);
        interactionRef.current.targetYawRad = nextYaw;
        return;
      }

      if (!draggingPartId) return;
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(dragPlane, dragIntersect)) {
        const obj = partObjects[draggingPartId]?.meshGroup;
        if (obj) {
          obj.position.x = THREE.MathUtils.clamp(dragIntersect.x, -3.1, 3.1);
          obj.position.y = THREE.MathUtils.clamp(dragIntersect.y + 0.4, 0.35, 2.8);
          obj.position.z = THREE.MathUtils.clamp(dragIntersect.z, -1.2, 2.0);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDraggingRobotSpin) {
        isDraggingRobotSpin = false;
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {
          // Ignora
        }
        // Se foi um clique rápido no robô pronto (sem arrastar), dispara Bip-Bop, luzes e movimento de membros!
        if (!spinPointerMoved && clickedAssembledPartId) {
          stateRef.current.onInteractAssembledPart(clickedAssembledPartId);
        } else if (spinPointerMoved) {
          soundEngine.playRobotBipBop('spin');
        }
        clickedAssembledPartId = null;
        return;
      }

      if (!draggingPartId) return;
      const pId = draggingPartId;
      draggingPartId = null;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora
      }

      const obj = partObjects[pId]?.meshGroup;
      const spec = ALL_PART_SPECS.find((s) => s.id === pId);
      if (obj && spec) {
        const targetVec = new THREE.Vector3(...spec.assembledPos);
        // Se soltou perto do corpo central, trava magneticamente!
        if (obj.position.distanceTo(targetVec) < 1.65 || Math.abs(obj.position.x) < 1.2) {
          partObjects[pId].lockSpin = Math.PI * 2;
          sparkManager.triggerBurst(targetVec, '#34D399');
          stateRef.current.onSnapPart(pId);
        }
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

      rebuildPartsIfNeeded();
      updateEnvironment(elapsed);
      sparkManager.update(dt);

      // Dispara faíscas 3D solicitadas pelos botões de interação do robô
      if (inter.triggerBurstRequest) {
        sparkManager.triggerBurst(
          new THREE.Vector3(...inter.triggerBurstRequest.pos),
          inter.triggerBurstRequest.color
        );
        inter.triggerBurstRequest = null;
      }

      // Atualiza timers de reação do robô
      inter.limbWaveTimeLeft = Math.max(0, inter.limbWaveTimeLeft - dt);
      inter.lightPulseTimeLeft = Math.max(0, inter.lightPulseTimeLeft - dt);
      inter.headNodTimeLeft = Math.max(0, inter.headNodTimeLeft - dt);
      inter.hopTimeLeft = Math.max(0, inter.hopTimeLeft - dt);
      inter.currentYawRad = THREE.MathUtils.damp(
        inter.currentYawRad,
        inter.targetYawRad,
        8,
        dt
      );

      // Enquadramento de Câmera: Quando a fase conclui (`showCelebration`), enquadra o robô na COLUNA ESQUERDA
      // para ficar lado a lado com o Box de Parabéns na coluna direita!
      const isWideViewport = (container?.clientWidth || window.innerWidth) >= 768;
      const targetCamPos =
        st.showCelebration && isWideViewport
          ? new THREE.Vector3(0.95, 2.35, 4.45)
          : st.showCelebration
          ? new THREE.Vector3(0, 2.55, 4.85)
          : new THREE.Vector3(0, 3.8, 6.1);

      const targetLookAt =
        st.showCelebration && isWideViewport
          ? new THREE.Vector3(1.05, 1.35, 0)
          : st.showCelebration
          ? new THREE.Vector3(0, 1.25, 0)
          : new THREE.Vector3(0, 0.95, 0.15);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 5, dt);

      currentLookAt.x = THREE.MathUtils.damp(currentLookAt.x, targetLookAt.x, 5, dt);
      currentLookAt.y = THREE.MathUtils.damp(currentLookAt.y, targetLookAt.y, 5, dt);
      currentLookAt.z = THREE.MathUtils.damp(currentLookAt.z, targetLookAt.z, 5, dt);
      camera.lookAt(currentLookAt);

      // Atualiza Luzes Interativas do Robô e Anel do Pedestal
      const activeLightColor = ROBOT_LIGHT_COLORS[st.lightsColorIdx] || ROBOT_LIGHT_COLORS[0];
      const isLightGlowing = st.lightsActive || inter.lightPulseTimeLeft > 0;
      const targetLightIntensity =
        inter.lightPulseTimeLeft > 0
          ? 2.8 + Math.sin(elapsed * 18) * 1.2
          : isLightGlowing
          ? 1.6 + Math.sin(elapsed * 5) * 0.4
          : 0;

      robotChestLight.color.setHex(activeLightColor.num);
      robotChestLight.intensity = THREE.MathUtils.damp(
        robotChestLight.intensity,
        targetLightIntensity,
        8,
        dt
      );
      robotAntennaLight.color.setHex(activeLightColor.num);
      robotAntennaLight.intensity = THREE.MathUtils.damp(
        robotAntennaLight.intensity,
        targetLightIntensity * 1.1,
        8,
        dt
      );

      antennaGlowBulbMat.color.setHex(activeLightColor.num);
      antennaGlowBulbMat.opacity = isLightGlowing
        ? 0.45 + Math.abs(Math.sin(elapsed * 10)) * 0.45
        : 0;

      pedGlowRingMat.color.set(activeLightColor.hex);
      pedGlowRingMat.emissive.set(activeLightColor.hex);
      pedGlowRingMat.emissiveIntensity = isLightGlowing
        ? 1.3 + Math.sin(elapsed * 8) * 0.45
        : 0.85;

      // Na comemoração todas as 6 partes do robô ficam visíveis para ele mexer os braços e acender a antena!
      const activeIds: RobotPartId[] =
        st.showCelebration || st.level !== 1
          ? ['legs', 'body', 'head', 'armLeft', 'armRight', 'hat']
          : ['legs', 'body', 'head'];

      const hopOffsetY =
        inter.hopTimeLeft > 0 ? Math.abs(Math.sin(elapsed * 11)) * 0.28 : 0;

      antennaGlowBulb.position.set(0, 2.68 + hopOffsetY, 0);

      ALL_PART_SPECS.forEach((spec, idx) => {
        const entry = partObjects[spec.id];
        if (!entry) return;

        const isVisibleInLevel = activeIds.includes(spec.id);
        const isPlaced = st.placedSlots[spec.id] || st.showCelebration;
        const isSelected = st.selectedPart === spec.id;
        const isHinted = st.hintPart === spec.id;

        entry.meshGroup.visible = isVisibleInLevel;
        entry.ghostGroup.visible =
          isVisibleInLevel && !isPlaced && st.level !== 3 && !st.showCelebration;

        if (!isVisibleInLevel) return;

        if (isPlaced) {
          // Posição montada ao redor do eixo Y do robô (permite girar os braços junto com o tronco quando o aluno gira o robô!)
          const basePos = new THREE.Vector3(...spec.assembledPos);
          basePos.applyAxisAngle(new THREE.Vector3(0, 1, 0), inter.currentYawRad);

          let extraY = hopOffsetY;
          let targetRotX = 0;
          let targetRotZ = 0;

          // Animações de membros quando o aluno clica em "Mexer Membros" ou clica no robô!
          if (inter.limbWaveTimeLeft > 0) {
            if (spec.id === 'armLeft') {
              targetRotZ = -0.85 - Math.sin(elapsed * 14) * 0.55;
              targetRotX = Math.cos(elapsed * 10) * 0.35;
              extraY += 0.12;
            } else if (spec.id === 'armRight') {
              targetRotZ = 0.85 + Math.sin(elapsed * 14 + Math.PI) * 0.55;
              targetRotX = -Math.cos(elapsed * 10) * 0.35;
              extraY += 0.12;
            } else if (spec.id === 'hat') {
              extraY += Math.abs(Math.sin(elapsed * 14)) * 0.14;
            }
          }

          if (inter.headNodTimeLeft > 0 && spec.id === 'head') {
            targetRotZ = Math.sin(elapsed * 12) * 0.18;
            targetRotX = Math.sin(elapsed * 8) * 0.16;
          }

          entry.meshGroup.position.x = THREE.MathUtils.damp(
            entry.meshGroup.position.x,
            basePos.x,
            12,
            dt
          );
          entry.meshGroup.position.y = THREE.MathUtils.damp(
            entry.meshGroup.position.y,
            basePos.y + extraY,
            12,
            dt
          );
          entry.meshGroup.position.z = THREE.MathUtils.damp(
            entry.meshGroup.position.z,
            basePos.z,
            12,
            dt
          );

          if (entry.lockSpin > 0.01) {
            entry.lockSpin = THREE.MathUtils.damp(entry.lockSpin, 0, 7, dt);
            entry.meshGroup.rotation.y = entry.lockSpin;
          } else {
            const extraHatSpin =
              spec.id === 'hat' && (inter.limbWaveTimeLeft > 0 || inter.lightPulseTimeLeft > 0)
                ? elapsed * 6
                : 0;
            entry.meshGroup.rotation.y = inter.currentYawRad + extraHatSpin;
          }

          entry.meshGroup.rotation.x = THREE.MathUtils.damp(
            entry.meshGroup.rotation.x,
            targetRotX,
            10,
            dt
          );
          entry.meshGroup.rotation.z = THREE.MathUtils.damp(
            entry.meshGroup.rotation.z,
            targetRotZ,
            10,
            dt
          );
          entry.meshGroup.scale.setScalar(THREE.MathUtils.damp(entry.meshGroup.scale.x, 1, 8, dt));
        } else if (draggingPartId !== spec.id) {
          // Repousando na mesa 3D com flutuação suave se selecionada ou com dica
          const hoverLift = isSelected || isHinted ? 0.35 + Math.sin(elapsed * 6) * 0.1 : 0;
          entry.meshGroup.position.x = THREE.MathUtils.damp(
            entry.meshGroup.position.x,
            spec.tablePos[0],
            7,
            dt
          );
          entry.meshGroup.position.y = THREE.MathUtils.damp(
            entry.meshGroup.position.y,
            spec.tablePos[1] + hoverLift,
            7,
            dt
          );
          entry.meshGroup.position.z = THREE.MathUtils.damp(
            entry.meshGroup.position.z,
            spec.tablePos[2],
            7,
            dt
          );
          entry.meshGroup.rotation.y =
            isSelected || isHinted
              ? elapsed * 2.2
              : Math.sin(elapsed * 1.2 + idx) * 0.25;
          entry.meshGroup.rotation.x = 0;
          entry.meshGroup.rotation.z = 0;
          const targetScale = isSelected || isHinted ? 1.18 : 0.95;
          entry.meshGroup.scale.setScalar(
            THREE.MathUtils.damp(entry.meshGroup.scale.x, targetScale, 8, dt)
          );
        }

        // Pulsa o holograma guia correspondente
        const ghostScale = isSelected || isHinted ? 1.06 + Math.sin(elapsed * 8) * 0.05 : 1.0;
        entry.ghostGroup.scale.setScalar(ghostScale);
      });

      // Atualiza Seta Guia Dourada 3D apenas durante a montagem
      const focusId = st.focusedPartId;
      if (!st.showCelebration && st.level !== 3 && focusId && !st.placedSlots[focusId]) {
        const spec = ALL_PART_SPECS.find((s) => s.id === focusId);
        if (spec) {
          if (st.selectedPart === focusId) {
            pointer3D.update(
              elapsed,
              new THREE.Vector3(spec.assembledPos[0], spec.assembledPos[1] + 0.55, spec.assembledPos[2]),
              true,
              0x38bdf8
            );
          } else {
            pointer3D.update(
              elapsed,
              new THREE.Vector3(spec.tablePos[0], spec.tablePos[1] + 0.65, spec.tablePos[2]),
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
    const missingId = activePartIds.find((id) => !placedSlots[id]);
    if (!missingId) return;
    setSelectedPart(missingId);
    setHintPart(missingId);
    const spec = ALL_PART_SPECS.find((s) => s.id === missingId);
    soundEngine.speak(
      `Dica do Bit: Veja ${spec?.spokenName} flutuando na mesa! Toque no botão Conectar ou arraste até o centro!`
    );
  };

  const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 100) / 20}%`,
    delay: `${(i % 6) * 0.15}s`,
    color: ['#FBBF24', '#38BDF8', '#34D399', '#F472B6', '#A78BFA'][i % 5],
  }));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* PALCO 3D EM TELA CHEIA (100vw x 100vh) */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* BARRA SUPERIOR PERIMETRAL FLUTUANTE */}
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
              Monte o Amiguinho 3D
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="text-xs text-sky-400 font-semibold">Decomposição</span>
          </div>
        </div>

        {/* Seletor de Fases e Personagem */}
        <div className="pointer-events-auto flex items-center gap-2">
          {([1, 2, 3] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                soundEngine.playTap();
                setLevel(lvl);
              }}
              className={`hc-button min-h-[48px] px-4 rounded-2xl font-bold text-xs shadow-xl transition-transform active:scale-95 ${
                level === lvl
                  ? 'bg-sky-500 text-slate-950 border-2 border-white'
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
              if (level === 1) {
                soundEngine.speakManual(
                  'O Robô Bit está desmontado na bancada 3D! Arraste as pernas, o tronco e a cabeça até o pedestal brilhante no centro!'
                );
              } else if (level === 2) {
                soundEngine.speakManual(
                  'Agora temos seis peças tridimensionais na oficina! Conecte as pernas, o tronco, os dois braços, a cabeça e a antena!'
                );
              } else {
                soundEngine.speakManual(
                  'Oficina de criação 3D! Troque as peças 3D e cores do seu robô e salve como seu mascote!'
                );
              }
            }}
            className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 shadow-xl"
            title="Ouvir instrução novamente"
          >
            <Volume2 className="w-5 h-5 text-sky-400" />
            <span className="hidden sm:inline">Ouvir</span>
          </button>

          {level !== 3 && !showCelebration && (
            <button
              type="button"
              onClick={handleHint}
              className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-amber-500/95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xl"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Dica</span>
            </button>
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

      {/* BANNER VISUAL DE FOCO DA PEÇA ATUAL (Durante a montagem) */}
      {level !== 3 && !showCelebration && focusedPartSpec && (
        <div className="pointer-events-none fixed top-18 inset-x-0 z-10 flex justify-center px-3">
          <div className="pointer-events-auto rounded-2xl bg-slate-900/95 border-2 border-sky-400 px-4 py-1.5 shadow-2xl flex items-center gap-2.5 animate-guide-glow">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs md:text-sm font-bold text-white">
              Peça da vez: <span className="text-amber-300">{focusedPartSpec.label}</span> — Arraste na mesa 3D até o centro ou toque no botão abaixo!
            </span>
          </div>
        </div>
      )}

      {/* PAINEL INFERIOR ARRASTÁVEL E MINIMIZÁVEL (Durante a montagem ou Fase 3) */}
      {!showCelebration && (
        <DraggableMinimizableDock
          title={
            level !== 3
              ? `Peças do Amiguinho 3D (${placedCount}/${activePartIds.length} conectadas)`
              : 'Oficina de Criação 3D — Personalize e Interaja com seu Robô'
          }
          minimizedLabel="Mostrar Peças do Amiguinho 3D"
        >
          {level !== 3 ? (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Troca de Personagem 3D */}
              <div className="flex items-center gap-1.5">
                {(['robot', 'bunny', 'astronaut'] as CharacterStyle[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      setCharacterTheme(st);
                    }}
                    className={`min-h-[46px] px-3 rounded-2xl text-xs font-bold border transition-transform active:scale-95 ${
                      characterTheme === st
                        ? 'bg-sky-500/25 border-sky-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {st === 'robot' ? '🤖 Robô' : st === 'bunny' ? '🐰 Coelho' : '👩‍🚀 Astro'}
                  </button>
                ))}
              </div>

              {/* Botões de Conectar Direto as Peças 3D */}
              <div className="flex flex-wrap items-center gap-2">
                {ALL_PART_SPECS.filter((s) => activePartIds.includes(s.id)).map((spec) => {
                  const done = placedSlots[spec.id];
                  const isCurrent = focusedPartId === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      disabled={done}
                      onMouseEnter={() => soundEngine.speakHover(spec.label)}
                      onClick={() => triggerSnapPart(spec.id)}
                      className={`hc-button min-h-[46px] px-3.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                        done
                          ? 'bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 opacity-60'
                          : isCurrent
                          ? 'bg-amber-400 text-slate-950 scale-105 shadow-lg animate-guide-glow'
                          : 'bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-white border border-slate-700'
                      }`}
                    >
                      <span>{done ? '✓' : '🔧'}</span>
                      <span>{spec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* DOCK DO NÍVEL 3: Personalizar Peças 3D, Testar Luzes/Membros e Salvar */
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMechanicalAttach();
                    const styles: CharacterStyle[] = ['robot', 'bunny', 'astronaut'];
                    const colors = ['#38BDF8', '#34D399', '#A855F7', '#F472B6', '#FB923C'];
                    setFreeConfig((c) => ({
                      ...c,
                      headType: styles[Math.floor(Math.random() * styles.length)],
                      bodyType: styles[Math.floor(Math.random() * styles.length)],
                      legsType: styles[Math.floor(Math.random() * styles.length)],
                      primaryColor: colors[Math.floor(Math.random() * colors.length)],
                    }));
                  }}
                  className="hc-button min-h-[48px] px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-2"
                >
                  <Shuffle className="w-5 h-5" />
                  <span>Misturar Peças 3D</span>
                </button>

                <button
                  type="button"
                  onClick={triggerRobotLights}
                  className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-sky-500/20 border border-sky-400 text-sky-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  <span>Bip-Bop Luzes</span>
                </button>

                <button
                  type="button"
                  onClick={triggerRobotLimbs}
                  className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-purple-500/20 border border-purple-400 text-purple-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Mexer Braços</span>
                </button>

                {['#38BDF8', '#34D399', '#A855F7', '#F472B6', '#FB923C'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      soundEngine.playTap();
                      setFreeConfig((c) => ({ ...c, primaryColor: hex }));
                    }}
                    style={{ backgroundColor: hex }}
                    className={`w-10 h-10 rounded-2xl border-2 transition-transform ${
                      freeConfig.primaryColor === hex ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    aria-label={`Pintar robô de ${hex}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onRecordAttempt();
                  onSaveCustomAvatar(freeConfig);
                  onCompleteLevel(3);
                  setShowCelebration(true);
                  triggerRobotLimbs();
                }}
                className="hc-button min-h-[48px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg"
              >
                <Check className="w-5 h-5" />
                <span>Salvar Meu Robô 3D!</span>
              </button>
            </div>
          )}
        </DraggableMinimizableDock>
      )}

      {/* =====================================================================
          CELEBRAÇÃO EM DUAS COLUNAS (ROBÔ 3D INTERATIVO À ESQUERDA + BOX DE PARABÉNS À DIREITA)
          Sem fundo escuro tapando o robô! O aluno vê e brinca com o robô pronto!
         ===================================================================== */}
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col md:flex-row items-center justify-between p-4 md:px-8 lg:px-14 pt-20 pb-6 gap-4">
          {/* Confete festivo caindo suavemente */}
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

          {/* COLUNA 1 (ESQUERDA): Palco Interativo do Robô 3D Pronto (Vazio no meio para clicar direto no Robô 3D, com controles embaixo!) */}
          <div className="w-full md:w-7/12 h-full flex flex-col justify-between items-center py-2">
            {/* Dica Flutuante no Topo da Coluna do Robô */}
            <div className="pointer-events-auto hc-surface rounded-2xl bg-slate-900/95 border-2 border-sky-400 px-4 py-2 shadow-2xl flex items-center gap-2.5 animate-guide-glow">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs md:text-sm font-extrabold text-white">
                {robotFeedbackText}
              </span>
            </div>

            {/* Espaço central livre para a criança clicar ou arrastar diretamente o Robô 3D! */}
            <div className="flex-1" />

            {/* Barra de Controles de Brincar com o Robô 3D Pronto */}
            <div className="pointer-events-auto hc-surface w-full max-w-xl rounded-3xl bg-slate-900/95 border-2 border-slate-700 p-3 shadow-2xl flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={triggerRobotLights}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Lightbulb className="w-5 h-5" />
                <span>Acender Luzes & Bip-Bop!</span>
              </button>

              <button
                type="button"
                onClick={triggerRobotLimbs}
                className="hc-button min-h-[48px] px-4 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Zap className="w-5 h-5" />
                <span>Mexer Membros & Buzzz!</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => rotateRobotLimited(-22)}
                  disabled={robotYawDeg <= -45}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar um pouquinho para a esquerda"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>Girar Esq.</span>
                </button>

                <span className="text-[11px] font-mono text-amber-300 px-1.5 tabular-nums">
                  {robotYawDeg > 0 ? `+${robotYawDeg}°` : `${robotYawDeg}°`}
                </span>

                <button
                  type="button"
                  onClick={() => rotateRobotLimited(22)}
                  disabled={robotYawDeg >= 45}
                  className="hc-button min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar um pouquinho para a direita"
                >
                  <span>Girar Dir.</span>
                  <RotateCw className="w-4 h-4 text-sky-400" />
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
              “Todas as peças 3D se encaixaram com perfeição e seu amiguinho ganhou vida! Brinque com ele ao lado antes de avançar!”
            </p>

            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 mb-5 text-left text-xs text-slate-300 space-y-1">
              <div className="font-bold text-sky-300 flex items-center gap-1.5">
                <span>🤖</span>
                <span>Experimente no Robô 3D ao lado:</span>
              </div>
              <p>• Clique na <strong>cabeça ou antena</strong> para acender as luzes;</p>
              <p>• Clique nos <strong>braços ou tronco</strong> para ele dançar e fazer <em>Bip-Bop-Buzzz!</em></p>
              <p>• Arraste de leve para os lados para <strong>girar um pouquinho</strong>.</p>
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
                    initLevel(level);
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
          title="Monte o Amiguinho 3D"
          pilarLabel="Decomposição"
          bnccCode="EI03CO01 · EI03CO02"
          spokenIntro="As peças tridimensionais do nosso robô estão espalhadas na mesa! Arraste as pernas, o tronco e a cabeça até o centro para conectá-las!"
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
