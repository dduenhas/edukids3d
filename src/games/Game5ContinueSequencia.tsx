import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Volume2,
  HelpCircle,
  Home,
  Sparkles,
  Check,
  Settings,
  Star,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { CustomAvatarConfig } from '../utils/storage';
import { GameIntroModal } from '../components/GameIntroModal';
import { DraggableMinimizableDock } from '../components/DraggableMinimizableDock';
import { soundEngine } from '../utils/soundAndSpeech';
import {
  buildStudioWorkshopEnvironment,
  SparkBurstManager,
} from '../utils/threeEnvironment';

interface Game5Props {
  starsEarned: [boolean, boolean, boolean];
  avatarConfig: CustomAvatarConfig;
  isSpeaking: boolean;
  onCompleteLevel: (level: 1 | 2 | 3) => void;
  onRecordAttempt: () => void;
  onRecordHint: () => void;
  onBackHub: () => void;
  onOpenSettings?: () => void;
}

type TokenShape = 'sphere' | 'cube' | 'star' | 'pyramid' | 'cat' | 'dog' | 'frog';

interface PatternToken {
  id: string;
  label: string;
  shape: TokenShape;
  color: number;
  cssColor: string;
  scale: number;
  soundType?: 'cat' | 'dog' | 'frog';
}

interface SequenceRound {
  id: string;
  title: string;
  spokenRule: string;
  sequence: PatternToken[];
  options: PatternToken[];
  correctOptionIndex: number;
}

