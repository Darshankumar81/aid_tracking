import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, registerUser } from '../api';

const Login = () => {
  const [email, setEmail] = useState('admin@aid.org');
  const [password, setPassword] = useState('adminpassword123');
  const [name, setName] = useState('');
  const [role, setRole] = useState('donor');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isRegistering) {
        await registerUser({
          email,
          password,
          name,
          role,
        });
        setMessage('Registration successful! Please log in.');
        setIsRegistering(false);
        setPassword('');
      } else {
        // Pass `true` as 3rd arg so api.js sends application/x-www-form-urlencoded
        const loginData = await login(email, password, true);

        const user = loginData?.user || JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(', '));
      } else {
        setError(detail || 'Invalid credentials or request error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setMessage('');
  };

  return (
    <div style={{ maxWidth: '380px', margin: '60px auto', padding: '24px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
      <h2>{isRegistering ? 'Create an Account' : 'Sign In'}</h2>
      
      {message && <p style={{ color: 'green', fontSize: '14px', margin: '8px 0' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontSize: '14px', margin: '8px 0' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {isRegistering && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Full Name</label>
              <input 
                type="text" 
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Jane Doe"
                required={isRegistering} 
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="donor">Donor Organization</option>
                <option value="recipient">Aid Recipient Hub</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
          </>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Email Address</label>
          <input 
            type="email" 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="admin@aid.org"
            required 
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Password</label>
          <input 
            type="password" 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Please wait...' : isRegistering ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      <button 
        onClick={toggleMode}
        style={{ marginTop: '12px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '13px', width: '100%' }}
      >
        {isRegistering ? 'Already have an account? Log In' : "Don't have an account? Register"}
      </button>
    </div>
  );
};

export default Login;