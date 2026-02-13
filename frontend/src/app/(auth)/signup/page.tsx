'use client';

import React, { useState, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import styles from '../auth.module.css';

function getPasswordStrength(pwd: string): { score: number; label: string } {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 1, label: 'Weak' };
  if (score <= 3) return { score: 2, label: 'Medium' };
  return { score: 3, label: 'Strong' };
}

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
      showToast('Account created! Welcome! 🚀', 'success');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />
      <div className={styles.bgBlob3} />

      <div className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>⚡</div>
            <span className={styles.logoTitle}>
              Vox<span className={styles.logoAccent}>Coder</span>
            </span>
          </div>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Start coding with your voice today</p>
        </div>

        {error && <div className={styles.globalError}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <>
                <div className={styles.strengthBar}>
                  <div className={`${styles.strengthSegment} ${strength.score >= 1 ? styles.strengthWeak : ''} ${strength.score >= 2 ? styles.strengthMedium : ''} ${strength.score >= 3 ? styles.strengthStrong : ''}`} />
                  <div className={`${styles.strengthSegment} ${strength.score >= 2 ? styles.strengthMedium : ''} ${strength.score >= 3 ? styles.strengthStrong : ''}`} />
                  <div className={`${styles.strengthSegment} ${strength.score >= 3 ? styles.strengthStrong : ''}`} />
                </div>
                <span className={styles.strengthLabel}>{strength.label}</span>
              </>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input
              type="password"
              className={`${styles.input} ${confirmPassword && password !== confirmPassword ? styles.inputError : ''}`}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <span className={styles.errorText}>Passwords do not match</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account?{' '}
          <button className={styles.link} onClick={() => router.push('/login')}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