const LEVEL_ROUNDS: Record<1 | 2 | 3, SequenceRound[]> = {
  1: [
    {
      id: 'l1_r1',
      title: 'Padrão AB: Esfera Vermelha e Cubo Azul',
      spokenRule:
        'Olhe o trilho dourado 3D: Esfera Vermelha, Cubo Azul, Esfera Vermelha, Cubo Azul, Esfera Vermelha... Qual peça 3D vem agora?',
      sequence: [
        { id: 's1', label: 'Esfera Vermelha', shape: 'sphere', color: 0xef4444, cssColor: '#EF4444', scale: 1 },
        { id: 's2', label: 'Cubo Azul', shape: 'cube', color: 0x38bdf8, cssColor: '#38BDF8', scale: 1 },
        { id: 's3', label: 'Esfera Vermelha', shape: 'sphere', color: 0xef4444, cssColor: '#EF4444', scale: 1 },
        { id: 's4', label: 'Cubo Azul', shape: 'cube', color: 0x38bdf8, cssColor: '#38BDF8', scale: 1 },
        { id: 's5', label: 'Esfera Vermelha', shape: 'sphere', color: 0xef4444, cssColor: '#EF4444', scale: 1 },
      ],
      options: [
        { id: 'o1', label: 'Cubo Azul', shape: 'cube', color: 0x38bdf8, cssColor: '#38BDF8', scale: 1 },
        { id: 'o2', label: 'Esfera Vermelha', shape: 'sphere', color: 0xef4444, cssColor: '#EF4444', scale: 1 },
        { id: 'o3', label: 'Pirâmide Verde', shape: 'pyramid', color: 0x22c55e, cssColor: '#22C55E', scale: 1 },
      ],
      correctOptionIndex: 0,
    },
    {
      id: 'l1_r2',
      title: 'Padrão AB: Estrela Dourada e Pirâmide Verde',
      spokenRule:
        'Estrela Dourada, Pirâmide Verde, Estrela Dourada, Pirâmide Verde... Qual peça completa o altar?',
      sequence: [
        { id: 's1', label: 'Estrela Dourada', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
        { id: 's2', label: 'Pirâmide Verde', shape: 'pyramid', color: 0x22c55e, cssColor: '#22C55E', scale: 1 },
        { id: 's3', label: 'Estrela Dourada', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
        { id: 's4', label: 'Pirâmide Verde', shape: 'pyramid', color: 0x22c55e, cssColor: '#22C55E', scale: 1 },
      ],
      options: [
        { id: 'o1', label: 'Cubo Azul', shape: 'cube', color: 0x38bdf8, cssColor: '#38BDF8', scale: 1 },
        { id: 'o2', label: 'Estrela Dourada', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
        { id: 'o3', label: 'Pirâmide Verde', shape: 'pyramid', color: 0x22c55e, cssColor: '#22C55E', scale: 1 },
      ],
      correctOptionIndex: 1,
    },
  ],
  2: [
    {
      id: 'l2_r1',
      title: 'Padrão de Tamanhos 3D: Grande e Pequeno',
      spokenRule:
        'Repare no tamanho das joias 3D: Esfera Grande, Esfera Pequena, Esfera Grande, Esfera Pequena... Qual vem agora?',
      sequence: [
        { id: 's1', label: 'Esfera Grande Rosa', shape: 'sphere', color: 0xf472b6, cssColor: '#F472B6', scale: 1.28 },
        { id: 's2', label: 'Esfera Pequena Rosa', shape: 'sphere', color: 0xf472b6, cssColor: '#F472B6', scale: 0.68 },
        { id: 's3', label: 'Esfera Grande Rosa', shape: 'sphere', color: 0xf472b6, cssColor: '#F472B6', scale: 1.28 },
        { id: 's4', label: 'Esfera Pequena Rosa', shape: 'sphere', color: 0xf472b6, cssColor: '#F472B6', scale: 0.68 },
      ],
      options: [
        { id: 'o1', label: 'Esfera Grande Rosa', shape: 'sphere', color: 0xf472b6, cssColor: '#F472B6', scale: 1.28 },
        { id: 'o2', label: 'Esfera Pequena Rosa', shape: 'sphere', color: 0xf472b6, cssColor: '#F472B6', scale: 0.68 },
        { id: 'o3', label: 'Cubo Azul', shape: 'cube', color: 0x38bdf8, cssColor: '#38BDF8', scale: 1 },
      ],
      correctOptionIndex: 0,
    },
    {
      id: 'l2_r2',
      title: 'Padrão AAB: Duas Estrelas e Um Cubo',
      spokenRule:
        'Olhe com atenção: Estrela, Estrela, Cubo... Estrela, Estrela... O que vem depois das duas estrelas?',
      sequence: [
        { id: 's1', label: 'Estrela Amarela', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
        { id: 's2', label: 'Estrela Amarela', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
        { id: 's3', label: 'Cubo Roxo', shape: 'cube', color: 0xa855f7, cssColor: '#A855F7', scale: 1 },
        { id: 's4', label: 'Estrela Amarela', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
        { id: 's5', label: 'Estrela Amarela', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
      ],
      options: [
        { id: 'o1', label: 'Estrela Amarela', shape: 'star', color: 0xfacc15, cssColor: '#FACC15', scale: 1 },
        { id: 'o2', label: 'Cubo Roxo', shape: 'cube', color: 0xa855f7, cssColor: '#A855F7', scale: 1 },
        { id: 'o3', label: 'Pirâmide Verde', shape: 'pyramid', color: 0x22c55e, cssColor: '#22C55E', scale: 1 },
      ],
      correctOptionIndex: 1,
    },
  ],
  3: [
    {
      id: 'l3_r1',
      title: 'Sequência Sonora dos Bichinhos 3D!',
      spokenRule:
        'Escute os bichinhos 3D: Gatinho Miau, Cachorrinho Au Au, Sapinho Webit... Gatinho Miau, Cachorrinho Au Au... Quem vem agora?',
      sequence: [
        { id: 's1', label: 'Gatinho (Miau)', shape: 'cat', color: 0xf472b6, cssColor: '#F472B6', scale: 1, soundType: 'cat' },
        { id: 's2', label: 'Cachorrinho (Au Au)', shape: 'dog', color: 0xfb923c, cssColor: '#FB923C', scale: 1, soundType: 'dog' },
        { id: 's3', label: 'Sapinho (Coaxar)', shape: 'frog', color: 0x22c55e, cssColor: '#22C55E', scale: 1, soundType: 'frog' },
        { id: 's4', label: 'Gatinho (Miau)', shape: 'cat', color: 0xf472b6, cssColor: '#F472B6', scale: 1, soundType: 'cat' },
        { id: 's5', label: 'Cachorrinho (Au Au)', shape: 'dog', color: 0xfb923c, cssColor: '#FB923C', scale: 1, soundType: 'dog' },
      ],
      options: [
        { id: 'o1', label: 'Gatinho (Miau)', shape: 'cat', color: 0xf472b6, cssColor: '#F472B6', scale: 1, soundType: 'cat' },
        { id: 'o2', label: 'Sapinho (Coaxar)', shape: 'frog', color: 0x22c55e, cssColor: '#22C55E', scale: 1, soundType: 'frog' },
        { id: 'o3', label: 'Cachorrinho (Au Au)', shape: 'dog', color: 0xfb923c, cssColor: '#FB923C', scale: 1, soundType: 'dog' },
      ],
      correctOptionIndex: 1,
    },
  ],
};

function create3DTokenObject(token: PatternToken): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: token.color,
    roughness: 0.2,
    metalness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  if (token.shape === 'sphere') {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 28), mat);
    mesh.castShadow = true;
    group.add(mesh);
  } else if (token.shape === 'cube') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), mat);
    mesh.castShadow = true;
    group.add(mesh);
  } else if (token.shape === 'pyramid') {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.62, 4), mat);
    mesh.castShadow = true;
    group.add(mesh);
  } else if (token.shape === 'star') {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), mat);
    mesh.castShadow = true;
    group.add(mesh);
  } else if (token.shape === 'cat' || token.shape === 'dog' || token.shape === 'frog') {
    // Miniatura 3D fofa de bichinho com olhos e orelhas
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), mat);
    head.castShadow = true;
    group.add(head);

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    [-0.11, 0.11].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), eyeWhiteMat);
      eye.position.set(ex, 0.08, 0.25);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), pupilMat);
      pupil.position.set(ex, 0.08, 0.29);
      group.add(eye, pupil);
    });

    if (token.shape === 'cat') {
      [-0.16, 0.16].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), mat);
        ear.position.set(ex, 0.32, 0);
        ear.rotation.z = ex < 0 ? 0.25 : -0.25;
        group.add(ear);
      });
    } else if (token.shape === 'dog') {
      [-0.25, 0.25].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.16), mat);
        ear.position.set(ex, 0.05, 0.04);
        ear.rotation.z = ex < 0 ? 0.35 : -0.35;
        group.add(ear);
      });
    } else if (token.shape === 'frog') {
      [-0.14, 0.14].forEach((ex) => {
        const bump = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), mat);
        bump.position.set(ex, 0.26, 0.12);
        group.add(bump);
      });
    }
  }

  group.scale.setScalar(token.scale);
  return group;
}

