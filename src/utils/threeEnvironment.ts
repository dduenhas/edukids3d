import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Biblioteca de Ambiente 3D Studio PBR, Texturas Procedurais de Alta Fidelidade
 * (Mármore com Runas Douradas, Piso de Pedra/Madeira Quente, Paredes com Arcos e Colunas,
 * Pira de Fogo Luminosa, Indicador 3D Pulsante e Sistema de Partículas 3D) para todos os jogos.
 */

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

/**
 * Gera textura procedural para o Tabuleiro / Bancada de Mármore Escuro com Veios e Runas/Símbolos Dourados
 */
export function createOrnateBoardTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(512, 512, 80, 512, 512, 720);
  grad.addColorStop(0, '#1C1917');
  grad.addColorStop(0.7, '#0F141C');
  grad.addColorStop(1, '#090B10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.strokeStyle = 'rgba(255, 248, 220, 0.12)';
  ctx.lineWidth = 2.2;
  for (let v = 0; v < 28; v++) {
    ctx.beginPath();
    let x = (v * 97) % 1024;
    let y = (v * 53) % 1024;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += Math.cos(v + s * 1.3) * 110;
      y += Math.sin(v * 0.7 + s) * 110;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, 968, 968);
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, 940, 940);
  ctx.lineWidth = 5;
  ctx.strokeRect(108, 108, 808, 808);
  ctx.lineWidth = 2;
  ctx.strokeRect(120, 120, 784, 784);

  ctx.fillStyle = '#FBBF24';
  ctx.strokeStyle = '#FBBF24';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyphs = ['★', '▲', '◆', '●', '❖', '✦', '⬡', '⬢', '✧', '✪', '☼', '❖'];

  for (let i = 0; i < 12; i++) {
    const pos = 148 + i * 66;
    const g1 = glyphs[i % glyphs.length];
    const g2 = glyphs[(i + 3) % glyphs.length];
    ctx.fillText(g1, pos, 75);
    ctx.fillText(g2, pos, 949);
    ctx.fillText(g2, 75, pos);
    ctx.fillText(g1, 949, pos);
  }

  const corners = [
    [75, 75],
    [949, 75],
    [75, 949],
    [949, 949],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText('☀', cx, cy + 2);
  });

  const innerGrad = ctx.createLinearGradient(128, 128, 896, 896);
  innerGrad.addColorStop(0, '#27201C');
  innerGrad.addColorStop(0.5, '#1E1B18');
  innerGrad.addColorStop(1, '#171412');
  ctx.fillStyle = innerGrad;
  ctx.fillRect(126, 126, 772, 772);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.14)';
  ctx.lineWidth = 2;
  for (let g = 1; g < 8; g++) {
    const p = 126 + (g * 772) / 8;
    ctx.beginPath();
    ctx.moveTo(p, 126);
    ctx.lineTo(p, 898);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(126, p);
    ctx.lineTo(898, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createWarmStoneFloorTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3B281E';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 4;
  const cols = 4;
  const w = 512 / cols;
  const h = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offsetX = (r % 2) * (w / 2);
      const x = (c * w + offsetX) % 512;
      const y = r * h;
      const shade = 52 + ((r * 7 + c * 13) % 18);
      ctx.fillStyle = `rgb(${shade + 28}, ${shade + 8}, ${shade - 6})`;
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

      ctx.strokeStyle = 'rgba(255, 210, 160, 0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createSandstoneWallTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#9A6B47');
  bg.addColorStop(0.6, '#845636');
  bg.addColorStop(1, '#5E3B24');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = 'rgba(42, 24, 12, 0.38)';
  ctx.lineWidth = 3;
  const brickH = 42;
  const brickW = 96;
  for (let y = 0; y < 512; y += brickH) {
    const row = Math.floor(y / brickH);
    const shift = (row % 2) * (brickW / 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
    for (let x = -shift; x < 1024; x += brickW) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + brickH);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(255, 224, 180, 0.28)';
  ctx.lineWidth = 8;
  for (let i = 0; i < 6; i++) {
    const cx = 85 + i * 170;
    ctx.beginPath();
    ctx.arc(cx, 190, 58, Math.PI, 0, false);
    ctx.lineTo(cx + 58, 440);
    ctx.moveTo(cx - 58, 190);
    ctx.lineTo(cx - 58, 440);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(2, 1);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/**
 * Constrói o Cenário 3D Completo ("Ateliê Mágico do Robô Bit") com iluminação calibrada
 * para preservar cores vivas, saturadas e alto contraste nos objetos 3D.
 */
export function buildStudioWorkshopEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean = false
) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.background = new THREE.Color('#1A110B');
  scene.fog = new THREE.FogExp2('#1A110B', 0.025);

  // Iluminação calibrada para cores vivas sem estourar para branco/pastel
  const hemiLight = new THREE.HemisphereLight('#FDE68A', '#1E293B', 0.52);
  hemiLight.position.set(0, 14, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight('#FFFBEB', 1.35);
  keyLight.position.set(5.2, 10.5, 6.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 26;
  const d = 6.2;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight('#38BDF8', 0.65);
  rimLight.position.set(-7, 6, -4);
  scene.add(rimLight);

  const firePointLight = new THREE.PointLight('#FF7A00', 3.4, 14, 1.6);
  firePointLight.position.set(0, 1.85, -4.2);
  scene.add(firePointLight);

  const envGroup = new THREE.Group();
  scene.add(envGroup);

  const floorTex = createWarmStoneFloorTexture(renderer);
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.48,
      metalness: 0.1,
    })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.55;
  floorMesh.receiveShadow = true;
  envGroup.add(floorMesh);

  const wallTex = createSandstoneWallTexture(renderer);
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(28, 8.5, 0.6),
    new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.78,
      metalness: 0.05,
    })
  );
  backWall.position.set(0, 3.6, -7.8);
  backWall.receiveShadow = true;
  envGroup.add(backWall);

  const pillarMat = new THREE.MeshStandardMaterial({
    color: '#A6754E',
    roughness: 0.65,
    metalness: 0.08,
  });
  const pillarPositions = [-8.5, -4.2, 4.2, 8.5];
  pillarPositions.forEach((px) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(px, -0.55, -7.2);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.45, 16), pillarMat);
    base.position.y = 0.22;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 6.5, 16), pillarMat);
    shaft.position.y = 3.45;
    shaft.castShadow = !isSoftwareGl;
    pGroup.add(base, shaft);
    envGroup.add(pGroup);
  });

  const boardTex = createOrnateBoardTexture(renderer);
  const tableMat = new THREE.MeshPhysicalMaterial({
    map: boardTex,
    roughness: 0.18,
    metalness: 0.18,
    clearcoat: isSoftwareGl ? 0 : 0.85,
    clearcoatRoughness: 0.12,
  });
  const tableMesh = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.36, 6.8), tableMat);
  tableMesh.position.set(0, -0.18, 0);
  tableMesh.receiveShadow = true;
  tableMesh.castShadow = !isSoftwareGl;
  envGroup.add(tableMesh);

  const tablePedestal = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.24, 6.0),
    new THREE.MeshStandardMaterial({
      color: '#78350F',
      roughness: 0.5,
      metalness: 0.4,
    })
  );
  tablePedestal.position.set(0, -0.44, 0);
  envGroup.add(tablePedestal);

  const brazierGroup = new THREE.Group();
  brazierGroup.position.set(0, -0.55, -4.25);

  const stoneStep1 = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.18, 1.7),
    new THREE.MeshStandardMaterial({ color: '#D6B89A', roughness: 0.7 })
  );
  stoneStep1.position.y = 0.09;
  const stoneStep2 = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.18, 1.35),
    new THREE.MeshStandardMaterial({ color: '#E5CBAF', roughness: 0.65 })
  );
  stoneStep2.position.y = 0.27;
  brazierGroup.add(stoneStep1, stoneStep2);

  const ironMat = new THREE.MeshStandardMaterial({
    color: '#18181B',
    roughness: 0.4,
    metalness: 0.85,
  });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.3, 0.42, 16), ironMat);
  bowl.position.y = 0.68;
  brazierGroup.add(bowl);

  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.52, 8), ironMat);
    bar.position.set(Math.cos(ang) * 0.52, 0.92, Math.sin(ang) * 0.52);
    bar.rotation.z = -Math.cos(ang) * 0.18;
    bar.rotation.x = Math.sin(ang) * 0.18;
    brazierGroup.add(bar);
  }

  const flamesGroup = new THREE.Group();
  flamesGroup.position.y = 0.95;
  const flameColors = ['#FF4500', '#FF8C00', '#FFD700', '#FFFBEB'];
  const flameMeshes: THREE.Mesh[] = [];
  for (let f = 0; f < 7; f++) {
    const fMat = new THREE.MeshBasicMaterial({
      color: flameColors[f % flameColors.length],
      transparent: true,
      opacity: 0.88,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28 - f * 0.025, 0.95 + (f % 3) * 0.25, 10), fMat);
    const angle = (f / 7) * Math.PI * 2;
    const rad = f === 6 ? 0 : 0.14;
    cone.position.set(Math.cos(angle) * rad, 0.25, Math.sin(angle) * rad);
    flamesGroup.add(cone);
    flameMeshes.push(cone);
  }
  brazierGroup.add(flamesGroup);
  envGroup.add(brazierGroup);

  const updateEnvironment = (elapsed: number) => {
    firePointLight.intensity = 3.2 + Math.sin(elapsed * 11) * 0.45 + Math.cos(elapsed * 17) * 0.25;
    firePointLight.position.x = Math.sin(elapsed * 7) * 0.05;
    flameMeshes.forEach((m, idx) => {
      m.scale.y = 0.9 + Math.sin(elapsed * 10 + idx * 1.7) * 0.22;
      m.scale.x = 0.92 + Math.cos(elapsed * 8 + idx) * 0.12;
      m.rotation.z = Math.sin(elapsed * 6 + idx) * 0.08;
    });
  };

  return {
    envGroup,
    updateEnvironment,
    update: updateEnvironment,
    afterDraw: () => {},
    dispose: () => {
      floorTex.dispose();
      wallTex.dispose();
      boardTex.dispose();
    },
  };
}

