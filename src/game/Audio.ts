class AmbientSwell {
    private osc1: OscillatorNode | null = null;
    private osc2: OscillatorNode | null = null;
    private filter: BiquadFilterNode | null = null;
    private gainNode: GainNode | null = null;
    private ctx: AudioContext;

    constructor(ctx: AudioContext, output: AudioNode) {
        this.ctx = ctx;
        
        // Setup BiquadFilter to make a warm, low drone
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.setValueAtTime(140, ctx.currentTime);
        this.filter.Q.setValueAtTime(1.5, ctx.currentTime);

        this.gainNode = ctx.createGain();
        this.gainNode.gain.setValueAtTime(0, ctx.currentTime);

        // Connect nodes
        this.filter.connect(this.gainNode);
        this.gainNode.connect(output);
    }

    public start(freq1: number, freq2: number) {
        if (!this.filter || !this.gainNode) return;

        // Clean up previous nodes if any
        this.stop();

        // detuned saw/triangle hybrid for wide spacey texture
        this.osc1 = this.ctx.createOscillator();
        this.osc1.type = 'triangle';
        this.osc1.frequency.setValueAtTime(freq1, this.ctx.currentTime);

        this.osc2 = this.ctx.createOscillator();
        this.osc2.type = 'sawtooth';
        // Detune slightly for lush chorus effect
        this.osc2.frequency.setValueAtTime(freq2 + 0.5, this.ctx.currentTime);

        this.osc1.connect(this.filter);
        this.osc2.connect(this.filter);

        this.osc1.start();
        this.osc2.start();

        // Smoothly fade in ambient sound to prevent pops
        this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 3.0);
    }

    public updateFreq(freq1: number, freq2: number) {
        const now = this.ctx.currentTime;
        if (this.osc1) {
            this.osc1.frequency.cancelScheduledValues(now);
            this.osc1.frequency.exponentialRampToValueAtTime(freq1, now + 1.2);
        }
        if (this.osc2) {
            this.osc2.frequency.cancelScheduledValues(now);
            this.osc2.frequency.exponentialRampToValueAtTime(freq2 + 0.5, now + 1.2);
        }
    }

    public updateFilter(intensity: number) {
        if (!this.filter || !this.gainNode) return;
        const now = this.ctx.currentTime;
        // Sweeps filter wider as battle intensifies, creating brightness and tension
        // Peace: 120Hz, Extreme Combat: 420Hz
        const cutoff = 110 + (intensity * 350);
        this.filter.frequency.setTargetAtTime(cutoff, now, 0.4);

        // Ambience gain scales up to 0.45 when active
        const targetGain = 0.25 + (intensity * 0.2);
        this.gainNode.gain.setTargetAtTime(targetGain, now, 0.3);
    }

    public stop() {
        const now = this.ctx.currentTime;
        
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
            this.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        }

        const o1 = this.osc1;
        const o2 = this.osc2;
        
        setTimeout(() => {
            try {
                if (o1) { o1.stop(); o1.disconnect(); }
                if (o2) { o2.stop(); o2.disconnect(); }
            } catch (err) {
                // Ignore silent errors
            }
        }, 150);

        this.osc1 = null;
        this.osc2 = null;
    }
}

export class CombatSoundtrack {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private ambientSwell: AmbientSwell | null = null;
    private delayNode: DelayNode | null = null;
    private delayGain: GainNode | null = null;

    // adaptive state
    public currentIntensity: number = 0; // 0.0 (peace) to 1.0 (climax battle)
    private targetIntensity: number = 0;
    private isMuted: boolean = false;
    private isPlaying: boolean = false;

    // Scheduler states
    private schedulerTimerId: any = null;
    private nextStepTime: number = 0;
    private currentStep: number = 0;
    private bpm: number = 124;

    // Harmonies (F minor natural, F Phrygian / epic sci-fi modes)
    // 4 bars chord progression: F-minor, Eb-Major, Db-Major, C-Phrygian/Major
    private chords: number[][] = [
        [41, 48, 53, 56, 60], // F min (F3, C4, F4, Ab4, C5)
        [39, 46, 51, 55, 58], // Eb Maj (Eb3, Bb3, Eb4, G4, Bb4)
        [37, 44, 49, 53, 56], // Db Maj (Db3, Ab3, Db4, F4, Ab4)
        [36, 43, 48, 52, 55]  // C Dominant / Phrygian tail (C3, G3, C4, E4, G4)
    ];
    private currentChordIndex: number = 0;

    constructor() {
        // Audio is initialized only upon first interface click/touch
    }

