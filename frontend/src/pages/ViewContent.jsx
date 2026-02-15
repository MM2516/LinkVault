import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ViewContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activePassword, setActivePassword] = useState('');
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [copied, setCopied] = useState(false);
  const initialized = useRef(false);

  const getHeaders = (password) => {
    const pwd = password || activePassword;
    const authToken = localStorage.getItem('authToken');
    const headers = {};
    if (pwd) headers['x-link-password'] = pwd;
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    return headers;
  };

  const fetchStatus = (password = '') => {
    axios.get(`http://localhost:5000/api/content/${id}`, { headers: getHeaders(password) })
      .then(res => {
        setData(res.data);
        setError('');
        setAuthError('');
        setIsPasswordRequired(false);
        if (password) setActivePassword(password);
      })
      .catch(err => {
        const status = err.response?.status;
        const code = err.response?.data?.code;
        const message = err.response?.data?.error || "Error";

        if (status === 401 && (code === 'PASSWORD_REQUIRED' || code === 'INVALID_PASSWORD')) {
          setError('');
          setData(null);
          setIsPasswordRequired(true);
          setAuthError(message);
          return;
        }

        setError(message);
      });
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchStatus();
    }
  }, [id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/download/${id}`, {
        responseType: 'blob',
        headers: getHeaders()
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      setError("Download limit reached. Vault expired.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure? This will delete the content for everyone forever.")) {
      try {
        await axios.delete(`http://localhost:5000/api/delete/${id}`, { headers: getHeaders() });
        navigate('/');
        alert("Vault destroyed successfully.");
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    fetchStatus(passwordInput);
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-8">
      <div className="bg-red-500/10 p-10 border border-red-500/20 rounded-[2.5rem] text-center max-w-md">
        <p className="text-red-400 font-black mb-4 uppercase tracking-widest font-sans">{error}</p>
        <a href="/" className="text-indigo-400 underline text-sm font-sans">Return to Safety</a>
      </div>
    </div>
  );

  if (isPasswordRequired) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-8">
      <div className="w-full max-w-md bg-slate-800/30 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight font-sans mb-4">Protected Vault</h2>
        <p className="text-slate-400 text-sm mb-6">{authError || 'Enter password to access this link.'}</p>
        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-4 text-sm outline-none text-slate-300"
            placeholder="Enter link password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest"
          >
            Unlock Vault
          </button>
        </form>
      </div>
    </div>
  );

  if (!data) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-indigo-400 font-black uppercase tracking-[0.5em] animate-pulse">Decrypting...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-8">
      <div className="w-full max-w-3xl bg-slate-800/30 backdrop-blur-xl border border-white/10 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter font-sans">Vault Content</h2>
          <span className="px-5 py-2 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30 font-sans">
            {data.type}
          </span>
        </div>
        
        {data.type === 'text' ? (
          <div className="relative group">
            <pre className="bg-slate-950/50 p-10 rounded-[2.5rem] text-slate-300 font-mono text-sm overflow-x-auto border border-white/5 leading-relaxed shadow-inner">
              {data.content}
            </pre>
            <button 
              onClick={handleCopy}
              className={`absolute top-6 right-6 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl ${
                copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white opacity-0 group-hover:opacity-100'
              }`}
            >
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-950/30 rounded-[3rem] border border-white/5 shadow-inner">
            <h3 className="text-2xl font-black text-white mb-8 px-4 font-sans tracking-tight">{data.file_name}</h3>
            <button onClick={handleDownload} className="px-16 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-900/40 transition-all active:scale-95 uppercase tracking-widest font-sans">
              Download Original File
            </button>
          </div>
        )}

        <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] font-sans">
              {data.type === 'text' ? 'Views' : 'Downloads'}: {data.current_views} / {data.max_views === 0 ? '∞' : data.max_views}
            </div>
            <div className="text-[9px] text-slate-600 font-bold font-sans uppercase">Expires: {new Date(data.expiry_at).toLocaleString()}</div>
          </div>
          
          <button 
            onClick={handleDelete}
            className="px-8 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all font-sans"
          >
            Destroy Vault Now
          </button>
        </div>
      </div>
    </div>
  );
}
