/**
 * Native Web Audio API Sound Synthesizer
 * Zero external audio assets required; synthesized in real time.
 */

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('click', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });
    }
  }

  public unlockAudio(): boolean {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
        return true;
      }
      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Bid Sound: Upward frequency sweep (600 Hz -> 900 Hz)
   */
  public playBidChirp() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // Audio playback failed silently
    }
  }

  /**
   * Gavel Hammer / Impact: Dual-decay low-frequency impact (120 Hz) with wood snap
   */
  public playGavelHammer() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Low frequency thud (120 Hz)
      const oscLow = ctx.createOscillator();
      const gainLow = ctx.createGain();
      oscLow.type = 'triangle';
      oscLow.frequency.setValueAtTime(140, now);
      oscLow.frequency.exponentialRampToValueAtTime(45, now + 0.28);

      gainLow.gain.setValueAtTime(0.4, now);
      gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      oscLow.connect(gainLow);
      gainLow.connect(ctx.destination);

      oscLow.start(now);
      oscLow.stop(now + 0.32);

      // 2. High snap (wood click)
      const oscSnap = ctx.createOscillator();
      const gainSnap = ctx.createGain();
      oscSnap.type = 'square';
      oscSnap.frequency.setValueAtTime(1200, now);
      oscSnap.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gainSnap.gain.setValueAtTime(0.3, now);
      gainSnap.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      oscSnap.connect(gainSnap);
      gainSnap.connect(ctx.destination);

      oscSnap.start(now);
      oscSnap.stop(now + 0.07);

      // Second strike echo at 140ms
      setTimeout(() => {
        try {
          if (!ctx) return;
          const t2 = ctx.currentTime;
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(110, t2);
          osc2.frequency.exponentialRampToValueAtTime(40, t2 + 0.2);

          gain2.gain.setValueAtTime(0.25, t2);
          gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.22);

          osc2.connect(gain2);
          gain2.connect(ctx.destination);

          osc2.start(t2);
          osc2.stop(t2 + 0.23);
        } catch {}
      }, 140);
    } catch (e) {}
  }

  public playGavelImpact() {
    this.playGavelHammer();
  }

  /**
   * Unsold Buzzer: Low-pitch sawtooth pulse (150 Hz)
   */
  public playUnsoldBuzzer() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(135, now + 0.4);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch (e) {}
  }

  public playBuzzer() {
    this.playUnsoldBuzzer();
  }

  /**
   * Timer Tick / Soft Click: Short impulse click
   */
  public playTimerTick(isUrgent: boolean = false) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isUrgent ? 1600 : 1200, now);

      const duration = isUrgent ? 0.05 : 0.03;
      gain.gain.setValueAtTime(isUrgent ? 0.15 : 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch (e) {}
  }

  public playSoftClick() {
    this.playTimerTick(false);
  }
}

export const audioEngine = new WebAudioEngine();