    public init() {
        if (this.ctx) return;

        try {
            // @ts-ignore - Support standard and legacy webkit audio context
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.44, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // Set up lush delay feedback for plucks & melodies
            this.delayNode = this.ctx.createDelay(1.2);
            // Delay at 3/16 note time (standard synth delay style fraction)
            const stepDuration = 60 / this.bpm / 4;
            this.delayNode.delayTime.setValueAtTime(stepDuration * 3, this.ctx.currentTime);

            this.delayGain = this.ctx.createGain();
            this.delayGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

            // Feedback loop: delay -> delayGain -> delay
            this.delayNode.connect(this.delayGain);
            this.delayGain.connect(this.delayNode);

            // Connect delay output to master output
            this.delayNode.connect(this.masterGain);

            // Create ambient swell synthesizer
            this.ambientSwell = new AmbientSwell(this.ctx, this.masterGain);
        } catch (e) {
            console.error("Failed to initialize modern Web Audio context:", e);
        }
    }

    public start() {
        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.isPlaying) return;
        this.isPlaying = true;

        const now = this.ctx.currentTime;
        this.nextStepTime = now + 0.1;
        this.currentStep = 0;
        this.currentChordIndex = 0;

        // Fire up low ambient drones
        const currentChord = this.chords[this.currentChordIndex];
        const f1 = this.midiToFreq(currentChord[0]); // Root bass
        const f2 = this.midiToFreq(currentChord[1]); // Fifth/Harmonic
        this.ambientSwell?.start(f1, f2);

