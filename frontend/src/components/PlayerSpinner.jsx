import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

// Web Audio API helper for generated sounds
class SoundGenerator {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTick() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  playWin() {
    if (!this.audioCtx) return;
    // Play a nice major chord (C major)
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    frequencies.forEach((freq, i) => {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Stagger the start slightly for a strum effect
      const startTime = this.audioCtx.currentTime + (i * 0.05);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 2);
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 2);
    });
  }
}

/**
 * @param {object[]} players
 * @param {string} winnerId
 * @param {() => void} [onComplete]
 * @param {string} [spinKey] stable identity for this spin (e.g. started_at) —
 *   public boards poll every ~1.5s and pass a new `players` array each time;
 *   without a stable key the animation restarts every poll.
 */
const PlayerSpinner = ({ players, winnerId, onComplete, spinKey }) => {
  const canvasRef = useRef(null);
  const [winner, setWinner] = useState(null);
  const [showWinnerCard, setShowWinnerCard] = useState(false);
  const soundGenRef = useRef(new SoundGenerator());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Keep latest players for drawing without re-triggering the effect
  const playersRef = useRef(players);
  playersRef.current = players;

  // Animation refs
  const requestRef = useRef();
  const startTimeRef = useRef();
  const currentRotationRef = useRef(0);
  const lastTickSliceRef = useRef(-1);
  const runningSpinIdRef = useRef(null);

  // Constants
  const colors = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
    '#10B981', '#06B6D4', '#6366F1', '#D946EF', '#F43F5E',
  ];

  const wheelCacheRef = useRef(null);

  // Stable identity: only restart when the spin itself changes, not on poll re-renders
  // Prefer explicit spinKey (started_at). Fall back to winner + player ids string.
  const playerIdsKey = Array.isArray(players)
    ? players.map((p) => p?.id).filter(Boolean).join(',')
    : '';
  const spinIdentity =
    spinKey != null && String(spinKey) !== ''
      ? String(spinKey)
      : `${winnerId || ''}|${playerIdsKey}`;

  useEffect(() => {
    // Same spin already running — do not cancel/restart (polls used to re-trigger every ~1.5s)
    if (runningSpinIdRef.current === spinIdentity) {
      return undefined;
    }
    runningSpinIdRef.current = spinIdentity;

    // Reset animation state for a new spin only
    setShowWinnerCard(false);
    startTimeRef.current = undefined;
    lastTickSliceRef.current = -1;
    currentRotationRef.current = 0;

    const list = playersRef.current;
    if (!list || list.length === 0 || !winnerId) {
      onCompleteRef.current?.();
      return undefined;
    }

    const targetWinner = list.find((p) => p.id === winnerId);
    if (!targetWinner) {
      onCompleteRef.current?.();
      return undefined;
    }

    // Snapshot list for this spin so later prop updates cannot affect drawing
    const listSnapshot = list.map((p) => ({ ...p }));

    setWinner(targetWinner);
    soundGenRef.current.init();

    preRenderWheel(listSnapshot);
    drawFrame(0);

    const timer = setTimeout(() => {
      startSpin(listSnapshot, winnerId, spinIdentity);
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Only cancel if this effect's spin is still the active one
      if (runningSpinIdRef.current === spinIdentity) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
        runningSpinIdRef.current = null;
      }
    };
  }, [spinIdentity, winnerId]);

  const preRenderWheel = (list) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d', { alpha: true });

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const count = list.length || 1;
    const sliceAngle = (2 * Math.PI) / count;

    list.forEach((player, index) => {
      const startAngle = index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';

      const fontSize = Math.max(8, Math.min(24, (radius * Math.PI * 2) / count - 8));
      ctx.font = `bold ${fontSize}px sans-serif`;

      ctx.fillText(player.name, radius - 20, 0);
      ctx.restore();
    });

    wheelCacheRef.current = canvas;
  };

  const drawFrame = (rotationAngle) => {
    const canvas = canvasRef.current;
    if (!canvas || !wheelCacheRef.current) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.fillStyle = '#000000';
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationAngle);
    ctx.drawImage(wheelCacheRef.current, -centerX, -centerY);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY - radius - 10);
    ctx.lineTo(centerX + 15, centerY - radius - 10);
    ctx.lineTo(centerX, centerY - radius + 20);
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const startSpin = (list, winId, identity) => {
    if (!list?.length || !winId) return;

    const winnerIndex = list.findIndex((p) => p.id === winId);
    if (winnerIndex === -1) return;

    const sliceAngle = (2 * Math.PI) / list.length;

    // Winner slice center lands at top pointer (-PI/2)
    const targetOffset =
      -(Math.PI / 2) - winnerIndex * sliceAngle - sliceAngle / 2;
    const totalRotations = 8 * 2 * Math.PI;
    const targetAngle = totalRotations + targetOffset;
    const duration = 6000;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (time) => {
      // Abort if a newer spin superseded this one
      if (runningSpinIdRef.current !== identity) return;

      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const currentAngle = easeOut(progress) * targetAngle;

      drawFrame(currentAngle);

      const normalizedAngle = currentAngle % (2 * Math.PI);
      let angleAtPointer = (-normalizedAngle - Math.PI / 2) % (2 * Math.PI);
      if (angleAtPointer < 0) angleAtPointer += 2 * Math.PI;

      const currentSliceIndex = Math.floor(angleAtPointer / sliceAngle);

      if (
        currentSliceIndex !== lastTickSliceRef.current &&
        lastTickSliceRef.current !== -1
      ) {
        soundGenRef.current.playTick();
      }
      lastTickSliceRef.current = currentSliceIndex;

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        soundGenRef.current.playWin();
        setShowWinnerCard(true);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 3000);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      {/*
        Use vmin so width === height always (true circle).
        Avoid h-full + max-h alone — that stretches the canvas on wide boards.
      */}
      <div
        className="relative shrink-0"
        style={{
          width: 'min(85vmin, 42rem)',
          height: 'min(85vmin, 42rem)',
        }}
      >
        {/* Canvas for the Wheel — 1:1 display box matches 800×800 bitmap */}
        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
            showWinnerCard ? 'opacity-30 blur-sm' : 'opacity-100'
          }`}
          style={{ aspectRatio: '1 / 1' }}
        />

        {/* Winner Presentation Card (Shows after spin) */}
        {showWinnerCard && winner && (
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-500">
            <Card className="z-10 flex w-[min(22rem,90%)] flex-col items-center justify-center overflow-hidden border-2 border-amber-400 bg-gradient-to-br from-[#1a1f3a] to-[#2a1f3a] p-6 shadow-[0_0_50px_rgba(251,191,36,0.6)] sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-amber-400 sm:mb-6">
                Next Player Selected
              </h2>

              {winner.photo_url ? (
                <img
                  src={winner.photo_url}
                  alt={winner.name}
                  className="mb-4 h-28 w-28 rounded-full border-4 border-amber-400 object-cover shadow-xl sm:mb-6 sm:h-40 sm:w-40"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      winner.name
                    )}&background=random`;
                  }}
                />
              ) : (
                <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-400 bg-gradient-to-br from-red-500 to-red-700 shadow-xl sm:mb-6 sm:h-40 sm:w-40">
                  <span className="text-5xl font-bold text-white sm:text-6xl">
                    {(winner.name || '?').charAt(0)}
                  </span>
                </div>
              )}

              <h3 className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
                {winner.name}
              </h3>

              <div className="mb-2 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                  {winner.position || 'Player'}
                </span>
                {winner.base_price != null && (
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/20 px-3 py-1 text-sm font-bold text-amber-400">
                    Base: ₹{Number(winner.base_price).toLocaleString()}
                  </span>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSpinner;