export const Game5ContinueSequencia: React.FC<Game5Props> = ({
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
  const [roundIdx, setRoundIdx] = useState(0);
  const [solvedChoiceIdx, setSolvedChoiceIdx] = useState<number | null>(null);
  const [hintActive, setHintActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationFeedback, setCelebrationFeedback] = useState(
    'Toque nas peças do Trilho Dourado 3D para ouvir a sinfonia do padrão, criar ondas ou girar!'
  );
  const [celebrationAngleDeg, setCelebrationAngleDeg] = useState(0);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const sparksRef = useRef<SparkBurstManager | null>(null);
  const optionGroupsRef = useRef<THREE.Group[]>([]);
  const optionsTrayGroupRef = useRef<THREE.Group | null>(null);
  const seqTokensRef = useRef<THREE.Group[]>([]);
  const showCelebrationRef = useRef(false);
  showCelebrationRef.current = showCelebration;
  const solvedChoiceIdxRef = useRef<number | null>(null);
  solvedChoiceIdxRef.current = solvedChoiceIdx;
  const railYawTargetRef = useRef(0);
  const waveTimeRef = useRef(0);
  const glowColorIdxRef = useRef(0);

  const launchAnimRef = useRef<{
    optionIndex: number;
    progress: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
  } | null>(null);

  const rounds = LEVEL_ROUNDS[level];
  const currentRound = rounds[roundIdx] || rounds[0];

  useEffect(() => {
    if (showIntro) return;
    setRoundIdx(0);
    setSolvedChoiceIdx(null);
    setHintActive(false);
    setShowCelebration(false);
    setCelebrationAngleDeg(0);
    railYawTargetRef.current = 0;
    waveTimeRef.current = 0;
    launchAnimRef.current = null;
  }, [level, showIntro]);

  useEffect(() => {
    if (showIntro) return;
    soundEngine.speak(currentRound.spokenRule);
  }, [roundIdx, level, showIntro]);

  const triggerRailWave = () => {
    waveTimeRef.current = performance.now() * 0.001;
    soundEngine.playSuccessSnap();
    sparksRef.current?.burst(new THREE.Vector3(-1.2, 0.85, -0.45), 0xa855f7);
    sparksRef.current?.burst(new THREE.Vector3(1.2, 0.85, -0.45), 0xfacc15);
    setCelebrationFeedback('Uau! As peças do padrão 3D fizeram uma onda sincronizada no trilho dourado!');
  };

  const triggerRailLightShow = () => {
    glowColorIdxRef.current += 1;
    soundEngine.playSparkle();
    const correctToken = currentRound.options[currentRound.correctOptionIndex];
    if (correctToken?.soundType) {
      soundEngine.playAnimalSound(correctToken.soundType);
    } else {
      soundEngine.playRobotBeepBop();
    }
    sparksRef.current?.burst(new THREE.Vector3(0, 0.9, -0.45), 0x38bdf8);
    setCelebrationFeedback('Luzes mágicas ativadas! O padrão completo brilha no altar 3D!');
  };

  const rotateRailBounded = (deltaRad: number) => {
    const next = THREE.MathUtils.clamp(railYawTargetRef.current + deltaRad, -0.78, 0.78);
    railYawTargetRef.current = next;
    setCelebrationAngleDeg(Math.round(THREE.MathUtils.radToDeg(next)));
    soundEngine.playTap();
  };

  const handleChooseOption = (optIdx: number) => {
    if (solvedChoiceIdx !== null) return;
    onRecordAttempt();

    const chosen = currentRound.options[optIdx];
    if (chosen.soundType) {
      soundEngine.playAnimalSound(chosen.soundType);
    } else {
      soundEngine.playTap();
    }

    if (optIdx === currentRound.correctOptionIndex) {
      setSolvedChoiceIdx(optIdx);
      soundEngine.playMechanicalAttach();

      const optGroup = optionGroupsRef.current[optIdx];
      const count = currentRound.sequence.length + 1;
      const spacing = 0.88;
      const startX = -((count - 1) * spacing) / 2;
      const slotX = startX + (count - 1) * spacing;

      if (optGroup) {
        launchAnimRef.current = {
          optionIndex: optIdx,
          progress: 0,
          startPos: optGroup.position.clone(),
          targetPos: new THREE.Vector3(slotX, 0.56, -0.45),
        };
      }

      setTimeout(() => {
        sparksRef.current?.burst(new THREE.Vector3(slotX, 0.6, -0.45), chosen.color);
      }, 420);

      setTimeout(() => {
        if (roundIdx + 1 < rounds.length) {
          soundEngine.playSuccessSnap();
          setSolvedChoiceIdx(null);
          launchAnimRef.current = null;
          setRoundIdx((r) => r + 1);
        } else {
          soundEngine.playVictoryFanfare();
          onCompleteLevel(level);
          waveTimeRef.current = performance.now() * 0.001;
          setShowCelebration(true);
        }
      }, 1350);
    } else {
      soundEngine.playGentleHint();
      soundEngine.speak(
        'Observe a ordem das peças no trilho dourado! Vamos tentar outra opção!'
      );
    }
  };

  const handleChooseRef = useRef(handleChooseOption);
  handleChooseRef.current = handleChooseOption;

  // Cena 3D Fullscreen
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 4.4, 5.5);
    camera.lookAt(0, 0.15, 0.1);
    const camLookTarget = new THREE.Vector3(0, 0.15, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const env = buildStudioWorkshopEnvironment(scene, renderer);
    const sparks = new SparkBurstManager(scene);
    sparksRef.current = sparks;

    // Trilho Dourado 3D para a sequência
    const railGroup = new THREE.Group();
    scene.add(railGroup);

    const railBaseMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.4,
      clearcoat: 0.8,
    });
    const railBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 1.15), railBaseMat);
    railBase.position.set(0, 0.07, -0.45);
    railBase.receiveShadow = true;
    railGroup.add(railBase);

    const goldBarMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.88,
      emissive: 0xd97706,
      emissiveIntensity: 0.15,
    });
    const goldBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 5.4, 16),
      goldBarMat
    );
    goldBar.rotation.z = Math.PI / 2;
    goldBar.position.set(0, 0.16, -0.45);
    railGroup.add(goldBar);

    // Pedestais das peças da sequência + pedestal "?" no final
    const seqTokens: THREE.Group[] = [];
    const count = currentRound.sequence.length + 1;
    const spacing = 0.88;
    const startX = -((count - 1) * spacing) / 2;

    currentRound.sequence.forEach((tok, idx) => {
      const x = startX + idx * spacing;
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.36, 0.12, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.5 })
      );
      ped.position.set(x, 0.18, -0.45);
      railGroup.add(ped);

      const tokObj = create3DTokenObject(tok);
      tokObj.position.set(x, 0.56, -0.45);
      tokObj.userData = { seqTokenIndex: idx, soundType: tok.soundType, label: tok.label };
      railGroup.add(tokObj);
      seqTokens.push(tokObj);
    });
    seqTokensRef.current = seqTokens;

    // Pedestal Dourado de Interrogação (?) para o último passo
    const targetSlotX = startX + (count - 1) * spacing;
    const targetPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.16, 28),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.2,
        metalness: 0.85,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
      })
    );
    targetPedestal.position.set(targetSlotX, 0.19, -0.45);
    railGroup.add(targetPedestal);

    const ringHolo = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.03, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    ringHolo.rotation.x = Math.PI / 2;
    ringHolo.position.set(targetSlotX, 0.32, -0.45);
    railGroup.add(ringHolo);

    // 3 Almofadas/Pedestais de escolha na frente da mesa
    const optionsTrayGroup = new THREE.Group();
    scene.add(optionsTrayGroup);
    optionsTrayGroupRef.current = optionsTrayGroup;

    optionGroupsRef.current = [];
    currentRound.options.forEach((opt, idx) => {
      const ox = (idx - 1) * 1.65;
      const oz = 1.05;

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.54, 0.16, 28),
        new THREE.MeshPhysicalMaterial({
          color: 0x0f172a,
          roughness: 0.25,
          metalness: 0.3,
          clearcoat: 0.8,
        })
      );
      base.position.set(ox, 0.08, oz);
      optionsTrayGroup.add(base);

      const trim = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.025, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 })
      );
      trim.rotation.x = Math.PI / 2;
      trim.position.set(ox, 0.15, oz);
      optionsTrayGroup.add(trim);

      const optObj = create3DTokenObject(opt);
      optObj.position.set(ox, 0.56, oz);
      optObj.userData = { optionIndex: idx, soundType: opt.soundType, label: opt.label };
      railGroup.add(optObj);
      optionGroupsRef.current.push(optObj);
    });

    // Raycaster para clicar nas peças 3D e girar o trilho na celebração
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDraggingShowcase = false;
    let dragStartX = 0;

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      if (showCelebrationRef.current) {
        isDraggingShowcase = true;
        dragStartX = e.clientX;
        const railHits = raycaster.intersectObjects(railGroup.children, true);
        if (railHits.length > 0) {
          waveTimeRef.current = performance.now() * 0.001;
          soundEngine.playSparkle();
          sparks.burst(railHits[0].point, 0xfacc15);
          setCelebrationFeedback('Onda mágica ativada no Trilho Dourado 3D!');
        }
        return;
      }

      const optHits = raycaster.intersectObjects(optionGroupsRef.current, true);
      if (optHits.length > 0) {
        let obj: THREE.Object3D | null = optHits[0].object;
        while (obj && obj.userData?.optionIndex === undefined) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.optionIndex !== undefined) {
          handleChooseRef.current(obj.userData.optionIndex);
          return;
        }
      }

      // Se clicar em uma peça do trilho, fala o nome ou toca o som do bichinho!
      const seqHits = raycaster.intersectObjects(seqTokens, true);
      if (seqHits.length > 0) {
        let obj: THREE.Object3D | null = seqHits[0].object;
        while (obj && obj.userData?.seqTokenIndex === undefined) {
          obj = obj.parent;
        }
        if (obj) {
          if (obj.userData.soundType) {
            soundEngine.playAnimalSound(obj.userData.soundType);
          } else {
            soundEngine.playTap();
          }
          soundEngine.speak(obj.userData.label);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!showCelebrationRef.current || !isDraggingShowcase) return;
      const dx = e.clientX - dragStartX;
      dragStartX = e.clientX;
      const next = THREE.MathUtils.clamp(railYawTargetRef.current + dx * 0.006, -0.78, 0.78);
      railYawTargetRef.current = next;
      setCelebrationAngleDeg(Math.round(THREE.MathUtils.radToDeg(next)));
    };

    const onPointerUp = () => {
      isDraggingShowcase = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let reqId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const nowSec = performance.now() * 0.001;
      const isCeleb = showCelebrationRef.current;

      env.update(elapsed);
      sparks.update(dt);

      // Na celebração, oculta as bases de opções frontais para destacar o trilho completo na Coluna Esquerda
      optionsTrayGroup.visible = !isCeleb;

      const glowColors = [0xd97706, 0x38bdf8, 0xa855f7, 0x10b981];
      goldBarMat.emissive.setHex(glowColors[glowColorIdxRef.current % glowColors.length]);
      goldBarMat.emissiveIntensity = isCeleb ? 0.45 + Math.sin(elapsed * 4) * 0.2 : 0.15;

      // Inclina e gira levemente o trilho dourado durante a celebração
      railGroup.position.y = THREE.MathUtils.lerp(railGroup.position.y, isCeleb ? 0.25 : 0, dt * 4);
      railGroup.rotation.x = THREE.MathUtils.lerp(railGroup.rotation.x, isCeleb ? 0.2 : 0, dt * 4);
      railGroup.rotation.y = THREE.MathUtils.lerp(
        railGroup.rotation.y,
        isCeleb ? railYawTargetRef.current : 0,
        dt * 6
      );

      // Enquadramento 2 Colunas: desloca câmera para a direita p/ exibir o Trilho 3D na Coluna Esquerda
      const isWide = (container.clientWidth || window.innerWidth) >= 768;
      const desiredCamPos = isCeleb
        ? isWide
          ? new THREE.Vector3(1.22, 3.65, 4.95)
          : new THREE.Vector3(0, 4.4, 5.8)
        : new THREE.Vector3(0, 4.4, 5.5);
      const desiredLook = isCeleb
        ? isWide
          ? new THREE.Vector3(1.22, 0.35, -0.45)
          : new THREE.Vector3(0, 0.35, -0.45)
        : new THREE.Vector3(0, 0.15, 0.1);

      camera.position.lerp(desiredCamPos, dt * 4);
      camLookTarget.lerp(desiredLook, dt * 4.5);
      camera.lookAt(camLookTarget);

      ringHolo.position.y = 0.34 + Math.sin(elapsed * 5) * 0.06;
      ringHolo.rotation.z = elapsed * 1.5;

      const waveAge = nowSec - waveTimeRef.current;

      seqTokens.forEach((tok, idx) => {
        let waveBump = 0;
        if (waveTimeRef.current > 0 && waveAge >= 0 && waveAge < 1.8) {
          const phase = waveAge * 6 - idx * 0.55;
          if (phase > 0 && phase < Math.PI) {
            waveBump = Math.sin(phase) * 0.42;
          }
        }
        tok.rotation.y = Math.sin(elapsed * 1.6 + idx * 0.6) * 0.35 + waveBump * 1.8;
        tok.position.y = 0.56 + Math.sin(elapsed * 2.5 + idx * 0.8) * 0.04 + waveBump;
      });

      optionGroupsRef.current.forEach((optObj, idx) => {
        if (isCeleb && idx !== solvedChoiceIdxRef.current) {
          optObj.visible = false;
          return;
        }
        optObj.visible = true;

        if (launchAnimRef.current && launchAnimRef.current.optionIndex === idx) {
          const anim = launchAnimRef.current;
          anim.progress = Math.min(1, anim.progress + dt * 2.4);
          const t = anim.progress;
          optObj.position.lerpVectors(anim.startPos, anim.targetPos, t);

          let waveBump = 0;
          if (isCeleb && waveTimeRef.current > 0 && waveAge >= 0 && waveAge < 1.8) {
            const phase = waveAge * 6 - seqTokens.length * 0.55;
            if (phase > 0 && phase < Math.PI) {
              waveBump = Math.sin(phase) * 0.42;
            }
          }

          optObj.position.y += Math.sin(t * Math.PI) * 1.15 + waveBump;
          optObj.rotation.y += dt * (t < 1 ? 10 : 1.5);
        } else {
          optObj.rotation.y = elapsed * 1.1 + idx;
          optObj.position.y = 0.56 + Math.sin(elapsed * 3 + idx) * 0.05;
        }
      });

      renderer.render(scene, camera);
      env.afterDraw();
    };

    animate();

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
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      sparks.dispose();
      env.dispose();
      renderer.dispose();
    };
  }, [level, roundIdx]);

  const handleHint = () => {
    onRecordHint();
    setHintActive(true);
    const correctToken = currentRound.options[currentRound.correctOptionIndex];
    soundEngine.playGentleHint();
    soundEngine.speak(
      `Dica do Bit: A próxima peça do padrão é ${correctToken.label}! Toque nela na frente da mesa!`
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* Cena 3D Fullscreen */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Header Flutuante Perimetral */}
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
            <Home className="w-5 h-5 text-purple-400" />
            <span className="hidden sm:inline">Início</span>
          </button>

          <div className="hc-surface px-4 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-xl flex items-center gap-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
              Jogo 5
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <h1 className="text-sm md:text-base font-bold font-display whitespace-nowrap">
              {currentRound.title}
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
                  ? 'bg-purple-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Fase {lvl} {starsEarned[lvl - 1] ? '⭐' : ''}
            </button>
          ))}
        </div>

        {/* Ouvir e Dica */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap();
              soundEngine.speakManual(currentRound.spokenRule);
            }}
            className="hc-button min-h-[48px] px-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 shadow-xl"
          >
            <Volume2 className="w-5 h-5 text-sky-400" />
            <span className="hidden md:inline">Ouvir</span>
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

      {/* Dock Flutuante Inferior Arrastável e Minimizável com as 3 Opções 3D (oculto na celebração) */}
      {!showCelebration && (
        <DraggableMinimizableDock
          title="Opções da Sequência 3D"
          minimizedLabel="Mostrar Opções da Sequência"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
              <span className="text-xs md:text-sm font-bold text-slate-200">
                Toque na peça 3D que completa o trilho dourado:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentRound.options.map((opt, idx) => {
                const isHintTarget = hintActive && idx === currentRound.correctOptionIndex;
                const isSolved = solvedChoiceIdx === idx;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseEnter={() => soundEngine.speakHover(opt.label)}
                    onClick={() => handleChooseOption(idx)}
                    className={`hc-button min-h-[46px] px-4 rounded-2xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all border-2 ${
                      isSolved
                        ? 'bg-emerald-500 text-slate-950 border-white scale-105'
                        : isHintTarget
                        ? 'bg-amber-400/25 border-amber-400 text-amber-200 animate-guide-glow'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: opt.cssColor }}
                    />
                    <span>{opt.label}</span>
                    {isSolved && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </DraggableMinimizableDock>
      )}

      {showIntro && (
        <GameIntroModal
          title="Continue a Sequência 3D"
          pilarLabel="Reconhecimento de Padrões"
          bnccCode="EI03CO01"
          spokenIntro="Descubra o segredo do trilho dourado 3D! Observe as cores, tamanhos e sons dos bichinhos e escolha qual peça vem depois!"
          currentLevel={level}
          starsEarned={starsEarned}
          avatarConfig={avatarConfig}
          isSpeaking={isSpeaking}
          onSelectLevel={(lvl) => setLevel(lvl)}
          onStartPlay={() => setShowIntro(false)}
        />
      )}

      {/* Vitrine 2 Colunas Lado a Lado: Trilho Dourado 3D Interativo (Esquerda) + Box de Parabéns (Direita) */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-40 pointer-events-none flex flex-col md:flex-row items-center justify-between p-4 md:px-8 md:pt-20 md:pb-6 gap-4"
          role="dialog"
          aria-modal="true"
          aria-label="Parabéns! Sequência 3D Concluída"
        >
          {/* Coluna Esquerda: Vitrine Interativa do Trilho Dourado 3D */}
          <div className="w-full md:w-7/12 h-full flex flex-col justify-between items-center py-2">
            <div className="pointer-events-auto hc-surface bg-slate-950/90 border-2 border-purple-400/70 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 max-w-lg">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
              <p className="text-xs md:text-sm font-extrabold text-purple-100">
                {celebrationFeedback}
              </p>
            </div>

            <div className="pointer-events-auto hc-surface bg-slate-950/92 border border-slate-700/90 rounded-3xl p-3 shadow-2xl flex flex-col items-center gap-2.5 max-w-xl w-full">
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  onClick={triggerRailLightShow}
                  className="hc-button min-h-[46px] px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Iluminar Trilho &amp; Sons!</span>
                </button>

                <button
                  type="button"
                  onClick={triggerRailWave}
                  className="hc-button min-h-[46px] px-4 rounded-2xl bg-purple-400 hover:bg-purple-300 text-slate-950 font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  <span>Onda no Padrão 3D!</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => rotateRailBounded(-0.26)}
                  className="hc-button min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar um pouquinho para a esquerda"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Girar Esq.</span>
                </button>

                <span className="text-[11px] font-mono font-bold text-amber-300 px-2 tabular-nums">
                  {celebrationAngleDeg}°
                </span>

                <button
                  type="button"
                  onClick={() => rotateRailBounded(0.26)}
                  className="hc-button min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1"
                  title="Girar um pouquinho para a direita"
                >
                  <span>Girar Dir.</span>
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400 -scale-x-100" />
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
              &ldquo;Você descobriu todos os padrões 3D de cores, tamanhos e sons! Veja e interaja com seu Trilho Dourado completo ao lado!&rdquo;
            </p>

            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 mb-5 text-left text-xs text-slate-300 space-y-1">
              <div className="font-extrabold text-purple-300">
                🔮 Experimente no Trilho 3D ao lado:
              </div>
              <p>• Toque nas <strong>peças 3D do trilho</strong> para disparar uma onda mágica;</p>
              <p>• Clique em <strong>Iluminar Trilho &amp; Sons</strong> para ver o brilho;</p>
              <p>• Arraste levemente para os lados para <strong>girar um pouquinho (±45°)</strong>.</p>
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
                    setRoundIdx(0);
                    setSolvedChoiceIdx(null);
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

