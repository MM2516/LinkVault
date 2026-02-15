import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export default function Dashboard({ token, user }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    axios
      .get(`${API_BASE}/api/my-links`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        setLinks(res.data.links || []);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load links'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) return <Navigate to="/" replace />;

  const statusStyles = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    expired: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    limit_reached: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="min-h-screen bg-[#020617] p-8 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Your Vault Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">{user?.email || 'Authenticated user'} • Track your generated links</p>
          </div>
          <Link to="/" className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black uppercase tracking-widest w-fit">
            Back to Create
          </Link>
        </div>

        <div className="bg-slate-900/40 border border-white/10 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-slate-400">Loading links...</div>
          ) : error ? (
            <div className="p-10 text-rose-400">{error}</div>
          ) : links.length === 0 ? (
            <div className="p-10 text-slate-400">No links created yet after login.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/60">
                  <tr className="text-[11px] uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">Link</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Views</th>
                    <th className="px-6 py-4">Expires</th>
                    <th className="px-6 py-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((item) => (
                    <tr key={item.id} className="border-t border-white/5 text-sm">
                      <td className="px-6 py-4">
                        <a className="text-indigo-400 hover:text-indigo-300 underline" href={`/v/${item.id}`}>
                          /v/{item.id}
                        </a>
                      </td>
                      <td className="px-6 py-4 uppercase text-slate-300">{item.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${statusStyles[item.status] || 'text-slate-300 border-slate-500/20'}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {item.current_views} / {item.max_views === 0 ? '∞' : item.max_views}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{new Date(item.expiry_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
