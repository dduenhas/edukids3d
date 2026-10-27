/**
 * Persistência local (localStorage) para progresso das estrelas,
 * avatar customizado da criança, configurações de áudio/narração,
 * acessibilidade inteligente e métricas de avaliação formativa para o Painel do Professor.
 * Nenhum dado pessoal é coletado ou enviado pela rede.
 */

export type GameId =
  | 'monte-amiguinho'
  | 'quebra-cabeca'
  | 'pinte-regras'
  | 'tangram-bit'
  | 'continue-sequencia'
  | 'programe-bit';

export interface CustomAvatarConfig {
  headType: 'robot' | 'bunny' | 'astronaut';
  bodyType: 'robot' | 'bunny' | 'astronaut';
  armsType: 'robot' | 'bunny' | 'astronaut';
  legsType: 'robot' | 'bunny' | 'astronaut';
  hatType: 'antenna' | 'ears' | 'crown' | 'propeller';
  primaryColor: string;
  accentColor: string;
}

export interface GameMetrics {
  attempts: number;
  completions: number;
  hintsUsed: number;
  totalSecondsPlayed: number;
}

export interface AppSettings {
  /** Ativa ou desativa todas as narrações por voz (Inicia DESATIVADO por padrão) */
  narrationEnabled: boolean;
  /** Ativa ou desativa narração automática ao iniciar fases e passos (Inicia DESATIVADO por padrão) */
  autoNarration: boolean;
  /** Silencia ou ativa os efeitos sonoros normais do jogo (Inicia ATIVO / false por padrão) */
  sfxMuted: boolean;
  /** Volume Geral (Master) de 0.0 a 1.0 */
  masterVolume: number;
  /** Volume individual dos efeitos sonoros de interação (cliques, encaixe 3D, madeira, pincel) de 0.0 a 1.0 */
  sfxVolume: number;
  /** Volume individual das comemorações, fanfarras, sons do robô e bichinhos de 0.0 a 1.0 */
  fanfareVolume: number;
  /** Volume individual da voz da narração de 0.0 a 1.0 */
  voiceVolume: number;
  /** Velocidade da fala da narração */
  speechRate: number;
  highContrast: boolean;
  largeText: boolean;
  /** Modo Daltonismo com símbolos geométricos nas cores e paleta segura (Okabe-Ito) */
  colorBlindMode: boolean;
  /** Guia Visual Inteligente (glow, setas 3D pulsantes e microanimações indicando onde clicar e ler) */
  visualGuidePulse: boolean;
  /** Modo Sensorial Calmo (TEA): reduz movimentos de câmera, partículas intensas e estímulos visuais rápidos */
  calmMode: boolean;
  /** Leitura Auditiva ao Passar o Mouse: narra automaticamente botões e passos ao apontar */
  hoverSpeech: boolean;
  /** Assistência Motora: amplia a área de encaixe magnético das peças 3D e botões */
  motorAssist: boolean;
}

export interface EduGamesProgress {
  stars: Record<GameId, [boolean, boolean, boolean]>;
  metrics: Record<GameId, GameMetrics>;
  customAvatar: CustomAvatarConfig;
  settings: AppSettings;
}

const STORAGE_KEY = 'edugames_kids_bncc_v2';
const LEGACY_STORAGE_KEY = 'edugames_kids_bncc_v1';

export const DEFAULT_AVATAR: CustomAvatarConfig = {
  headType: 'robot',
  bodyType: 'robot',
  armsType: 'robot',
  legsType: 'robot',
  hatType: 'antenna',
  primaryColor: '#0284C7',
  accentColor: '#F59E0B',
};

const INITIAL_GAME_METRICS: GameMetrics = {
  attempts: 0,
  completions: 0,
  hintsUsed: 0,
  totalSecondsPlayed: 0,
};

export function getInitialProgress(): EduGamesProgress {
  return {
    stars: {
      'monte-amiguinho': [false, false, false],
      'quebra-cabeca': [false, false, false],
      'pinte-regras': [false, false, false],
      'tangram-bit': [false, false, false],
      'continue-sequencia': [false, false, false],
      'programe-bit': [false, false, false],
    },
    metrics: {
      'monte-amiguinho': { ...INITIAL_GAME_METRICS },
      'quebra-cabeca': { ...INITIAL_GAME_METRICS },
      'pinte-regras': { ...INITIAL_GAME_METRICS },
      'tangram-bit': { ...INITIAL_GAME_METRICS },
      'continue-sequencia': { ...INITIAL_GAME_METRICS },
      'programe-bit': { ...INITIAL_GAME_METRICS },
    },
    customAvatar: { ...DEFAULT_AVATAR },
    settings: {
      narrationEnabled: false,
      autoNarration: false,
      sfxMuted: false,
      masterVolume: 1.0,
      sfxVolume: 0.85,
      fanfareVolume: 0.85,
      voiceVolume: 0.9,
      speechRate: 0.95,
      highContrast: false,
      largeText: false,
      colorBlindMode: true,
      visualGuidePulse: true,
      calmMode: false,
      hoverSpeech: false,
      motorAssist: true,
    },
  };
}

export function loadProgress(): EduGamesProgress {
  if (typeof window === 'undefined') return getInitialProgress();
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<EduGamesProgress>;
      const base = getInitialProgress();
      return {
        stars: { ...base.stars, ...(parsed.stars || {}) },
        metrics: { ...base.metrics, ...(parsed.metrics || {}) },
        customAvatar: { ...base.customAvatar, ...(parsed.customAvatar || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) },
      };
    }

    // Migra estrelas, métricas e avatar da versão anterior garantindo que a narração automática comece desativada
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1) as Partial<EduGamesProgress>;
      const base = getInitialProgress();
      return {
        stars: { ...base.stars, ...(parsedV1.stars || {}) },
        metrics: { ...base.metrics, ...(parsedV1.metrics || {}) },
        customAvatar: { ...base.customAvatar, ...(parsedV1.customAvatar || {}) },
        settings: {
          ...base.settings,
          ...(parsedV1.settings || {}),
          narrationEnabled: false,
          autoNarration: false,
          hoverSpeech: false,
        },
      };
    }

    return getInitialProgress();
  } catch {
    return getInitialProgress();
  }
}

export function saveProgress(progress: EduGamesProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Caso localStorage esteja cheio ou restrito
  }
}

export function resetAllProgress(): EduGamesProgress {
  const fresh = getInitialProgress();
  saveProgress(fresh);
  return fresh;
}
