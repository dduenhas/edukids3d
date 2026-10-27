/**
 * Módulo de Áudio e Narração 3D (Web Speech API + Web Audio API)
 * Desenvolvido para crianças de 4 a 5 anos (pré-alfabetização).
 * Gera efeitos sonoros ricos e táteis (servomotores, encaixe magnético de robô,
 * blocos de madeira batendo, pinceladas mágicas e xilofone) 100% por código,
 * com controles individuais de volume e narração automática desativada por padrão.
 */

export interface SoundEngineConfig {
  narrationEnabled?: boolean;
  autoNarration?: boolean;
  sfxMuted?: boolean;
  masterVolume?: number;
  sfxVolume?: number;
  fanfareVolume?: number;
  voiceVolume?: number;
  speechRate?: number;
  hoverSpeechEnabled?: boolean;
}

class SoundAndSpeechEngine {
  private audioCtx: AudioContext | null = null;
  private narrationEnabled: boolean = false;
  private autoNarration: boolean = false;
  private sfxMuted: boolean = false;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 0.85;
  private fanfareVolume: number = 0.85;
  private voiceVolume: number = 0.9;
  private speechRate: number = 0.95;
  private hoverSpeechEnabled: boolean = false;
  private lastHoverText: string = '';
  private lastHoverTime: number = 0;
  private currentlySpeaking: boolean = false;
  private isSpeakingCallback: ((speaking: boolean) => void) | null = null;

