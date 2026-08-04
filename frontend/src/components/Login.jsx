import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { requestOtp, verifyOtp, login } = useAuth();

  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [useDirectLogin, setUseDirectLogin] = useState(false);

  const [email, setEmail] = useState('admin@aid.org');
  const [password, setPassword] = useState('adminpassword123');
  const [otpCode, setOtpCode] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatError = (err) => {
    const detail = err.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => e.msg).join(', ');
    }
    return detail || 'An error occurred during authentication.';
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await requestOtp(email, password);
      setStep(2);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyOtp(email, otpCode);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password, true);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Aid Tracking Platform</h2>
          <p style={styles.subtitle}>
            {useDirectLogin
              ? 'Sign in with standard credentials'
              : step === 1
              ? 'Enter credentials to receive security code'
              : `Enter the 6-digit OTP sent to ${email}`}
          </p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        {useDirectLogin ? (
          /* Direct Password Login */
          <form onSubmit={handleDirectLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={submitting} style={styles.primaryBtn}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setUseDirectLogin(false);
                setError('');
              }}
              style={styles.linkBtn}
            >
              Switch to OTP Verification
            </button>
          </form>
        ) : step === 1 ? (
          /* OTP Step 1 */
          <form onSubmit={handleRequestOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={submitting} style={styles.primaryBtn}>
              {submitting ? 'Sending Code...' : 'Send Verification Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setUseDirectLogin(true);
                setError('');
              }}
              style={styles.linkBtn}
            >
              Direct Login (Bypass OTP)
            </button>
          </form>
        ) : (
          /* OTP Step 2 */
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>6-Digit Verification Code</label>
              <input
                type="text"
                maxLength="6"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                style={styles.otpInput}
              />
            </div>

            <button type="submit" disabled={submitting} style={styles.primaryBtn}>
              {submitting ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              style={styles.secondaryBtn}
            >
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    marginBottom: '24px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '22px',
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
  },
  otpInput: {
    padding: '12px 14px',
    fontSize: '24px',
    letterSpacing: '8px',
    textAlign: 'center',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
  },
  primaryBtn: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  secondaryBtn: {
    padding: '10px',
    fontSize: '13px',
    color: '#4b5563',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  linkBtn: {
    fontSize: '13px',
    color: '#2563eb',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  errorAlert: {
    padding: '12px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
  },
};