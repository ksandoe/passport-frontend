import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient.tsx';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

const RESEND_COOLDOWN = 30; // seconds
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION = 120; // seconds

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    let lockoutInterval: NodeJS.Timeout;
    if (lockout && lockoutTimer > 0) {
      lockoutInterval = setTimeout(() => setLockoutTimer(lockoutTimer - 1), 1000);
    } else if (lockout && lockoutTimer === 0) {
      setLockout(false);
      setAttempts(0);
    }
    return () => clearTimeout(lockoutInterval);
  }, [lockout, lockoutTimer]);

  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    if (code.length === 6) {
      handleVerifyCodeAuto();
    }
  }, [code]);

  async function logLoginFailure({ email, reason }: { email: string; reason: string }) {
    try {
      await fetch('/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: email, // fallback if no user_id available
          exam_id: null,
          event_type: 'login_failure',
          event_data: { reason, timestamp: new Date().toISOString() },
        }),
      });
    } catch (e) {
      // ignore errors
    }
  }

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setInfo(null);
    setCooldown(RESEND_COOLDOWN);
    if (lockout) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('too many requests')) {
        setError('You are requesting codes too frequently. Please wait and try again.');
        setCooldown(RESEND_COOLDOWN * 2);
      } else {
        setError(error.message);
      }
      return;
    } else {
      setStep('code');
      setInfo('A 6-digit code has been sent to your email. Please check your inbox and spam folder.');
      setCode('');
    }
  };

  const handleResendCode = async () => {
    if (cooldown === 0 && !lockout) {
      await handleSendCode();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout) return;
    await verifyCode();
  };

  const handleVerifyCodeAuto = async () => {
    if (code.length === 6 && !lockout) {
      await verifyCode();
    }
  };

  const verifyCode = async () => {
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) {
      setAttempts(a => a + 1);
      let failReason = 'unknown';
      if (error.message.toLowerCase().includes('expired')) {
        setError('Code expired. Please request a new code.');
        failReason = 'expired_code';
      } else if (error.message.toLowerCase().includes('invalid')) {
        setError('Invalid code. Please check and try again.');
        failReason = 'invalid_code';
      } else if (attempts + 1 >= LOCKOUT_ATTEMPTS) {
        setLockout(true);
        setLockoutTimer(LOCKOUT_DURATION);
        setError(`Too many failed attempts. Locked out for ${LOCKOUT_DURATION / 60} minutes.`);
        failReason = 'lockout';
      } else {
        setError(error.message);
        failReason = 'other';
      }
      logLoginFailure({ email, reason: failReason });
    } else {
      setInfo('Login successful! Redirecting...');
      onLogin();
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)' }}>
      <Paper elevation={6} sx={{ p: 5, minWidth: 350, borderRadius: 4, boxShadow: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo placeholder - replace src with your logo file if available */}
        <Box mb={2}>
          <img src="/passport-logo.png" alt="Passport ExamLock Logo" style={{ width: 64, height: 64, borderRadius: 8, boxShadow: '0 2px 8px #2196f399' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </Box>
        <Typography variant="h4" fontWeight={700} color="primary" mb={1} letterSpacing={1} sx={{ textShadow: '0 2px 8px #21cbf355' }}>
          Passport ExamLock
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={3}>
          Secure Exam Login
        </Typography>
        {step === 'email' && (
          <form onSubmit={handleSendCode}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={lockout}
            />
            {lockout && (
              <Typography color="error" variant="body2">
                Too many failed attempts. Please wait {lockoutTimer}s before trying again.
              </Typography>
            )}
            {error && <Typography color="error" variant="body2">{error}</Typography>}
            {info && <Typography color="primary" variant="body2">{info}</Typography>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={lockout}>Send Code</Button>
          </form>
        )}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <Typography variant="body2" mb={1}>
              Enter the 6-digit code sent to <b>{email}</b>.<br />
              <span style={{ color: '#888' }}>
                Didn’t get the code? Check your spam folder or resend below.
              </span>
            </Typography>
            <TextField
              label="6-digit Code"
              type="text"
              fullWidth
              margin="normal"
              value={code}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 6) setCode(val);
              }}
              required
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
              inputRef={codeInputRef}
              autoFocus
              disabled={lockout}
            />
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 1 }}
              disabled={cooldown > 0 || lockout}
              onClick={handleResendCode}
            >
              {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
            </Button>
            {lockout && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                Too many failed attempts. Please wait {lockoutTimer}s before trying again.
              </Typography>
            )}
            {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
            {info && <Typography color="primary" variant="body2" sx={{ mt: 1 }}>{info}</Typography>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={lockout}>Verify Code</Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => { setStep('email'); setCode(''); setError(null); setInfo(null); setAttempts(0); setLockout(false); setLockoutTimer(0); }}>Back</Button>
          </form>
        )}
      </Paper>

    </Box>
  );
};

export default LoginPage;
