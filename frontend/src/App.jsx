import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Home from './pages/Home';
import ViewContent from './pages/ViewContent';
import Dashboard from './pages/Dashboard';

const API_BASE = 'http://localhost:5000';

export default function App() {
  const [token, setTokenState] = useState(() => localStorage.getItem('authToken') || '');
  const [user, setUser] = useState(null);

  const setToken = (nextToken) => {
    setTokenState(nextToken || '');
    if (nextToken) {
      localStorage.setItem('authToken', nextToken);
    } else {
      localStorage.removeItem('authToken');
    }
  };

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    axios
      .get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => setUser(res.data.user))
      .catch(() => {
        setToken('');
        setUser(null);
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home token={token} setToken={setToken} user={user} setUser={setUser} />} />
          <Route path="/v/:id" element={<ViewContent />} />
          <Route path="/dashboard" element={<Dashboard token={token} user={user} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
