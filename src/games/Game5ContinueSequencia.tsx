import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Volume2, HelpCircle, Home, Sparkles, Check } from 'lucide-react';
import { CustomAvatarConfig } from '../utils/storage';
import { GameIntroModal, CelebrationOverlay } from '../components/GameIntroModal';
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
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [roundIdx, setRoundIdx] = useState(0);
  const [solvedChoiceIdx, setSolvedChoiceIdx] = useState<number | null>(null);
  const [hintActive, setHintActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const sparksRef = useRef<SparkBurstManager | null>(null);
  const optionGroupsRef = useRef<THREE.Group[]>([]);
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
    launchAnimRef.current = null;
  }, [level, showIntro]);

  useEffect(() => {
    if (showIntro) return;
    soundEngine.speak(currentRound.spokenRule);
  }, [roundIdx, level, showIntro]);

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

    const railBase = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.14, 1.15),
      new THREE.MeshPhysicalMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.4,
        clearcoat: 0.8,
      })
    );
    railBase.position.set(0, 0.07, -0.45);
    railBase.receiveShadow = true;
    railGroup.add(railBase);

    const goldBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 5.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.88 })
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
      railGroup.add(base);

      const trim = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.025, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 })
      );
      trim.rotation.x = Math.PI / 2;
      trim.position.set(ox, 0.15, oz);
      railGroup.add(trim);

      const optObj = create3DTokenObject(opt);
      optObj.position.set(ox, 0.56, oz);
      optObj.userData = { optionIndex: idx };
      scene.add(optObj);
      optionGroupsRef.current.push(optObj);
    });

    // Raycaster para clicar nas peças 3D
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

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

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let reqId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      env.update(elapsed);
      sparks.update(dt);

      ringHolo.position.y = 0.34 + Math.sin(elapsed * 5) * 0.06;
      ringHolo.rotation.z = elapsed * 1.5;

      seqTokens.forEach((tok, idx) => {
        tok.rotation.y = Math.sin(elapsed * 1.6 + idx * 0.6) * 0.35;
        tok.position.y = 0.56 + Math.sin(elapsed * 2.5 + idx * 0.8) * 0.04;
      });

      optionGroupsRef.current.forEach((optObj, idx) => {
        if (launchAnimRef.current && launchAnimRef.current.optionIndex === idx) {
          const anim = launchAnimRef.current;
          anim.progress = Math.min(1, anim.progress + dt * 2.4);
          const t = anim.progress;
          optObj.position.lerpVectors(anim.startPos, anim.targetPos, t);
          optObj.position.y += Math.sin(t * Math.PI) * 1.15;
          optObj.rotation.y += dt * 10;
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
            onClick={() => soundEngine.speak(currentRound.spokenRule)}
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
        </div>
      </header>

      {/* Dock Flutuante Inferior Arrastável e Minimizável com as 3 Opções 3D */}
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

      {showCelebration && (
        <CelebrationOverlay
          levelCompleted={level}
          message="Você descobriu todos os padrões 3D de cores, tamanhos e sons!"
          onNextLevel={
            level < 3
              ? () => {
                  setLevel((level + 1) as 1 | 2 | 3);
                  setShowCelebration(false);
                }
              : undefined
          }
          onReplay={() => {
            setRoundIdx(0);
            setSolvedChoiceIdx(null);
            setShowCelebration(false);
          }}
          onBackHub={onBackHub}
        />
      )}
    </div>
  );
};