  private setSpeakingState(speaking: boolean) {
    if (this.currentlySpeaking === speaking) return;
    this.currentlySpeaking = speaking;
    this.isSpeakingCallback?.(speaking);
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public configure(config: SoundEngineConfig) {
    if (config.narrationEnabled !== undefined) {
      this.narrationEnabled = config.narrationEnabled;
      if (!this.narrationEnabled && this.currentlySpeaking) {
        this.stopSpeaking();
      }
    }
    if (config.autoNarration !== undefined) {
      this.autoNarration = config.autoNarration;
    }
    if (config.sfxMuted !== undefined) {
      this.sfxMuted = config.sfxMuted;
    }
    if (config.masterVolume !== undefined) {
      this.masterVolume = Math.max(0, Math.min(1, config.masterVolume));
    }
    if (config.sfxVolume !== undefined) {
      this.sfxVolume = Math.max(0, Math.min(1, config.sfxVolume));
    }
    if (config.fanfareVolume !== undefined) {
      this.fanfareVolume = Math.max(0, Math.min(1, config.fanfareVolume));
    }
    if (config.voiceVolume !== undefined) {
      this.voiceVolume = Math.max(0, Math.min(1, config.voiceVolume));
    }
    if (config.speechRate !== undefined) {
      this.speechRate = Math.max(0.6, Math.min(1.4, config.speechRate));
    }
    if (config.hoverSpeechEnabled !== undefined) {
      this.hoverSpeechEnabled = config.hoverSpeechEnabled;
    }
  }

  public setSettings(
    voiceVolume: number,
    sfxMuted: boolean,
    speechRate: number = 0.95,
    hoverSpeechEnabled: boolean = false,
    narrationEnabled: boolean = false,
    autoNarration: boolean = false,
    masterVolume: number = 1.0,
    sfxVolume: number = 0.85,
    fanfareVolume: number = 0.85
  ) {
    this.configure({
      voiceVolume,
      sfxMuted,
      speechRate,
      hoverSpeechEnabled,
      narrationEnabled,
      autoNarration,
      masterVolume,
      sfxVolume,
      fanfareVolume,
    });
  }

  public onSpeakingChange(cb: (speaking: boolean) => void) {
    this.isSpeakingCallback = cb;
  }

  private getEffectiveSfxScale(): number {
    if (this.sfxMuted || this.masterVolume <= 0.005 || this.sfxVolume <= 0.005) return 0;
    return Math.max(0.02, Math.min(1.5, this.masterVolume * this.sfxVolume));
  }

  private getEffectiveFanfareScale(): number {
    if (this.sfxMuted || this.masterVolume <= 0.005 || this.fanfareVolume <= 0.005) return 0;
    return Math.max(0.02, Math.min(1.5, this.masterVolume * this.fanfareVolume));
  }

  public speakHover(text: string) {
    if (!this.narrationEnabled || !this.hoverSpeechEnabled) return;
    const now = Date.now();
    if (text === this.lastHoverText && now - this.lastHoverTime < 2200) return;
    this.lastHoverText = text;
    this.lastHoverTime = now;
    this.speakInternal(text, true);
  }

  /**
   * Narração chamada automaticamente pelo fluxo do jogo (início de fase, encaixe, dicas automáticas).
   * Só executa se `narrationEnabled` e `autoNarration` estiverem ativos.
   */
  public speak(text: string, interrupt: boolean = true) {
    if (!this.narrationEnabled || !this.autoNarration) return;
    this.speakInternal(text, interrupt);
  }

  /**
   * Narração acionada manualmente por botões explícitos de "Ouvir" na interface.
   * Só executa se `narrationEnabled` estiver ativo nas Configurações.
   */
  public speakManual(text: string) {
    if (!this.narrationEnabled) return;
    this.speakInternal(text, true);
  }

  /**
   * Teste de voz direto de dentro do modal de Configurações (Engrenagem).
   */
  public speakPreview(text: string) {
    this.speakInternal(text, true);
  }

  private speakInternal(text: string, interrupt: boolean = true) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const effectiveVol = Math.max(0, Math.min(1, this.masterVolume * this.voiceVolume));
    if (effectiveVol <= 0.01) return;

    try {
      if (interrupt) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.volume = effectiveVol;
      utterance.rate = this.speechRate;
      utterance.pitch = 1.12;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice =
        voices.find(
          (v) =>
            v.lang.includes('pt-BR') &&
            (v.name.includes('Luciana') || v.name.includes('Google') || v.name.includes('Francisca'))
        ) ||
        voices.find((v) => v.lang.includes('pt-BR')) ||
        voices.find((v) => v.lang.startsWith('pt'));

      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onstart = () => this.setSpeakingState(true);
      utterance.onend = () => this.setSpeakingState(false);
      utterance.onerror = () => this.setSpeakingState(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignora bloqueio antes de interação do usuário
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.setSpeakingState(false);
    }
  }

  /**
   * Som ao pegar uma peça 3D na mesa ou clicar em botões (pop tátil ascendente)
   */
  public playTap() {
    const scale = this.getEffectiveSfxScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.075);

    gain.gain.setValueAtTime(0.18 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * Som rico de encaixe mecânico + servomotor + trava magnética para o Jogo 1 (Monte o Amiguinho 3D)
   */
  public playMechanicalAttach() {
    const scale = this.getEffectiveSfxScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const servoOsc = ctx.createOscillator();
    const servoGain = ctx.createGain();
    servoOsc.type = 'sawtooth';
    servoOsc.frequency.setValueAtTime(140, now);
    servoOsc.frequency.linearRampToValueAtTime(380, now + 0.14);
    servoGain.gain.setValueAtTime(0.09 * scale, now);
    servoGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.15);
    servoOsc.connect(servoGain);
    servoGain.connect(ctx.destination);
    servoOsc.start(now);
    servoOsc.stop(now + 0.16);

    const clunkOsc = ctx.createOscillator();
    const clunkGain = ctx.createGain();
    clunkOsc.type = 'triangle';
    clunkOsc.frequency.setValueAtTime(190, now + 0.12);
    clunkOsc.frequency.exponentialRampToValueAtTime(65, now + 0.22);
    clunkGain.gain.setValueAtTime(0.28 * scale, now + 0.12);
    clunkGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.23);
    clunkOsc.connect(clunkGain);
    clunkGain.connect(ctx.destination);
    clunkOsc.start(now + 0.12);
    clunkOsc.stop(now + 0.24);

    const chord = [523.25, 659.25, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.16 + idx * 0.045);
      g.gain.setValueAtTime(0.15 * scale, now + 0.16 + idx * 0.045);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.42);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + 0.16 + idx * 0.045);
      osc.stop(now + 0.44);
    });
  }

  /**
   * Som percussivo de bloco de madeira nobre encaixando no tabuleiro (Quebra-Cabeça 3D e Tangram 3D)
   */
  public playWoodBlockSnap() {
    const scale = this.getEffectiveSfxScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(320, now);
    woodOsc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
    woodGain.gain.setValueAtTime(0.28 * scale, now);
    woodGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.1);
    woodOsc.connect(woodGain);
    woodGain.connect(ctx.destination);
    woodOsc.start(now);
    woodOsc.stop(now + 0.11);

    const xylo = [659.25, 880];
    xylo.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + 0.06 + i * 0.06);
      g.gain.setValueAtTime(0.18 * scale, now + 0.06 + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + 0.06 + i * 0.06);
      osc.stop(now + 0.3);
    });
  }

  /**
   * Som mágico de pincelada fluida + brilho para o Jogo 3 (Pintura 3D)
   */
  public playPaintBrushSplash() {
    const scale = this.getEffectiveSfxScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + i * 0.04 + 0.12);
      gain.gain.setValueAtTime(0.16 * scale, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + i * 0.04 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.18);
    });
  }

  public playSuccessSnap() {
    this.playMechanicalAttach();
  }

  public playGentleHint() {
    const scale = this.getEffectiveSfxScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 392];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.14 * scale, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + i * 0.11 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.19);
    });
  }

  public playRobotStep(stepIndex: number = 0) {
    const scale = this.getEffectiveSfxScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = stepIndex % 2 === 0 ? 310 : 390;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.09);

    gain.gain.setValueAtTime(0.18 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Som robótico divertido "Bip-Bop-Buzzz!" + servomotor para interagir com o robô montado
   */
  public playRobotBipBop(variant: 'lights' | 'limbs' | 'spin' = 'lights') {
    const scale = this.getEffectiveFanfareScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (variant === 'lights') {
      const notes = [
        { freq: 880, type: 'square' as OscillatorType, start: 0, dur: 0.075 },
        { freq: 587.33, type: 'square' as OscillatorType, start: 0.085, dur: 0.075 },
        { freq: 1174.66, type: 'triangle' as OscillatorType, start: 0.17, dur: 0.09 },
        { freq: 240, type: 'sawtooth' as OscillatorType, start: 0.27, dur: 0.14 },
        { freq: 1046.5, type: 'sine' as OscillatorType, start: 0.42, dur: 0.18 },
      ];
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        if (n.type === 'sawtooth') {
          osc.frequency.linearRampToValueAtTime(340, now + n.start + n.dur);
        } else {
          osc.frequency.exponentialRampToValueAtTime(n.freq * 1.18, now + n.start + n.dur);
        }
        gain.gain.setValueAtTime(0.16 * scale, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + n.start + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.01);
      });
    } else if (variant === 'limbs') {
      const servo1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      servo1.type = 'sawtooth';
      servo1.frequency.setValueAtTime(160, now);
      servo1.frequency.exponentialRampToValueAtTime(460, now + 0.15);
      servo1.frequency.exponentialRampToValueAtTime(220, now + 0.28);
      g1.gain.setValueAtTime(0.11 * scale, now);
      g1.gain.exponentialRampToValueAtTime(0.0005, now + 0.3);
      servo1.connect(g1);
      g1.connect(ctx.destination);
      servo1.start(now);
      servo1.stop(now + 0.31);

      const bips = [659.25, 987.77, 1318.5];
      bips.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + 0.12 + i * 0.07);
        g.gain.setValueAtTime(0.14 * scale, now + 0.12 + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 0.19 + i * 0.07);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + 0.12 + i * 0.07);
        osc.stop(now + 0.2 + i * 0.07);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
      gain.gain.setValueAtTime(0.16 * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  }

  public playVictoryFanfare() {
    const scale = this.getEffectiveFanfareScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const melody = [
      { freq: 523.25, time: 0, dur: 0.13 },
      { freq: 659.25, time: 0.12, dur: 0.13 },
      { freq: 783.99, time: 0.24, dur: 0.13 },
      { freq: 1046.5, time: 0.37, dur: 0.45 },
      { freq: 783.99, time: 0.37, dur: 0.45 },
    ];

    melody.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now + n.time);

      gain.gain.setValueAtTime(0.22 * scale, now + n.time);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur + 0.02);
    });
  }

  public playAnimalSound(animal: 'cat' | 'dog' | 'frog' | 'bird') {
    const scale = this.getEffectiveFanfareScale();
    if (scale <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (animal === 'cat') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
      gain.gain.setValueAtTime(0.22 * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.37);
    } else if (animal === 'dog') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.09);
      osc.frequency.setValueAtTime(230, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.25);
      gain.gain.setValueAtTime(0.16 * scale, now);
      gain.gain.setValueAtTime(0.02 * scale, now + 0.11);
      gain.gain.setValueAtTime(0.16 * scale, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } else if (animal === 'frog') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.18);
      gain.gain.setValueAtTime(0.14 * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
      osc.frequency.setValueAtTime(1150, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.22);
      gain.gain.setValueAtTime(0.16 * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }
}

export const soundEngine = new SoundAndSpeechEngine();