        // Kick off precise grid clock scheduler
        this.schedulerTimerId = setInterval(() => this.scheduleLoop(), 25);
    }

    public stop() {
        this.isPlaying = false;
        
        if (this.schedulerTimerId) {
            clearInterval(this.schedulerTimerId);
            this.schedulerTimerId = null;
        }

        this.ambientSwell?.stop();

        // Force cleanup of scheduler sounds if any
        this.currentIntensity = 0;
        this.targetIntensity = 0;
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
        if (this.masterGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.44, now, 0.15);
        }
    }

    public toggleMute(): boolean {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    public getMuteState(): boolean {
        return this.isMuted;
    }

    public update(dt: number) {
        if (!this.ctx || !this.isPlaying) return;

        // Glide the current combat intensity smoothly towards target intensity
        // Rise quickly (so action sounds instantly hit), but decay more slowly
        const rate = this.targetIntensity > this.currentIntensity ? 1.0 : 0.35;
        this.currentIntensity += (this.targetIntensity - this.currentIntensity) * rate * dt;
        
        // Clamp bounds
        this.currentIntensity = Math.max(0, Math.min(1.0, this.currentIntensity));

        // Let the low pass synth respond to intensity sweeps
        this.ambientSwell?.updateFilter(this.currentIntensity);
    }

    public setIntensity(intensity: number) {
        this.targetIntensity = Math.min(1.0, Math.max(0, intensity));
    }

    private scheduleLoop() {
        if (!this.ctx || !this.isPlaying) return;

        const lookahead = 0.1; // 100ms scheduler lookahead
        const now = this.ctx.currentTime;

        while (this.nextStepTime < now + lookahead) {
            this.scheduleStep(this.currentStep, this.nextStepTime);
            
            // Increment steps modulo 16
            this.currentStep = (this.currentStep + 1) % 16;
            
            // Time to next 16th note step
            const stepDuration = 60 / this.bpm / 4;
            this.nextStepTime += stepDuration;

            // Every 32 steps (2 full bars), change chords to evolve the battlefield mood!
            if (this.currentStep === 0 && Math.random() < 0.6) {
                this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
                const nextChord = this.chords[this.currentChordIndex];
                const f1 = this.midiToFreq(nextChord[0]);
                const f2 = this.midiToFreq(nextChord[1]);
                this.ambientSwell?.updateFreq(f1, f2);
            }
        }
    }

    private scheduleStep(step: number, time: number) {
        const ctx = this.ctx!;
        const intensity = this.currentIntensity;

        // Beat patterns trigger relative to combat intensity
        const playPercussion = intensity > 0.28;
        const playAggressiveArp = intensity > 0.42;

        // 1. Kick Drum (Plays on beats 1, 5, 9, 13)
        const isKickStep = step === 0 || step === 4 || step === 8 || step === 12;
        if (playPercussion && isKickStep) {
            this.synthesizeKick(time, intensity);
        }

        // Off-beat sub kick on epic intensity
        if (intensity > 0.7 && (step === 6 || step === 14)) {
            this.synthesizeKick(time, intensity * 0.5);
        }

        // 2. Tactical Hit/Hi-Hat (Plays on off-beats or ticking 16ths)
        const isHatStep = step % 4 === 2; // Off-beats
        const isTickerStep = step % 2 === 1; // Double cadence
        if (playPercussion) {
            if (isHatStep) {
                this.synthesizeHihat(time, 0.15 + (intensity * 0.12));
            } else if (isTickerStep && intensity > 0.55 && Math.random() < 0.8) {
                this.synthesizeHihat(time, 0.05 + (intensity * 0.05));
            }
        }

        // 3. Synth Bassline Sequence (8th or 16th notes)
        // Root bassline plays even when idle but quiet, gets loud and bright in battle
        const isBassStep = step % 2 === 0; // 8th notes cadence
        if (isBassStep) {
            this.synthesizeBass(step, time, intensity);
        }

        // 4. Kinetic Melody sweeps or random echoes on epic threat level
        if (intensity > 0.45 && (step === 3 || step === 7 || step === 11 || step === 13)) {
            if (Math.random() < 0.6) {
                this.synthesizePluck(time, intensity);
            }
        }
    }

    // --- SYNTHESIZERS ---

    private synthesizeKick(time: number, intensity: number) {
        const ctx = this.ctx!;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        
        // Fast pitch sweep (classic electronic kick click)
        osc.frequency.setValueAtTime(150, time);
        // Exponential bend down to sub frequencies (48Hz) in 40ms
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.06);

        // Volume envelope
        gain.gain.setValueAtTime(0, time);
        // Instant strike attack
        gain.gain.linearRampToValueAtTime(0.68 * Math.min(1.0, intensity + 0.3), time + 0.003);
        // Sweet exponential body decay
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(time);
        osc.stop(time + 0.16);
    }

    private synthesizeHihat(time: number, volume: number) {
        const ctx = this.ctx!;
        // Synthesizing high percussion using rapid Noise or high-pass frequency
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        // 8000Hz detuned square wave for high metal tick
        osc.type = 'square';
        osc.frequency.setValueAtTime(9500, time);
        osc.frequency.exponentialRampToValueAtTime(8000, time + 0.02);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.3, time + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.032);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(time);
        osc.stop(time + 0.04);
    }

    private synthesizeBass(step: number, time: number, intensity: number) {
        const ctx = this.ctx!;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        const currentChord = this.chords[this.currentChordIndex];
        
        // Evolve sequence notes depending on the grid step (melodic industrial bass pattern)
        let noteMidi = currentChord[0] - 12; // Drop root 1 octave down
        if (step === 4 || step === 12) {
            noteMidi = currentChord[1] - 12; // Evolve to 5th note
        } else if (step === 8) {
            noteMidi = currentChord[2] - 12; // Evolve to 3rd note
        } else if (step === 10 || step === 14) {
            noteMidi = currentChord[3] - 12; // Evolve to minor 7th / other scale note
        }

        const baseFreq = this.midiToFreq(noteMidi);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, time);

        // Slide the bass frequency slightly between steps for acid synth portamento feel!
        if (Math.random() < 0.45) {
            osc.frequency.linearRampToValueAtTime(baseFreq * 1.05, time + 0.05);
        }

        filter.type = 'lowpass';
        // Open lowpass filter dynamically with high combat levels for aggressive drive
        const baseCutoff = 110 + (intensity * 180);
        filter.frequency.setValueAtTime(baseCutoff, time);
        filter.frequency.exponentialRampToValueAtTime(80, time + 0.09);
        filter.Q.setValueAtTime(2, time);

        // Gain envelope - Bass becomes prominent as threat level escalates
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.02 + (intensity * 0.18), time + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.095);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(time);
        osc.stop(time + 0.1);
    }

    private synthesizePluck(time: number, intensity: number) {
        const ctx = this.ctx!;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Pentatonic scale of the active chord
        const currentChord = this.chords[this.currentChordIndex];
        // Selected random higher harmonic note
        const noteIndex = Math.floor(Math.random() * 3) + 2; // chord elements 2, 3, or 4
        let noteMidi = currentChord[noteIndex];

        // Evolve octave based on tension
        if (intensity > 0.8 && Math.random() < 0.4) {
            noteMidi += 12; // Surge it an octave higher for peak excitement!
        }

        const freq = this.midiToFreq(noteMidi);
        osc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.04 + (intensity * 0.09), time + 0.002);
        // Beautiful slow exponential ring
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

        // Route into lush Feedback DELAY node!
        osc.connect(gain);
        if (this.delayNode) {
            gain.connect(this.delayNode);
        }
        // Also connect directly to main mix for presence
        gain.connect(this.masterGain!);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    private midiToFreq(note: number): number {
        return 440 * Math.pow(2, (note - 69) / 12);
    }
}

export const soundtrackEngine = new CombatSoundtrack();
