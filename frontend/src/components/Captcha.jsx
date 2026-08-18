import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RotateCw, ShieldCheck, ShieldAlert } from 'lucide-react';

const Captcha = forwardRef(({ onVerify, className = '' }, ref) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(false);

  const generateChallenge = useCallback(() => {
    const n1 = Math.floor(Math.random() * 12) + 1;
    const n2 = Math.floor(Math.random() * 12) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
    setIsVerified(false);
    setError(false);
    if (onVerify) onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    generateChallenge();
  }, [generateChallenge]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      generateChallenge();
    },
    isValid: () => isVerified,
  }));

  const handleInputChange = (e) => {
    const val = e.target.value;
    setUserAnswer(val);
    const expected = num1 + num2;
    if (parseInt(val.trim(), 10) === expected) {
      setIsVerified(true);
      setError(false);
      if (onVerify) onVerify(true);
    } else {
      setIsVerified(false);
      if (val.trim() !== '') {
        setError(true);
      } else {
        setError(false);
      }
      if (onVerify) onVerify(false);
    }
  };

  return (
    <div className={`captcha-container ${className}`} style={{
      margin: '1.25rem 0',
      padding: '1rem',
      borderRadius: '0.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      border: isVerified
        ? '1px solid rgba(34, 197, 94, 0.5)'
        : error
        ? '1px solid rgba(239, 68, 68, 0.5)'
        : '1px solid rgba(255, 255, 255, 0.12)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        marginBottom: '0.75rem',
      }}>
        <label
          htmlFor="captcha-input"
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--pa-slate-200, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Security Verification
        </label>
        <button
          type="button"
          onClick={generateChallenge}
          title="Get new question"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pa-slate-400, #94a3b8)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--pa-slate-200, #f8fafc)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--pa-slate-400, #94a3b8)')}
        >
          <RotateCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '1px border-dashed rgba(255, 255, 255, 0.2)',
          borderRadius: '0.375rem',
          padding: '0.5rem 1rem',
          fontSize: '1.1rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--pa-blue-bright, #38bdf8)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          {num1} + {num2} = ?
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id="captcha-input"
            type="number"
            value={userAnswer}
            onChange={handleInputChange}
            placeholder="Answer"
            required
            style={{
              width: '100%',
              padding: '0.5rem 2.25rem 0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <div style={{
            position: 'absolute',
            right: '0.6rem',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
            {isVerified && <ShieldCheck size={18} style={{ color: '#22c55e' }} />}
            {error && <ShieldAlert size={18} style={{ color: '#ef4444' }} />}
          </div>
        </div>
      </div>
      {error && (
        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#ef4444' }}>
          Incorrect answer. Please try again.
        </p>
      )}
    </div>
  );
});

Captcha.displayName = 'Captcha';

export default Captcha;
