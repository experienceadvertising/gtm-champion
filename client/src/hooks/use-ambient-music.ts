import { useEffect, useRef, useCallback, useState } from "react";

const MUTED_KEY = "gtm_music_muted";

export function useAmbientMusic(autoPlay = false) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const stoppedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(MUTED_KEY) === "true");

  const stop = useCallback(() => {
    stoppedRef.current = true;
    setIsPlaying(false);

    for (const id of intervalsRef.current) clearInterval(id);
    intervalsRef.current = [];
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];

    for (const node of nodesRef.current) {
      try {
        if (node instanceof OscillatorNode) node.stop();
      } catch {}
      try { node.disconnect(); } catch {}
    }
    nodesRef.current = [];

    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== "closed") {
      ctx.close().catch(() => {});
    }
  }, []);

  const start = useCallback(() => {
    if (ctxRef.current || stoppedRef.current) return;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      stoppedRef.current = false;

      const isAlive = () => !stoppedRef.current && ctxRef.current === ctx && ctx.state !== "closed";

      const master = ctx.createGain();
      master.gain.value = 0.2;
      master.connect(ctx.destination);
      nodesRef.current.push(master);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.ratio.value = 4;
      compressor.connect(master);
      nodesRef.current.push(compressor);

      const trackNode = (n: AudioNode) => { nodesRef.current.push(n); };
      const untrackNodes = (...nodes: AudioNode[]) => {
        nodesRef.current = nodesRef.current.filter(n => !nodes.includes(n));
      };

      const createPad = (freq: number, detune: number, vol: number) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const gain = ctx.createGain();
        gain.gain.value = vol;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1200;
        filter.Q.value = 1.5;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(compressor);
        osc.start();

        trackNode(osc); trackNode(gain); trackNode(filter);

        const drift = () => {
          if (!isAlive()) return;
          const now = ctx.currentTime;
          filter.frequency.exponentialRampToValueAtTime(800 + Math.random() * 800, now + 2);
          gain.gain.linearRampToValueAtTime(vol * (0.7 + Math.random() * 0.3), now + 2);
        };
        const id = setInterval(drift, 2500);
        intervalsRef.current.push(id);
        drift();
      };

      createPad(130.81, 0, 0.18);
      createPad(196, 4, 0.12);
      createPad(261.63, -3, 0.1);
      createPad(392, 6, 0.06);

      const bpm = 128;
      const beatInterval = (60 / bpm) * 1000;

      let beatCount = 0;
      const playBeat = () => {
        if (!isAlive()) return;
        try {
          const now = ctx.currentTime;
          const isKick = beatCount % 4 === 0;
          const isSnare = beatCount % 4 === 2;

          if (isKick) {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(compressor);
            osc.start(now);
            osc.stop(now + 0.25);
            osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} untrackNodes(osc, gain); };
          }

          if (isSnare) {
            const bufferSize = ctx.sampleRate * 0.08;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.06, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            const hpf = ctx.createBiquadFilter();
            hpf.type = "highpass";
            hpf.frequency.value = 2000;
            noise.connect(hpf);
            hpf.connect(noiseGain);
            noiseGain.connect(compressor);
            noise.start(now);
            noise.stop(now + 0.08);
            noise.onended = () => { try { noise.disconnect(); hpf.disconnect(); noiseGain.disconnect(); } catch {} untrackNodes(noise, hpf, noiseGain); };
          }

          {
            const bufferSize = ctx.sampleRate * 0.03;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const hatGain = ctx.createGain();
            hatGain.gain.setValueAtTime(beatCount % 2 === 0 ? 0.04 : 0.025, now);
            hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            const hpf = ctx.createBiquadFilter();
            hpf.type = "highpass";
            hpf.frequency.value = 6000;
            noise.connect(hpf);
            hpf.connect(hatGain);
            hatGain.connect(compressor);
            noise.start(now);
            noise.stop(now + 0.03);
            noise.onended = () => { try { noise.disconnect(); hpf.disconnect(); hatGain.disconnect(); } catch {} untrackNodes(noise, hpf, hatGain); };
          }

          beatCount++;
        } catch {}
      };

      const beatId = setInterval(playBeat, beatInterval);
      intervalsRef.current.push(beatId);

      const arpNotes = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 523.25, 392];
      let arpIndex = 0;
      const arpTime = beatInterval / 2;

      const playArpNote = () => {
        if (!isAlive()) return;
        try {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          osc.type = "square";
          osc.frequency.value = arpNotes[arpIndex % arpNotes.length];
          arpIndex++;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.035, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 1800 + Math.random() * 600;
          filter.Q.value = 2;

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(compressor);
          osc.start(now);
          osc.stop(now + 0.35);

          osc.onended = () => { try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch {} untrackNodes(osc, gain, filter); };
        } catch {}
      };

      const arpId = setInterval(playArpNote, arpTime);
      intervalsRef.current.push(arpId);

      const bassNotes = [130.81, 130.81, 164.81, 196];
      let bassIndex = 0;

      const playBass = () => {
        if (!isAlive()) return;
        try {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.value = bassNotes[bassIndex % bassNotes.length];
          bassIndex++;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
          gain.gain.linearRampToValueAtTime(0.05, now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 400;
          filter.Q.value = 3;

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(compressor);
          osc.start(now);
          osc.stop(now + 0.45);

          osc.onended = () => { try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch {} untrackNodes(osc, gain, filter); };
        } catch {}
      };

      const bassId = setInterval(playBass, beatInterval * 2);
      intervalsRef.current.push(bassId);

      const playChime = () => {
        if (!isAlive()) return;
        try {
          const now = ctx.currentTime;
          const freq = [783.99, 1046.5, 1318.5, 1567.98][Math.floor(Math.random() * 4)];

          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.03, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

          osc.connect(gain);
          gain.connect(compressor);
          osc.start(now);
          osc.stop(now + 2);

          osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} untrackNodes(osc, gain); };

          const nextDelay = 1500 + Math.random() * 2500;
          const tid = setTimeout(playChime, nextDelay);
          timeoutsRef.current.push(tid);
        } catch {}
      };

      const tid = setTimeout(playChime, 800);
      timeoutsRef.current.push(tid);

      setIsPlaying(true);
    } catch {
      stop();
    }
  }, [stop]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      localStorage.removeItem(MUTED_KEY);
      stoppedRef.current = false;
      start();
    } else {
      setIsMuted(true);
      localStorage.setItem(MUTED_KEY, "true");
      stop();
    }
  }, [isMuted, start, stop]);

  useEffect(() => {
    if (autoPlay && !isMuted && !ctxRef.current && !stoppedRef.current) {
      const timer = setTimeout(() => {
        if (!stoppedRef.current) start();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isMuted, start]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { start, stop, isPlaying, isMuted, toggleMute };
}