/**
 * Cria um Indicador 3D Pulsante (Seta Dourada + Halo Luminoso) para guiar a criança no espaço 3D,
 * indicando exatamente em qual pote de tinta, peça ou encaixe clicar.
 */
export function create3DPointerIndicator(scene: THREE.Scene) {
  const group = new THREE.Group();

  const arrowMat = new THREE.MeshStandardMaterial({
    color: '#FACC15',
    emissive: '#F59E0B',
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.6,
  });

  // Ponta da seta apontando para baixo (-Y)
  const coneGeo = new THREE.ConeGeometry(0.18, 0.32, 16);
  const cone = new THREE.Mesh(coneGeo, arrowMat);
  cone.rotation.x = Math.PI;
  cone.position.y = 0.22;

  // Haste da seta
  const stemGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.26, 16);
  const stem = new THREE.Mesh(stemGeo, arrowMat);
  stem.position.y = 0.46;

  // Halo circular pulsante na base
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#FEF08A',
    transparent: true,
    opacity: 0.85,
  });
  const ringGeo = new THREE.TorusGeometry(0.32, 0.032, 12, 32);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;

  group.add(cone, stem, ring);
  scene.add(group);

  const update = (
    elapsed: number,
    targetPos: THREE.Vector3 | null,
    colorOrVisible: string | number | boolean = '#FACC15',
    visibleOrColor: boolean | string | number = true
  ) => {
    const isVisible =
      typeof colorOrVisible === 'boolean'
        ? colorOrVisible
        : typeof visibleOrColor === 'boolean'
        ? visibleOrColor
        : true;

    const resolvedColor: string | number =
      typeof colorOrVisible === 'string' || typeof colorOrVisible === 'number'
        ? colorOrVisible
        : typeof visibleOrColor === 'string' || typeof visibleOrColor === 'number'
        ? visibleOrColor
        : '#FACC15';

    group.visible = isVisible && targetPos !== null;
    if (!targetPos || !isVisible) return;

    group.position.x = targetPos.x;
    group.position.z = targetPos.z;
    group.position.y = targetPos.y + Math.sin(elapsed * 6.5) * 0.1;

    cone.rotation.y = elapsed * 2.5;
    ring.scale.setScalar(1.0 + Math.sin(elapsed * 6.5) * 0.16);
    arrowMat.color.set(resolvedColor);
    arrowMat.emissive.set(resolvedColor);
  };

  const dispose = () => {
    scene.remove(group);
    coneGeo.dispose();
    stemGeo.dispose();
    ringGeo.dispose();
    arrowMat.dispose();
    ringMat.dispose();
  };

  return { group, update, dispose };
}

