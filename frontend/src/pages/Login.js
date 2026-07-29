import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const endpoint = isRegistering ? '/register' : '/login';

    try {
      const res = await axios.post(`http://127.0.0.1:8000${endpoint}`, { username, password });
      
      if (isRegistering) {
        setMessage('Registration successful! Please log in.');
        setIsRegistering(false);
      } else {
        localStorage.setItem('token', res.data.access_token);
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '380px', margin: '60px auto', padding: '24px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2>{isRegistering ? 'Register Admin' : 'Admin Login'}</h2>
      
      {message && <p style={{ color: 'green', fontSize: '14px' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Username</label>
          <input 
            type="text" 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Password</label>
          <input 
            type="password" 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button 
          type="submit" 
          style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isRegistering ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      <button 
        onClick={() => { setIsRegistering(!isRegistering); setError(''); setMessage(''); }}
        style={{ marginTop: '12px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '13px', width: '100%' }}
      >
        {isRegistering ? 'Already have an account? Log In' : "Don't have an account? Register"}
      </button>
    </div>
  );
};

export default Login;