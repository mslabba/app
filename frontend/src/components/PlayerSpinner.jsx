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

const PlayerSpinner = ({ players, winnerId, onComplete }) => {
  const canvasRef = useRef(null);
  const [winner, setWinner] = useState(null);
  const [showWinnerCard, setShowWinnerCard] = useState(false);
  const soundGenRef = useRef(new SoundGenerator());
  
  // Animation refs
  const requestRef = useRef();
  const startTimeRef = useRef();
  const currentRotationRef = useRef(0);
  const lastTickSliceRef = useRef(-1);

  // Constants
  const colors = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', 
    '#10B981', '#06B6D4', '#6366F1', '#D946EF', '#F43F5E'
  ];
  
  const wheelCacheRef = useRef(null);

  useEffect(() => {
    if (!players || players.length === 0 || !winnerId) {
      if (onComplete) onComplete();
      return;
    }

    const targetWinner = players.find(p => p.id === winnerId);
    if (!targetWinner) {
      if (onComplete) onComplete();
      return;
    }

    setWinner(targetWinner);
    soundGenRef.current.init();

    // Pre-render the wheel
    preRenderWheel();

    // Start drawing
    drawFrame(0);

    // Small delay before spinning
    const timer = setTimeout(() => {
      startSpin();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [winnerId, players]);

  const preRenderWheel = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d', { alpha: true });
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    const sliceAngle = (2 * Math.PI) / players.length;

    // Draw slices
    players.forEach((player, index) => {
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
      
      const fontSize = Math.max(8, Math.min(24, (radius * Math.PI * 2) / players.length - 8));
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

    // Fast clear with dark background
    ctx.fillStyle = '#000000'; // or clearRect if preferred, but a solid background is faster
    ctx.clearRect(0, 0, width, height);

    // Draw cached wheel with rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationAngle);
    ctx.drawImage(wheelCacheRef.current, -centerX, -centerY);
    ctx.restore();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1b4b'; 
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fbbf24'; 
    ctx.stroke();

    // Draw pointer at the top
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

  const startSpin = () => {
    if (!players || !winnerId) return;

    const winnerIndex = players.findIndex(p => p.id === winnerId);
    if (winnerIndex === -1) return;

    const sliceAngle = (2 * Math.PI) / players.length;
    
    // We want the winner slice to land at the top pointer (-PI/2)
    // The center of the winner slice is at index * sliceAngle + sliceAngle/2
    // We rotate backwards so it lands at -PI/2
    const targetOffset = - (Math.PI / 2) - (winnerIndex * sliceAngle) - (sliceAngle / 2);
    
    // Add multiple full rotations (e.g., 8 rotations)
    const totalRotations = 8 * 2 * Math.PI;
    
    // Total angle to rotate
    const targetAngle = totalRotations + targetOffset;

    // Animation duration in ms
    const duration = 6000; 

    // Easing function (cubic ease-out)
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (time) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentEasedProgress = easeOut(progress);
      const currentAngle = currentEasedProgress * targetAngle;
      
      drawFrame(currentAngle);
      
      // Calculate which slice is currently at the top pointer to play tick sound
      // The pointer is at -PI/2 relative to the center
      // Slice angle position = (currentAngle + index * sliceAngle) % 2PI
      // To find the slice under the pointer:
      const normalizedAngle = currentAngle % (2 * Math.PI);
      // The angle of the wheel at the top pointer is -normalizedAngle - PI/2
      let angleAtPointer = (-normalizedAngle - Math.PI/2) % (2 * Math.PI);
      if (angleAtPointer < 0) angleAtPointer += 2 * Math.PI;
      
      const currentSliceIndex = Math.floor(angleAtPointer / sliceAngle);
      
      if (currentSliceIndex !== lastTickSliceRef.current && lastTickSliceRef.current !== -1) {
        soundGenRef.current.playTick();
      }
      lastTickSliceRef.current = currentSliceIndex;

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        // Animation finished
        soundGenRef.current.playWin();
        setShowWinnerCard(true);
        
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 3000); // Show winner card for 3 seconds
      }
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      
      <div className="relative w-full max-w-3xl aspect-square flex items-center justify-center">
        {/* Canvas for the Wheel */}
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={800} 
          className={`w-full h-full max-w-[80vw] max-h-[80vh] transition-opacity duration-500 ${showWinnerCard ? 'opacity-30 blur-sm' : 'opacity-100'}`}
        />

        {/* Winner Presentation Card (Shows after spin) */}
        {showWinnerCard && winner && (
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-500">
            <Card className="w-96 bg-gradient-to-br from-[#1a1f3a] to-[#2a1f3a] border-amber-400 border-2 shadow-[0_0_50px_rgba(251,191,36,0.6)] overflow-hidden flex flex-col items-center justify-center p-8 z-10">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
              
              <h2 className="text-amber-400 font-bold uppercase tracking-widest mb-6 text-sm">Next Player Selected</h2>
              
              {winner.photo_url ? (
                <img 
                  src={winner.photo_url} 
                  alt={winner.name} 
                  className="w-40 h-40 object-cover rounded-full border-4 border-amber-400 mb-6 shadow-xl"
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(winner.name)}&background=random`; }}
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-4 border-amber-400 mb-6 flex items-center justify-center shadow-xl">
                  <span className="text-6xl font-bold text-white">{winner.name.charAt(0)}</span>
                </div>
              )}
              
              <h3 className="text-3xl font-bold text-white text-center mb-2">{winner.name}</h3>
              
              <div className="flex gap-2 mb-4">
                <span className="bg-white/10 text-white px-3 py-1 rounded-full text-sm">{winner.position || 'Player'}</span>
                {winner.category_id && <span className="bg-amber-400/20 text-amber-400 px-3 py-1 rounded-full text-sm font-bold border border-amber-400/50">Base: ₹{winner.base_price?.toLocaleString()}</span>}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSpinner;
