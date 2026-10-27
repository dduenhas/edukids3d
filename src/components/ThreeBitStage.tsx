import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  detectSoftwareGl,
  buildStudioWorkshopEnvironment,
  SparkBurstManager,
} from '../utils/threeEnvironment';
import { GameId } from '../utils/storage';

export interface RobotGridState {
  gridSize: number;
  robotPos: { x: number; z: number };
  robotDir: 0 | 1 | 2 | 3; // 0: Norte (-Z), 1: Leste (+X), 2: Sul (+Z), 3: Oeste (-X)
  starPos: { x: number; z: number };
  obstacles: Array<{ x: number; z: number }>;
  isCelebrating?: boolean;
  isErrorBounce?: boolean;
}

interface ThreeBitStageProps {
  mode: 'hub' | 'robot-grid';
  cameraPreset?: 'front' | 'top' | 'iso';
  isSpeaking?: boolean;
  primaryColor?: string;
  accentColor?: string;
  gridState?: RobotGridState;
  showcaseSplitView?: boolean;
  showcaseYawDeg?: number;
  showcasePulseCount?: number;
  onRobotClick?: () => void;
  onSelectHubGame?: (gameId: GameId) => void;
  onHoverHubGame?: (gameId: GameId | null) => void;
  onTileClick?: (x: number, z: number) => void;
  className?: string;
}

const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.7, 0);
const _burstOrigin = new THREE.Vector3();

/**
 * Palco 3D Principal (Hub Interativo com 6 Miniaturas 3D na Mesa de Mármore e Ouro +
 * Tabuleiro 3D do Jogo Bônus "Programe o Robô Bit").
 */