/**
 * Gerenciador de Explosão de Partículas Estelares 3D (Zero GC durante o loop)
 */
export class SparkBurstManager {
  private instanced: THREE.InstancedMesh;
  private count = 36;
  private velocities: THREE.Vector3[] = [];
  private positions: THREE.Vector3[] = [];
  private scales: number[] = [];
  private activeTime = 999;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.OctahedronGeometry(0.11, 0);
    const mat = new THREE.MeshBasicMaterial({ color: '#FDE047' });
    this.instanced = new THREE.InstancedMesh(geo, mat, this.count);
    this.instanced.frustumCulled = false;

    for (let i = 0; i < this.count; i++) {
      this.velocities.push(new THREE.Vector3());
      this.positions.push(new THREE.Vector3(0, -10, 0));
      this.scales.push(0);
      this.dummy.position.set(0, -10, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.instanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.instanced.instanceMatrix.needsUpdate = true;
    scene.add(this.instanced);
  }

  public triggerBurst(origin: THREE.Vector3, colorHex: string | number = '#FACC15') {
    this.activeTime = 0;
    (this.instanced.material as THREE.MeshBasicMaterial).color.set(colorHex);
    for (let i = 0; i < this.count; i++) {
      this.positions[i].copy(origin);
      const theta = (i / this.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.6 + Math.random() * 2.6;
      this.velocities[i].set(
        Math.cos(theta) * speed,
        1.8 + Math.random() * 2.8,
        Math.sin(theta) * speed
      );
      this.scales[i] = 0.7 + Math.random() * 0.7;
    }
  }

  public burst(origin: THREE.Vector3, colorHex: string | number = '#FACC15') {
    this.triggerBurst(origin, colorHex);
  }

  public update(dt: number) {
    if (this.activeTime > 1.2) return;
    this.activeTime += dt;

    for (let i = 0; i < this.count; i++) {
      this.positions[i].addScaledVector(this.velocities[i], dt);
      this.velocities[i].y -= 6.8 * dt;
      const lifeScale = Math.max(0, 1 - this.activeTime / 1.0) * this.scales[i];

      this.dummy.position.copy(this.positions[i]);
      this.dummy.rotation.x += 5 * dt;
      this.dummy.rotation.y += 6 * dt;
      this.dummy.scale.setScalar(lifeScale);
      this.dummy.updateMatrix();
      this.instanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.instanced.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.instanced.geometry.dispose();
    (this.instanced.material as THREE.Material).dispose();
  }
}

export type RobotPartId = 'hat' | 'head' | 'body' | 'armLeft' | 'armRight' | 'legs';
export type CharacterStyle = 'robot' | 'bunny' | 'astronaut';

export function build3DCharacterPart(
  partId: RobotPartId,
  style: CharacterStyle,
  primaryHex: string = '#0284C7',
  accentHex: string = '#F59E0B',
  isGhostBlueprint: boolean = false
): THREE.Group {
  const group = new THREE.Group();

  const mainColor =
    style === 'robot' ? primaryHex : style === 'bunny' ? '#EC4899' : '#F8FAFC';
  const subColor =
    style === 'robot' ? accentHex : style === 'bunny' ? '#F472B6' : '#EA580C';

  const matMain = isGhostBlueprint
    ? new THREE.MeshBasicMaterial({
        color: '#38BDF8',
        wireframe: true,
        transparent: true,
        opacity: 0.38,
      })
    : new THREE.MeshPhysicalMaterial({
        color: mainColor,
        roughness: 0.25,
        metalness: style === 'robot' ? 0.25 : 0.08,
        clearcoat: 0.75,
        clearcoatRoughness: 0.14,
      });

  const matSub = isGhostBlueprint
    ? matMain
    : new THREE.MeshStandardMaterial({
        color: subColor,
        roughness: 0.28,
        metalness: 0.55,
      });

  const matJoint = isGhostBlueprint
    ? matMain
    : new THREE.MeshStandardMaterial({
        color: '#475569',
        roughness: 0.4,
        metalness: 0.85,
      });

  const matVisor = isGhostBlueprint
    ? matMain
    : new THREE.MeshStandardMaterial({
        color: '#090D16',
        roughness: 0.08,
        metalness: 0.9,
      });

  const matEye = isGhostBlueprint
    ? matMain
    : new THREE.MeshStandardMaterial({
        color: '#34D399',
        emissive: '#10B981',
        emissiveIntensity: 0.9,
      });

  if (partId === 'hat') {
    if (style === 'bunny') {
      const earGeo = new THREE.CapsuleGeometry(0.11, 0.38, 8, 16);
      const earL = new THREE.Mesh(earGeo, matMain);
      earL.position.set(-0.18, 0.25, 0);
      earL.rotation.z = 0.15;
      const earR = new THREE.Mesh(earGeo, matMain);
      earR.position.set(0.18, 0.25, 0);
      earR.rotation.z = -0.15;
      group.add(earL, earR);
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 20), matJoint);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.34, 16), matJoint);
      rod.position.y = 0.2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 12, 24), matSub);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.22;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), matSub);
      bulb.position.y = 0.42;
      group.add(base, rod, ring, bulb);
    }
  } else if (partId === 'head') {
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.64, 0.68), matMain);
    headBox.castShadow = !isGhostBlueprint;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.38, 0.08), matVisor);
    visor.position.set(0, 0.02, 0.33);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), matEye);
    eyeL.position.set(-0.16, 0.04, 0.37);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), matEye);
    eyeR.position.set(0.16, 0.04, 0.37);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 10, 20, Math.PI), matSub);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.05, 0.37);

    const earGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 16);
    earGeo.rotateZ(Math.PI / 2);
    const earL = new THREE.Mesh(earGeo, matSub);
    earL.position.set(-0.46, 0, 0);
    const earR = new THREE.Mesh(earGeo, matSub);
    earR.position.set(0.46, 0, 0);

    const neckSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 20), matJoint);
    neckSocket.position.y = -0.36;

    group.add(headBox, visor, eyeL, eyeR, smile, earL, earR, neckSocket);
  } else if (partId === 'body') {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.86, 0.58), matMain);
    torso.castShadow = !isGhostBlueprint;
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.46, 0.08), matVisor);
    chestPlate.position.set(0, 0.05, 0.29);
    const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), matSub);
    coreGem.position.set(0, 0.05, 0.34);

    const socketGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16);
    socketGeo.rotateZ(Math.PI / 2);
    const sockL = new THREE.Mesh(socketGeo, matJoint);
    sockL.position.set(-0.5, 0.18, 0);
    const sockR = new THREE.Mesh(socketGeo, matJoint);
    sockR.position.set(0.5, 0.18, 0);

    group.add(torso, chestPlate, coreGem, sockL, sockR);
  } else if (partId === 'armLeft' || partId === 'armRight') {
    const sign = partId === 'armLeft' ? -1 : 1;
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), matJoint);
    shoulder.position.set(0, 0.22, 0);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.42, 16), matMain);
    upperArm.castShadow = !isGhostBlueprint;
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), matJoint);
    wrist.position.y = -0.22;
    const clawHand = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 12, 20, Math.PI * 1.35), matSub);
    clawHand.rotation.z = sign > 0 ? -Math.PI * 0.65 : -Math.PI * 0.7;
    clawHand.position.y = -0.34;
    group.add(shoulder, upperArm, wrist, clawHand);
  } else if (partId === 'legs') {
    const hipBar = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.38), matJoint);
    hipBar.position.y = 0.32;

    [-0.24, 0.24].forEach((lx) => {
      const legCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.44, 16), matMain);
      legCylinder.position.set(lx, 0.06, 0);
      legCylinder.castShadow = !isGhostBlueprint;

      const kneeRing = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.025, 10, 20), matSub);
      kneeRing.rotation.x = Math.PI / 2;
      kneeRing.position.set(lx, 0.08, 0);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.48), matSub);
      boot.position.set(lx, -0.22, 0.06);
      boot.castShadow = !isGhostBlueprint;

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.5), matJoint);
      sole.position.set(lx, -0.32, 0.06);

      group.add(legCylinder, kneeRing, boot, sole);
    });
    group.add(hipBar);
  }

  return group;
}
