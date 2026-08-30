import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginPage() {
  const { login, demo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('seller@mandimind.demo');
  const [password, setPassword] = useState('demo1234');
  const [busy, setBusy] = useState(false);

  async function go(user) {
    if (user.role === 'farmer' || user.role === 'buyer') navigate('/farmer');
    else navigate('/dashboard');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email, password);
      await go(user);
    } catch {
      toast.push('Could not sign in. Check credentials and that the API is running.');
    } finally {
      setBusy(false);
    }
  }

  async function onDemo(role) {
    setBusy(true);
    try {
      const user = await demo(role);
      await go(user);
    } catch {
      toast.push('Demo login failed. Seed the database and start the API.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-forest-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div className="max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight">Make smarter agricultural decisions before the market moves.</h1>
          <p className="mt-4 text-white/75">Demand, price and inventory intelligence for traders, farmers and procurement teams.</p>
          <svg viewBox="0 0 480 180" className="mt-12 w-full opacity-90" aria-hidden>
            <path d="M20 140 C 80 120, 90 70, 140 90 S 220 40, 280 70 S 380 30, 460 20" fill="none" stroke="#EAB308" strokeWidth="3" />
            <path d="M20 150 C 100 150, 140 110, 200 120 S 300 90, 460 80" fill="none" stroke="#22C55E" strokeWidth="2" />
            <circle cx="420" cy="36" r="18" fill="#2563EB" opacity="0.35" />
          </svg>
        </div>
        <p className="text-xs text-white/50">SIMULATED DEMO DATA — not a live government feed.</p>
      </section>
      <section className="flex items-center justify-center bg-canvas p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-[18px] border border-line bg-white p-8 shadow-card">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold">Sign in</h2>
          <p className="mt-1 text-sm text-mute">Role-aware access for seller, farmer and analyst.</p>
          <label className="mt-6 block text-sm">
            Email
            <input className="mt-1 w-full rounded-xl border border-line px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="mt-4 block text-sm">
            Password
            <input className="mt-1 w-full rounded-xl border border-line px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <div className="mt-3 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <button type="button" className="text-forest" onClick={() => toast.push('Password reset is not enabled in the demo.')}>
              Forgot password
            </button>
          </div>
          <button disabled={busy} className="mt-6 w-full rounded-full bg-forest py-2.5 font-semibold text-white">
            {busy ? 'Signing in…' : 'Continue'}
          </button>
          <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-mute">Demo login</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {['seller', 'farmer', 'buyer', 'admin'].map((role) => (
              <button type="button" key={role} onClick={() => onDemo(role)} className="rounded-full border border-line py-2 text-sm capitalize">
                {role}
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