export const ThreeBitStage: React.FC<ThreeBitStageProps> = ({
  mode,
  cameraPreset = 'iso',
  isSpeaking = false,
  primaryColor = '#38BDF8',
  accentColor = '#FBBF24',
  gridState,
  showcaseSplitView = false,
  showcaseYawDeg = 0,
  showcasePulseCount = 0,
  onRobotClick,
  onSelectHubGame,
  onHoverHubGame,
  onTileClick,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    mode,
    cameraPreset,
    isSpeaking,
    primaryColor,
    accentColor,
    gridState,
    showcaseSplitView,
    showcaseYawDeg,
    showcasePulseCount,
    lastPulseCount: showcasePulseCount,
    onRobotClick,
    onSelectHubGame,
    onHoverHubGame,
    onTileClick,
    jumpImpulse: 0,
    hoveredGameId: null as GameId | null,
    pointerNDC: { x: 0, y: 0 },
  });

  useEffect(() => {
    stateRef.current.mode = mode;
    stateRef.current.cameraPreset = cameraPreset;
    stateRef.current.isSpeaking = isSpeaking;
    stateRef.current.primaryColor = primaryColor;
    stateRef.current.accentColor = accentColor;
    stateRef.current.gridState = gridState;
    stateRef.current.showcaseSplitView = showcaseSplitView;
    stateRef.current.showcaseYawDeg = showcaseYawDeg;
    stateRef.current.showcasePulseCount = showcasePulseCount;
    stateRef.current.onRobotClick = onRobotClick;
    stateRef.current.onSelectHubGame = onSelectHubGame;
    stateRef.current.onHoverHubGame = onHoverHubGame;
    stateRef.current.onTileClick = onTileClick;
  }, [
    mode,
    cameraPreset,
    isSpeaking,
    primaryColor,
    accentColor,
    gridState,
    showcaseSplitView,
    showcaseYawDeg,
    showcasePulseCount,
    onRobotClick,
    onSelectHubGame,
    onHoverHubGame,
    onTileClick,
  ]);

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
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 4.6, 6.8);

    // 1. Cenário 3D Completo (Salão de Arenito, Pira com Fogo Quente, Mesa de Mármore e Ouro)
    const { updateEnvironment, dispose: disposeEnvironment } = buildStudioWorkshopEnvironment(
      scene,
      renderer,
      isSoftwareGl
    );
    const sparkManager = new SparkBurstManager(scene);

    // 2. Modelo 3D Composto de 10 partes: ROBÔ BIT
    const robotGroup = new THREE.Group();
    const matRobotBody = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(stateRef.current.primaryColor),
      roughness: 0.2,
      metalness: 0.3,
      clearcoat: isSoftwareGl ? 0 : 0.85,
    });
    const matRobotAccent = new THREE.MeshStandardMaterial({
      color: new THREE.Color(stateRef.current.accentColor),
      roughness: 0.22,
      metalness: 0.75,
    });
    const matDarkMetal = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.45,
      metalness: 0.85,
    });
    const matVisor = new THREE.MeshStandardMaterial({
      color: '#090D16',
      roughness: 0.08,
      metalness: 0.92,
    });
    const matEyeGlow = new THREE.MeshStandardMaterial({
      color: '#34D399',
      emissive: '#10B981',
      emissiveIntensity: 0.9,
    });

    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.38), matRobotAccent);
    leftFoot.position.set(-0.2, 0.07, 0.04);
    leftFoot.castShadow = !isSoftwareGl;
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.38), matRobotAccent);
    rightFoot.position.set(0.2, 0.07, 0.04);
    rightFoot.castShadow = !isSoftwareGl;
    robotGroup.add(leftFoot, rightFoot);

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.28, 16), matDarkMetal);
    leftLeg.position.set(-0.2, 0.24, 0);
    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.28, 16), matDarkMetal);
    rightLeg.position.set(0.2, 0.24, 0);
    robotGroup.add(leftLeg, rightLeg);

    const torsoShape = new THREE.Shape();
    const tw = 0.36, th = 0.32, tr = 0.09;
    torsoShape.moveTo(-tw + tr, -th);
    torsoShape.lineTo(tw - tr, -th);
    torsoShape.quadraticCurveTo(tw, -th, tw, -th + tr);
    torsoShape.lineTo(tw, th - tr);
    torsoShape.quadraticCurveTo(tw, th, tw - tr, th);
    torsoShape.lineTo(-tw + tr, th);
    torsoShape.quadraticCurveTo(-tw, th, -tw, th - tr);
    torsoShape.lineTo(-tw, -th + tr);
    torsoShape.quadraticCurveTo(-tw, -th, -tw + tr, -th);

    const torsoGeo = new THREE.ExtrudeGeometry(torsoShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    });
    torsoGeo.center();
    const torsoMesh = new THREE.Mesh(torsoGeo, matRobotBody);
    torsoMesh.position.set(0, 0.68, 0);
    torsoMesh.castShadow = !isSoftwareGl;
    robotGroup.add(torsoMesh);

    const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.06), matVisor);
    chestPanel.position.set(0, 0.68, 0.21);
    robotGroup.add(chestPanel);

    const createStarGeometry = (outerR: number, innerR: number, depth: number) => {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = -Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      });
      geo.center();
      return geo;
    };

    const chestStar = new THREE.Mesh(createStarGeometry(0.11, 0.05, 0.04), matRobotAccent);
    chestStar.position.set(0, 0.68, 0.25);
    robotGroup.add(chestStar);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.46, 0.82, 0);
    const shoulderGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.3, 16);
    const handGeo = new THREE.SphereGeometry(0.095, 16, 16);
    const leftArmMesh = new THREE.Mesh(armGeo, matRobotBody);
    leftArmMesh.position.y = -0.16;
    const leftHand = new THREE.Mesh(handGeo, matRobotAccent);
    leftHand.position.y = -0.32;
    leftArmGroup.add(new THREE.Mesh(shoulderGeo, matDarkMetal), leftArmMesh, leftHand);
    robotGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.46, 0.82, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, matRobotBody);
    rightArmMesh.position.y = -0.16;
    const rightHand = new THREE.Mesh(handGeo, matRobotAccent);
    rightHand.position.y = -0.32;
    rightArmGroup.add(new THREE.Mesh(shoulderGeo, matDarkMetal), rightArmMesh, rightHand);
    robotGroup.add(rightArmGroup);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 20), matDarkMetal);
    neckMesh.position.set(0, 1.05, 0);
    robotGroup.add(neckMesh);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.38, 0);
    const headGeo = new THREE.ExtrudeGeometry(torsoShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.07,
    });
    headGeo.center();
    const headMesh = new THREE.Mesh(headGeo, matRobotBody);
    headMesh.scale.set(1.08, 0.88, 0.95);
    headMesh.castShadow = !isSoftwareGl;
    headGroup.add(headMesh);

    const earGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.12, 16);
    earGeo.rotateZ(Math.PI / 2);
    const leftEar = new THREE.Mesh(earGeo, matRobotAccent);
    leftEar.position.set(-0.48, 0, 0);
    const rightEar = new THREE.Mesh(earGeo, matRobotAccent);
    rightEar.position.set(0.48, 0, 0);
    headGroup.add(leftEar, rightEar);

    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.36, 0.08), matVisor);
    visorMesh.position.set(0, 0.02, 0.24);
    headGroup.add(visorMesh);

    const eyeGeo = new THREE.SphereGeometry(0.068, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, matEyeGlow);
    leftEye.position.set(-0.15, 0.05, 0.27);
    leftEye.scale.z = 0.4;
    const rightEye = new THREE.Mesh(eyeGeo, matEyeGlow);
    rightEye.position.set(0.15, 0.05, 0.27);
    rightEye.scale.z = 0.4;
    headGroup.add(leftEye, rightEye);

    const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.04), matRobotAccent);
    mouthMesh.position.set(0, -0.08, 0.28);
    headGroup.add(mouthMesh);

    const antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.26, 12), matDarkMetal);
    antennaRod.position.set(0, 0.42, 0);
    const antennaBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 16, 16),
      new THREE.MeshStandardMaterial({
        color: '#FBBF24',
        emissive: '#F59E0B',
        emissiveIntensity: 0.8,
      })
    );
    antennaBulb.position.set(0, 0.56, 0);
    headGroup.add(antennaRod, antennaBulb);
    robotGroup.add(headGroup);
    scene.add(robotGroup);

    // 3. Os 6 Pedestais de Brinquedos 3D na Mesa Principal (HUB)
    const hubToysGroup = new THREE.Group();
    scene.add(hubToysGroup);

    const toyPedestals: Array<{
      gameId: GameId;
      group: THREE.Group;
      basePos: THREE.Vector3;
      ringMat: THREE.MeshStandardMaterial;
    }> = [];

    const hubPositions: Array<{ id: GameId; x: number; z: number; color: string }> = [
      { id: 'monte-amiguinho', x: -2.35, z: -1.1, color: '#38BDF8' },
      { id: 'quebra-cabeca', x: -2.45, z: 0.95, color: '#F472B6' },
      { id: 'pinte-regras', x: -0.95, z: 1.95, color: '#FBBF24' },
      { id: 'tangram-bit', x: 0.95, z: 1.95, color: '#34D399' },
      { id: 'continue-sequencia', x: 2.45, z: 0.95, color: '#A855F7' },
      { id: 'programe-bit', x: 2.35, z: -1.1, color: '#FACC15' },
    ];

    hubPositions.forEach((cfg) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(cfg.x, 0, cfg.z);
      tGroup.userData = { hubGameId: cfg.id };

      // Base redonda dourada/colorida
      const pedBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.64, 0.14, 28),
        new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.3, metalness: 0.6 })
      );
      pedBase.position.y = 0.07;
      pedBase.castShadow = !isSoftwareGl;
      pedBase.userData = { hubGameId: cfg.id };
      tGroup.add(pedBase);

      const ringMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.45,
        roughness: 0.2,
      });
      const pedRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.04, 12, 32), ringMat);
      pedRing.rotation.x = Math.PI / 2;
      pedRing.position.y = 0.14;
      pedRing.userData = { hubGameId: cfg.id };
      tGroup.add(pedRing);

      // Escultura 3D exclusiva para cada um dos 6 jogos sobre o pedestal
      const iconGroup = new THREE.Group();
      iconGroup.position.y = 0.22;

      if (cfg.id === 'monte-amiguinho') {
        // Mini-robô desmontado flutuando com engrenagem dourada
        const miniHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.32, 0.34),
          new THREE.MeshPhysicalMaterial({ color: '#38BDF8', roughness: 0.2, clearcoat: 0.8 })
        );
        miniHead.position.y = 0.52;
        const miniBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.34, 0.3),
          new THREE.MeshPhysicalMaterial({ color: '#FBBF24', roughness: 0.2, clearcoat: 0.8 })
        );
        miniBody.position.y = 0.12;
        iconGroup.add(miniHead, miniBody);
      } else if (cfg.id === 'quebra-cabeca') {
        // 4 blocos 3D coloridos de quebra-cabeça
        const cols = ['#F472B6', '#38BDF8', '#FACC15', '#34D399'];
        [
          [-0.14, 0.14],
          [0.14, 0.14],
          [-0.14, 0.42],
          [0.18, 0.48],
        ].forEach(([bx, by], idx) => {
          const blk = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.24, 0.16),
            new THREE.MeshPhysicalMaterial({ color: cols[idx], roughness: 0.2, clearcoat: 0.8 })
          );
          blk.position.set(bx, by, 0);
          iconGroup.add(blk);
        });
      } else if (cfg.id === 'pinte-regras') {
        // Balão 3D colorido + Pincel Mágico
        const balloonSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 20, 20),
          new THREE.MeshPhysicalMaterial({ color: '#EF4444', roughness: 0.15, clearcoat: 1 })
        );
        balloonSphere.position.y = 0.48;
        const basket = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.16, 0.2),
          new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.6 })
        );
        basket.position.y = 0.1;
        iconGroup.add(balloonSphere, basket);
      } else if (cfg.id === 'tangram-bit') {
        // Pirâmide e blocos de Tangram 3D
        const tri1 = new THREE.Mesh(
          new THREE.ConeGeometry(0.34, 0.45, 4),
          new THREE.MeshPhysicalMaterial({ color: '#34D399', roughness: 0.2, clearcoat: 0.8 })
        );
        tri1.position.y = 0.35;
        const tri2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.28, 0.28),
          new THREE.MeshPhysicalMaterial({ color: '#FACC15', roughness: 0.2, clearcoat: 0.8 })
        );
        tri2.position.set(0.18, 0.18, 0.12);
        tri2.rotation.y = Math.PI / 4;
        iconGroup.add(tri1, tri2);
      } else if (cfg.id === 'continue-sequencia') {
        // 3 esferas/estrelas em sequência num arco
        ['#EF4444', '#38BDF8', '#FACC15'].forEach((col, i) => {
          const bead = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.15, clearcoat: 0.9 })
          );
          bead.position.set((i - 1) * 0.28, 0.25 + (i % 2) * 0.15, 0);
          iconGroup.add(bead);
        });
      } else {
        // Estrela Dourada 3D + Seta de comando
        const star = new THREE.Mesh(
          createStarGeometry(0.28, 0.13, 0.1),
          new THREE.MeshStandardMaterial({
            color: '#FACC15',
            emissive: '#F59E0B',
            emissiveIntensity: 0.5,
            roughness: 0.15,
            metalness: 0.85,
          })
        );
        star.position.y = 0.38;
        iconGroup.add(star);
      }

      iconGroup.traverse((child) => {
        child.userData = { hubGameId: cfg.id };
      });
      tGroup.add(iconGroup);
      hubToysGroup.add(tGroup);
      toyPedestals.push({
        gameId: cfg.id,
        group: tGroup,
        basePos: new THREE.Vector3(cfg.x, 0, cfg.z),
        ringMat,
      });
    });

    // 4. Grupo do Tabuleiro de Xadrez/Runas 3D para o Jogo Bônus ("Programe o Robô Bit")
    const gridWorldGroup = new THREE.Group();
    gridWorldGroup.visible = false;
    scene.add(gridWorldGroup);

    const tilesGroup = new THREE.Group();
    const obstaclesGroup = new THREE.Group();
    gridWorldGroup.add(tilesGroup, obstaclesGroup);

    const goalStarGroup = new THREE.Group();
    const goalStarMesh = new THREE.Mesh(
      createStarGeometry(0.36, 0.16, 0.12),
      new THREE.MeshStandardMaterial({
        color: '#FACC15',
        emissive: '#F59E0B',
        emissiveIntensity: 0.65,
        roughness: 0.15,
        metalness: 0.88,
      })
    );
    goalStarMesh.position.y = 0.55;
    goalStarMesh.castShadow = !isSoftwareGl;
    const goalPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.12, 24),
      new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.25, metalness: 0.75 })
    );
    goalPedestal.position.y = 0.06;
    goalStarGroup.add(goalStarMesh, goalPedestal);
    gridWorldGroup.add(goalStarGroup);

    let lastGridSignature = '';
    const rebuildGridGeometry = (gs: RobotGridState) => {
      const sig = `${gs.gridSize}-${gs.obstacles.map((o) => `${o.x},${o.z}`).join(';')}`;
      if (sig === lastGridSignature) return;
      lastGridSignature = sig;

      while (tilesGroup.children.length > 0) tilesGroup.remove(tilesGroup.children[0]);
      while (obstaclesGroup.children.length > 0) obstaclesGroup.remove(obstaclesGroup.children[0]);

      const offset = (gs.gridSize - 1) / 2;
      const tileGeo = new THREE.BoxGeometry(0.95, 0.12, 0.95);
      // Casas em marfim quente e obsidiana polida como no tabuleiro de xadrez da referência!
      const matTileIvory = new THREE.MeshPhysicalMaterial({
        color: '#FDF8F0',
        roughness: 0.18,
        metalness: 0.08,
        clearcoat: isSoftwareGl ? 0 : 0.8,
      });
      const matTileObsidian = new THREE.MeshPhysicalMaterial({
        color: '#291D16',
        roughness: 0.22,
        metalness: 0.15,
        clearcoat: isSoftwareGl ? 0 : 0.8,
      });

      for (let x = 0; x < gs.gridSize; x++) {
        for (let z = 0; z < gs.gridSize; z++) {
          const tile = new THREE.Mesh(
            tileGeo,
            (x + z) % 2 === 0 ? matTileIvory : matTileObsidian
          );
          tile.position.set(x - offset, 0.06, z - offset);
          tile.receiveShadow = true;
          tile.userData = { tileX: x, tileZ: z };
          tilesGroup.add(tile);
        }
      }

      // Obstáculos estilo Torres Esculpidas / Cristais Dourados e Rubis
      const towerBaseGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.22, 16);
      const crystalGeo = new THREE.ConeGeometry(0.26, 0.68, 8);
      const matGoldBase = new THREE.MeshStandardMaterial({
        color: '#D97706',
        roughness: 0.25,
        metalness: 0.85,
      });
      const matRubyCrystal = new THREE.MeshPhysicalMaterial({
        color: '#F43F5E',
        emissive: '#BE123C',
        emissiveIntensity: 0.35,
        roughness: 0.15,
        metalness: 0.3,
        clearcoat: isSoftwareGl ? 0 : 0.9,
      });

      gs.obstacles.forEach((obs) => {
        const obsGroup = new THREE.Group();
        obsGroup.position.set(obs.x - offset, 0.12, obs.z - offset);
        const base = new THREE.Mesh(towerBaseGeo, matGoldBase);
        base.position.y = 0.11;
        base.castShadow = !isSoftwareGl;
        const crystalMain = new THREE.Mesh(crystalGeo, matRubyCrystal);
        crystalMain.position.y = 0.48;
        crystalMain.castShadow = !isSoftwareGl;
        obsGroup.add(base, crystalMain);
        obstaclesGroup.add(obsGroup);
      });
    };

    // 5. Raycasting de Interação Direta 3D
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const robotHits = raycaster.intersectObjects(robotGroup.children, true);
      if (robotHits.length > 0) {
        stateRef.current.jumpImpulse = 1.0;
        _burstOrigin.copy(robotGroup.position).add(new THREE.Vector3(0, 1.1, 0));
        sparkManager.triggerBurst(_burstOrigin, '#38BDF8');
        stateRef.current.onRobotClick?.();
        return;
      }

      if (stateRef.current.mode === 'hub') {
        const hubHits = raycaster.intersectObjects(hubToysGroup.children, true);
        if (hubHits.length > 0) {
          const gId = hubHits[0].object.userData?.hubGameId as GameId | undefined;
          if (gId) {
            stateRef.current.onSelectHubGame?.(gId);
            return;
          }
        }
      } else if (stateRef.current.mode === 'robot-grid' && stateRef.current.onTileClick) {
        const tileHits = raycaster.intersectObjects(tilesGroup.children, false);
        if (tileHits.length > 0) {
          const { tileX, tileZ } = tileHits[0].object.userData;
          if (typeof tileX === 'number' && typeof tileZ === 'number') {
            _burstOrigin.copy(tileHits[0].point);
            sparkManager.triggerBurst(_burstOrigin, '#FACC15');
            stateRef.current.onTileClick(tileX, tileZ);
          }
        }
      }
    };

    let lastHoverCheck = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      stateRef.current.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      stateRef.current.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const now = performance.now();
      if (stateRef.current.mode === 'hub' && now - lastHoverCheck > 45) {
        lastHoverCheck = now;
        pointer.set(stateRef.current.pointerNDC.x, stateRef.current.pointerNDC.y);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(hubToysGroup.children, true);
        const gId = (hits[0]?.object?.userData?.hubGameId as GameId) || null;
        if (gId !== stateRef.current.hoveredGameId) {
          stateRef.current.hoveredGameId = gId;
          renderer.domElement.style.cursor = gId ? 'pointer' : 'default';
          stateRef.current.onHoverHubGame?.(gId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

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

      updateEnvironment(elapsed);
      sparkManager.update(dt);

      matRobotBody.color.set(st.primaryColor);
      matRobotAccent.color.set(st.accentColor);

      if (st.mode === 'hub') {
        hubToysGroup.visible = true;
        gridWorldGroup.visible = false;

        robotGroup.position.x = THREE.MathUtils.damp(robotGroup.position.x, 0, 6, dt);
        robotGroup.position.z = THREE.MathUtils.damp(robotGroup.position.z, -0.35, 6, dt);
        robotGroup.scale.setScalar(THREE.MathUtils.damp(robotGroup.scale.x, 1.0, 6, dt));

        if (st.jumpImpulse > 0.01) {
          st.jumpImpulse = THREE.MathUtils.damp(st.jumpImpulse, 0, 5, dt);
          robotGroup.position.y = Math.sin(st.jumpImpulse * Math.PI) * 0.65;
        } else {
          robotGroup.position.y = Math.sin(elapsed * 2.4) * 0.04;
        }

        robotGroup.rotation.y = THREE.MathUtils.damp(
          robotGroup.rotation.y,
          st.pointerNDC.x * 0.4,
          5,
          dt
        );
        headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, st.pointerNDC.x * 0.25, 6, dt);
        headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, -st.pointerNDC.y * 0.15, 6, dt);

        // Anima os 6 pedestais de brinquedos 3D na mesa
        toyPedestals.forEach((tp, idx) => {
          const isHovered = st.hoveredGameId === tp.gameId;
          const targetScale = isHovered ? 1.22 : 1.0;
          tp.group.scale.setScalar(THREE.MathUtils.damp(tp.group.scale.x, targetScale, 8, dt));
          const iconChild = tp.group.children[2];
          if (iconChild) {
            iconChild.rotation.y = elapsed * 1.1 + idx;
            iconChild.position.y = 0.24 + Math.sin(elapsed * 2.5 + idx) * 0.05;
          }
          tp.ringMat.emissiveIntensity = isHovered ? 1.2 : 0.45;
        });

        if (st.cameraPreset === 'front') {
          _targetCamPos.set(0, 1.85, 4.2);
          _targetLookAt.set(0, 0.85, 0);
        } else if (st.cameraPreset === 'top') {
          _targetCamPos.set(0, 6.2, 3.8);
          _targetLookAt.set(0, 0.2, 0.2);
        } else {
          _targetCamPos.set(Math.sin(elapsed * 0.2) * 0.9, 3.4, 5.7);
          _targetLookAt.set(0, 0.55, 0.1);
        }
      } else if (st.mode === 'robot-grid' && st.gridState) {
        hubToysGroup.visible = false;
        gridWorldGroup.visible = true;

        const gs = st.gridState;
        rebuildGridGeometry(gs);

        if (st.showcasePulseCount !== st.lastPulseCount) {
          st.lastPulseCount = st.showcasePulseCount;
          st.jumpImpulse = 1.0;
          _burstOrigin.copy(robotGroup.position).add(new THREE.Vector3(0, 0.9, 0));
          sparkManager.triggerBurst(_burstOrigin, '#FACC15');
        }

        const yawRad = st.showcaseSplitView ? THREE.MathUtils.degToRad(st.showcaseYawDeg) : 0;
        gridWorldGroup.rotation.y = THREE.MathUtils.damp(gridWorldGroup.rotation.y, yawRad, 6, dt);

        const offset = (gs.gridSize - 1) / 2;
        const localX = gs.robotPos.x - offset;
        const localZ = gs.robotPos.z - offset;
        const cosY = Math.cos(gridWorldGroup.rotation.y);
        const sinY = Math.sin(gridWorldGroup.rotation.y);
        const targetX = localX * cosY + localZ * sinY;
        const targetZ = -localX * sinY + localZ * cosY;

        robotGroup.scale.setScalar(
          THREE.MathUtils.damp(robotGroup.scale.x, st.showcaseSplitView ? 0.72 : 0.62, 8, dt)
        );
        robotGroup.position.x = THREE.MathUtils.damp(robotGroup.position.x, targetX, 8, dt);
        robotGroup.position.z = THREE.MathUtils.damp(robotGroup.position.z, targetZ, 8, dt);

        if (st.jumpImpulse > 0.01) {
          st.jumpImpulse = THREE.MathUtils.damp(st.jumpImpulse, 0, 5, dt);
          robotGroup.position.y = 0.12 + Math.sin(st.jumpImpulse * Math.PI) * 0.75;
        } else if (gs.isCelebrating) {
          robotGroup.position.y = 0.12 + Math.abs(Math.sin(elapsed * 8)) * 0.38;
        } else if (gs.isErrorBounce) {
          robotGroup.position.y = 0.12 + Math.abs(Math.sin(elapsed * 14)) * 0.12;
        } else {
          robotGroup.position.y = 0.12;
        }

        const dirAngles: Record<number, number> = {
          0: Math.PI,
          1: Math.PI / 2,
          2: 0,
          3: -Math.PI / 2,
        };
        const baseRotY = st.showcaseSplitView ? 0 : (dirAngles[gs.robotDir] ?? 0);
        const targetRotY = baseRotY + gridWorldGroup.rotation.y;
        robotGroup.rotation.y = THREE.MathUtils.damp(robotGroup.rotation.y, targetRotY, 8, dt);
        headGroup.rotation.set(0, 0, 0);

        goalStarGroup.position.set(gs.starPos.x - offset, 0.12, gs.starPos.z - offset);
        goalStarMesh.rotation.y = elapsed * 2.2;
        goalStarMesh.position.y = 0.55 + Math.sin(elapsed * 3) * 0.08;

        const isWide = (container.clientWidth || window.innerWidth) >= 768;
        if (st.showcaseSplitView && isWide) {
          _targetCamPos.set(2.35, 3.85, 4.55);
          _targetLookAt.set(1.18, 0.25, 0);
        } else if (st.cameraPreset === 'top') {
          _targetCamPos.set(0, 6.4, 1.2);
          _targetLookAt.set(0, 0, 0);
        } else if (st.cameraPreset === 'front') {
          _targetCamPos.set(0, 2.9, 5.4);
          _targetLookAt.set(0, 0.25, 0);
        } else {
          _targetCamPos.set(2.3, 4.4, 4.7);
          _targetLookAt.set(0, 0.15, 0);
        }
      }

      if (st.isSpeaking) {
        mouthMesh.scale.y = 1 + Math.abs(Math.sin(elapsed * 16)) * 2.2;
        rightArmGroup.rotation.z = 0.4 + Math.sin(elapsed * 8) * 0.25;
        leftArmGroup.rotation.z = -0.2 - Math.cos(elapsed * 8) * 0.15;
      } else {
        mouthMesh.scale.y = THREE.MathUtils.damp(mouthMesh.scale.y, 1, 8, dt);
        rightArmGroup.rotation.z = THREE.MathUtils.damp(rightArmGroup.rotation.z, 0.12, 6, dt);
        leftArmGroup.rotation.z = THREE.MathUtils.damp(leftArmGroup.rotation.z, -0.12, 6, dt);
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5, dt);

      _currentLookAt.x = THREE.MathUtils.damp(_currentLookAt.x, _targetLookAt.x, 6, dt);
      _currentLookAt.y = THREE.MathUtils.damp(_currentLookAt.y, _targetLookAt.y, 6, dt);
      _currentLookAt.z = THREE.MathUtils.damp(_currentLookAt.z, _targetLookAt.z, 6, dt);
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || isUnmounted) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => handleResize()) : null;
    resizeObserver?.observe(container);

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      try {
        sparkManager.dispose();
        disposeEnvironment();
        renderer.dispose();
      } catch {
        // Ignora erro de descarte em unmount
      }
    };
  }, []);

  return <div ref={mountRef} className={`w-full h-full overflow-hidden ${className}`} />;
};
