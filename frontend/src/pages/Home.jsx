import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export default function Home({ token, setToken, user, setUser }) {
  const [type, setType] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [isOneTime, setIsOneTime] = useState(false);
  const [maxViews, setMaxViews] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [password, setPassword] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleUpload = async () => {
    if (type === 'text' && !text) return alert('Please enter some text content.');
    if (type === 'file' && !file) return alert('Please select a file to upload.');

    setLoading(true);
    const formData = new FormData();
    formData.append('type', type);
    formData.append('isOneTime', isOneTime);
    formData.append('maxViews', maxViews);
    formData.append('expiryDate', expiryDate);
    formData.append('password', password);

    if (type === 'text') formData.append('text', text);
    else formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setLink(res.data.url);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload Failed');
    }
    setLoading(false);
  };

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    if (!authEmail || !authPassword) return alert('Email and password are required.');

    setAuthLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await axios.post(`${API_BASE}${endpoint}`, {
        email: authEmail,
        password: authPassword
      });

      setToken(res.data.token);
      setUser(res.data.user);
      setAuthEmail('');
      setIsAuthOpen(false);
      setAuthPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication failed');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await axios.post(`${API_BASE}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (_) {
      // Ignore logout failure and clear local auth anyway.
    }

    setToken('');
    setUser(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > 5242880) {
      alert('File is too large! Max 5MB allowed.');
      e.target.value = null;
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#020617] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] z-10 relative">
        <div className="absolute top-7 right-7 flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest">
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setAuthEmail('');
                setAuthPassword('');
                setIsAuthOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-[10px] font-black uppercase tracking-widest"
            >
              Login / Register
            </button>
          )}
        </div>

        <h1 className="text-5xl font-black text-center mb-6 tracking-tighter italic">
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent animate-gradient-x">
            LinkVault
          </span>
        </h1>

        {user && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <div>
              <p className="text-[11px] text-emerald-400 uppercase tracking-widest font-bold">Logged In</p>
              <p className="text-sm text-slate-300 mt-1">{user.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="flex bg-slate-950/60 rounded-2xl p-1.5 border border-white/5 shadow-inner">
            {['text', 'file'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setLink('');
                  setFile(null);
                  setText('');
                }}
                className={`flex-1 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 ${
                  type === t
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-3xl blur opacity-10 group-focus-within:opacity-25 transition duration-500" />
            {type === 'text' ? (
              <textarea
                className="relative w-full h-48 bg-slate-950/60 border border-white/10 rounded-3xl p-6 text-slate-200 outline-none transition-all placeholder:text-slate-700"
                placeholder="Enter secret text..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            ) : (
              <label className="relative flex flex-col items-center justify-center w-full h-48 bg-slate-950/60 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:bg-white/5 transition-all group/label">
                <div className="flex flex-col items-center gap-2">
                  <svg className={`w-10 h-10 ${file ? 'text-cyan-400' : 'text-slate-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <span className="text-sm font-medium text-slate-500 group-hover/label:text-slate-300 transition-colors">
                    {file ? file.name : 'Securely Upload File (Max 5MB)'}
                  </span>
                </div>
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.gif,.pdf,.zip,.txt,.doc,.docx" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-[0.2em]">Expiry Date (Optional)</label>
              <input
                type="datetime-local"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-4 text-sm outline-none text-slate-300 [color-scheme:dark]"
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-[0.2em]">Limit {type === 'text' ? 'Views' : 'Downloads'}</label>
              <input
                type="number"
                placeholder="0 = Unlimited"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-4 text-sm outline-none text-slate-300"
                disabled={isOneTime}
                onChange={(e) => setMaxViews(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-[0.2em]">Password (Optional)</label>
            <input
              type="password"
              placeholder="Protect this link"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-4 text-sm outline-none text-slate-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="onetime"
              className="w-5 h-5 accent-indigo-500 bg-slate-950 border-white/10 rounded cursor-pointer"
              onChange={(e) => setIsOneTime(e.target.checked)}
            />
            <label htmlFor="onetime" className="text-xs text-slate-500 font-bold uppercase tracking-wider cursor-pointer">Self-Destruct (One-time Access)</label>
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-[2rem] font-black text-lg transition-all shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] active:scale-95 uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? 'Encrypting Vault...' : 'Generate Vault Link'}
          </button>
        </div>

        {link && (
          <div className="mt-12 p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Vault Link Ready</p>
              <input readOnly value={link} className="w-full bg-transparent text-emerald-400 text-sm font-bold outline-none text-center" />
            </div>
            <button
              onClick={handleCopy}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                copied ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Secure Link'}
            </button>
          </div>
        )}
      </div>

      {!user && isAuthOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black uppercase tracking-widest">Account Access</h2>
              <button
                onClick={() => setIsAuthOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs uppercase tracking-widest"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="flex bg-slate-800/80 rounded-xl p-1 border border-white/5">
                {['login', 'register'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAuthMode(mode);
                      setAuthEmail('');
                      setAuthPassword('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      authMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm outline-none text-slate-300"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder={authMode === 'register' ? 'Password (min 6)' : 'Password'}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm outline-none text-slate-300"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {authLoading ? 'Processing...' : authMode === 'register' ? 'Register and Login' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
