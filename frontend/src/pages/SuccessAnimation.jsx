import React, { useState } from 'react';
import { Gavel, Trophy } from 'lucide-react';

const PlayerCard = () => {
  const [isSold, setIsSold] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const handleSold = () => {
    setShowAnimation(true);
    setTimeout(() => setIsSold(true), 100);
  };

  const handleReset = () => {
    setIsSold(false);
    setShowAnimation(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        {/* Player Card */}
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Card Content */}
          <div className="relative z-10">
            {/* Player Image Area */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 h-64 flex items-center justify-center">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl">
                ⚽
              </div>
            </div>

            {/* Player Info */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">John Doe</h2>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <span className="text-sm">Forward</span>
                <span className="text-sm">•</span>
                <span className="text-sm">Team A</span>
              </div>

              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600">Current Bid</div>
                <div className="text-3xl font-bold text-purple-600">$50,000</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSold}
                  disabled={isSold}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Gavel size={20} />
                  Sell Player
                </button>
                {isSold && (
                  <button
                    onClick={handleReset}
                    className="bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sold Overlay and Animations */}
          {showAnimation && (
            <>
              {/* Confetti particles */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '-10px',
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6'][Math.floor(Math.random() * 5)]
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Flash effect */}
              <div className="absolute inset-0 bg-white animate-flash z-30 pointer-events-none" />

              {/* Sold stamp */}
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="animate-stamp">
                  <div className="relative">
                    {/* Stamp border and background */}
                    <div className="bg-red-600 text-white font-black text-6xl px-12 py-6 border-8 border-red-600 rounded-lg transform -rotate-12 shadow-2xl">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white opacity-20 rounded" />
                        <div className="relative flex items-center gap-4">
                          <Trophy size={48} />
                          <span>SOLD!</span>
                        </div>
                      </div>
                    </div>

                    {/* Shine effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-lg -rotate-12">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-shine" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Celebration rings */}
              <div className="absolute inset-0 flex items-center justify-center z-35 pointer-events-none">
                <div className="absolute w-32 h-32 border-4 border-yellow-400 rounded-full animate-ping" />
                <div className="absolute w-48 h-48 border-4 border-green-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes stamp {
          0% {
            transform: scale(0) rotate(-12deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(-12deg);
          }
          100% {
            transform: scale(1) rotate(-12deg);
            opacity: 1;
          }
        }

        @keyframes flash {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }

        .animate-stamp {
          animation: stamp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .animate-flash {
          animation: flash 0.5s ease-out;
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-shine {
          animation: shine 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default PlayerCard;