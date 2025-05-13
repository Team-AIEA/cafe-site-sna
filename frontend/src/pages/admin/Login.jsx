import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.token); // Store the token
      console.log(data)
      navigate('/admin', { replace: true }); // Redirect to admin page
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Admin Login</h1>
      <div  className='div-login'>
      <form onSubmit={handleLogin} className='cart-items'>
        <div>
          <label style={{color: 'white'}} htmlFor="username">Username<br/></label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{color: 'white'}} htmlFor="password">Password<br/></label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div className='div-butt'><button className='butt-order' type="submit">Log in</button></div>
        
      </form>
      </div>
    </div>
  );
}

export default Login;