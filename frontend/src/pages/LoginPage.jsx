import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import {
  Eye,
  EyeOff,
  Check,
  X as XIcon,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Sprout,
  ShoppingBag,
  Store,
  Shield,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  MapPin,
  Phone,
  Building,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export default function LoginPage() {
  const { login, register, demo, forgotPassword, resetPassword } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();

  // Mode: 'signin' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Sign In State
  const [email, setEmail] = useState(() => localStorage.getItem('mm_remember_email') || 'seller@mandimind.demo');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up State
  const [regRole, setRegRole] = useState('farmer'); // 'farmer' | 'buyer' | 'seller'
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [regCommodity, setRegCommodity] = useState('');
  const [regBuyerType, setRegBuyerType] = useState('retailer');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [adminNotice, setAdminNotice] = useState(false);

  // Forgot / Reset Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(null);

  // Clear errors on mode switch
  useEffect(() => {
    setError('');
    setAdminNotice(false);
  }, [mode]);

  async function redirectForRole(user) {
    if (!user) return;
    if (user.role === 'farmer') navigate('/farmer');
    else if (user.role === 'buyer') navigate('/marketplace');
    else if (user.role === 'admin') navigate('/dashboard');
    else navigate('/dashboard');
  }

  // Password requirements calculation
  const hasMinLength = regPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(regPassword);
  const hasNumber = /\d/.test(regPassword);
  const passwordsMatch = regPassword && regPassword === regConfirmPassword;
  const isPasswordValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  async function onSignInSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password, rememberMe);
      toast.push(t('auth.welcomeBack', 'Welcome back!'));
      await redirectForRole(user);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || t('auth.invalidCreds', 'Invalid email or password');
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onSignUpSubmit(e) {
    e.preventDefault();
    setError('');

    if (regRole === 'admin') {
      setError(t('auth.adminRestrictedNote', 'Administrator accounts cannot be created through public registration.'));
      return;
    }

    if (!isPasswordValid) {
      setError(t('auth.passwordRequirementsUnmet', 'Please ensure all password requirements are satisfied.'));
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        phone: regPhone,
        location: regLocation || 'Hyderabad',
        organizationName: regOrgName,
        primaryCommodity: regCommodity,
        buyerType: regRole === 'buyer' ? regBuyerType : '',
      };
      const user = await register(payload);
      toast.push(t('auth.accountCreated', 'Account created successfully!'));
      await redirectForRole(user);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onDemoLogin(role) {
    setError('');
    setBusy(true);
    try {
      const user = await demo(role);
      toast.push(`${role.toUpperCase()} ${t('auth.quickDemo', 'Demo')} activated`);
      await redirectForRole(user);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Demo login failed. Make sure database is seeded.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onForgotSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await forgotPassword(forgotEmail);
      setForgotSuccess(res);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to process password reset.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onResetSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError(t('auth.passwordReqLength', 'Password must be at least 8 characters long'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    setBusy(true);
    try {
      const res = await resetPassword(resetToken, newPassword);
      toast.push(res.message || 'Password reset successfully!');
      setMode('signin');
      setEmail(forgotEmail);
      setPassword(newPassword);
      setForgotSuccess(null);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to reset password.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-canvas dark:bg-night-bg transition-colors duration-200">
      {/* Hero / Brand Visual Section */}
      <section className="relative hidden overflow-hidden bg-forest-ink p-12 text-white lg:col-span-5 xl:col-span-5 lg:flex lg:flex-col lg:justify-between">
        <div>
          <Logo />
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-forest/40 border border-agri/30 px-3 py-1 text-xs font-semibold text-agri">
            <Sparkles size={13} />
            <span>SIH Problem 26033 • AI Direct Trade & Logistics</span>
          </div>
        </div>

        <div className="max-w-md my-auto">
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
            Make smarter agricultural decisions before the market moves.
          </h1>
          <p className="mt-4 text-sm text-white/80 leading-relaxed">
            Direct farmer-to-buyer marketplace with AI-driven price intelligence, pre-trade spoilage assessment, and single-route consolidated logistics.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-agri/20 text-agri font-bold">
                0
              </div>
              <div>
                <div className="font-bold text-white">Direct Marketplace Trading</div>
                <div className="text-white/60">Zero produce-reselling middleman layers</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-harvest/20 text-harvest font-bold">
                ₹
              </div>
              <div>
                <div className="font-bold text-white">Net Farmer Realization</div>
                <div className="text-white/60">Logistics & spoilage factored before trade acceptance</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-info/20 text-info font-bold">
                ❄️
              </div>
              <div>
                <div className="font-bold text-white">FPO Supply Pooling & Cold-Chain</div>
                <div className="text-white/60">Multi-farmer lot aggregation with route optimization</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-white/60 pt-6 border-t border-white/10">
          <span>{t('badges.simulated', 'SIMULATED DEMO DATA — Not a live government feed')}</span>
          <span className="font-mono text-agri">v2.4 Production Ready</span>
        </div>
      </section>

      {/* Main Authentication Card Section */}
      <section className="flex items-center justify-center p-4 sm:p-6 lg:p-8 lg:col-span-7 xl:col-span-7 overflow-y-auto">
        <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-card dark:border-night-mute/20 dark:bg-night-card transition-all">
          <div className="lg:hidden mb-6">
            <Logo />
          </div>

          {/* Mode Switcher Tabs (Sign In / Create Account) */}
          {mode !== 'forgot' && mode !== 'reset' && (
            <div className="flex rounded-xl bg-earth/60 p-1 mb-6 dark:bg-night-lift/50 border border-line/60 dark:border-night-mute/20">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest'
                    : 'text-mute hover:text-ink dark:text-night-mute dark:hover:text-night-text'
                }`}
              >
                {t('auth.signIn', 'Sign In')}
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest'
                    : 'text-mute hover:text-ink dark:text-night-mute dark:hover:text-night-text'
                }`}
              >
                {t('auth.signUp', 'Create Account')}
              </button>
            </div>
          )}

          {/* Global Alert / Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-alert/30 bg-alert/10 p-3.5 text-xs text-alert dark:bg-alert/15 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="font-semibold">{error}</div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: SIGN IN
             ───────────────────────────────────────────────────────────── */}
          {mode === 'signin' && (
            <form onSubmit={onSignInSubmit} className="space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold text-ink dark:text-night-text">
                  {t('auth.signIn', 'Sign In')}
                </h2>
                <p className="mt-1 text-xs text-mute dark:text-night-mute">
                  {t('auth.signInSubtitle', 'Access AI pricing, predictive mandi forecasts, and direct trading.')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                  {t('auth.email', 'Email address')}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-mute" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. farmer@mandimind.demo"
                    required
                    className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                  {t('auth.password', 'Password')}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-mute" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-line bg-white pl-9 pr-10 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-mute hover:text-ink dark:hover:text-night-text"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-ink dark:text-night-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded accent-forest dark:accent-harvest"
                  />
                  <span>{t('auth.rememberMe', 'Remember Me')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="font-semibold text-forest hover:underline dark:text-harvest"
                >
                  {t('auth.forgotPassword', 'Forgot Password?')}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-forest py-2.5 text-sm font-bold text-white transition hover:bg-forest-deep disabled:opacity-50 dark:bg-forest dark:hover:bg-forest-deep shadow-md flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>{t('auth.signingIn', 'Signing in…')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('auth.continue', 'Continue to Platform')}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              {/* Demo Access Card */}
              <div className="pt-4 border-t border-line/60 dark:border-night-mute/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mute dark:text-night-mute">
                    {t('auth.quickDemo', 'Quick Demo Access')}
                  </span>
                  <span className="text-[10px] text-mute dark:text-night-mute">
                    Presentation & Testing
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onDemoLogin('farmer')}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-line bg-earth/40 p-2.5 text-left text-xs font-semibold text-ink transition hover:border-forest/50 hover:bg-white dark:border-night-mute/20 dark:bg-night-lift/40 dark:text-night-text dark:hover:bg-night-lift"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-agri/15 text-forest dark:text-harvest font-bold">
                      🌾
                    </div>
                    <div>
                      <div className="font-bold">{t('auth.farmerDemo', 'Farmer')}</div>
                      <div className="text-[10px] text-mute">Producer</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDemoLogin('buyer')}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-line bg-earth/40 p-2.5 text-left text-xs font-semibold text-ink transition hover:border-forest/50 hover:bg-white dark:border-night-mute/20 dark:bg-night-lift/40 dark:text-night-text dark:hover:bg-night-lift"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-info/15 text-info font-bold">
                      🛒
                    </div>
                    <div>
                      <div className="font-bold">{t('auth.buyerDemo', 'Buyer')}</div>
                      <div className="text-[10px] text-mute">Procurement</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDemoLogin('seller')}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-line bg-earth/40 p-2.5 text-left text-xs font-semibold text-ink transition hover:border-forest/50 hover:bg-white dark:border-night-mute/20 dark:bg-night-lift/40 dark:text-night-text dark:hover:bg-night-lift"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-harvest/15 text-harvest font-bold">
                      📦
                    </div>
                    <div>
                      <div className="font-bold">{t('auth.sellerDemo', 'Seller')}</div>
                      <div className="text-[10px] text-mute">Trader</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDemoLogin('admin')}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-line bg-earth/40 p-2.5 text-left text-xs font-semibold text-ink transition hover:border-forest/50 hover:bg-white dark:border-night-mute/20 dark:bg-night-lift/40 dark:text-night-text dark:hover:bg-night-lift"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-alert/15 text-alert font-bold">
                      🛡️
                    </div>
                    <div>
                      <div className="font-bold">{t('auth.adminDemo', 'Admin')}</div>
                      <div className="text-[10px] text-mute">Oversight</div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 2: SIGN UP (ROLE-BASED REGISTRATION)
             ───────────────────────────────────────────────────────────── */}
          {mode === 'signup' && (
            <form onSubmit={onSignUpSubmit} className="space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold text-ink dark:text-night-text">
                  {t('auth.createAccount', 'Create your MandiMind account')}
                </h2>
                <p className="mt-1 text-xs text-mute dark:text-night-mute">
                  {t('auth.createAccountSubtitle', "Join India's direct agricultural marketplace and price intelligence network.")}
                </p>
              </div>

              {/* Step 1: Role Selection Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-2">
                  {t('auth.chooseRole', 'Choose your role')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Farmer Role */}
                  <div
                    onClick={() => { setRegRole('farmer'); setAdminNotice(false); }}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      regRole === 'farmer'
                        ? 'border-forest bg-forest/10 ring-2 ring-forest/20 dark:border-harvest dark:bg-harvest/15 dark:ring-harvest/30'
                        : 'border-line bg-earth/30 hover:border-forest/40 dark:border-night-mute/20 dark:bg-night-lift/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🌾</span>
                      {regRole === 'farmer' && <Check size={14} className="text-forest dark:text-harvest font-bold" />}
                    </div>
                    <div className="mt-1 font-bold text-xs text-ink dark:text-night-text">
                      {t('auth.farmerRoleTitle', 'Farmer / Producer')}
                    </div>
                    <div className="text-[10px] text-mute leading-tight mt-0.5">
                      Direct crop sales & FPO pools
                    </div>
                  </div>

                  {/* Buyer Role */}
                  <div
                    onClick={() => { setRegRole('buyer'); setAdminNotice(false); }}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      regRole === 'buyer'
                        ? 'border-forest bg-forest/10 ring-2 ring-forest/20 dark:border-harvest dark:bg-harvest/15 dark:ring-harvest/30'
                        : 'border-line bg-earth/30 hover:border-forest/40 dark:border-night-mute/20 dark:bg-night-lift/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🛒</span>
                      {regRole === 'buyer' && <Check size={14} className="text-forest dark:text-harvest font-bold" />}
                    </div>
                    <div className="mt-1 font-bold text-xs text-ink dark:text-night-text">
                      {t('auth.buyerRoleTitle', 'Buyer / Procurement')}
                    </div>
                    <div className="text-[10px] text-mute leading-tight mt-0.5">
                      Source farm crops & post requirements
                    </div>
                  </div>

                  {/* Seller Role */}
                  <div
                    onClick={() => { setRegRole('seller'); setAdminNotice(false); }}
                    className={`cursor-pointer rounded-xl border p-3 transition-all ${
                      regRole === 'seller'
                        ? 'border-forest bg-forest/10 ring-2 ring-forest/20 dark:border-harvest dark:bg-harvest/15 dark:ring-harvest/30'
                        : 'border-line bg-earth/30 hover:border-forest/40 dark:border-night-mute/20 dark:bg-night-lift/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">📦</span>
                      {regRole === 'seller' && <Check size={14} className="text-forest dark:text-harvest font-bold" />}
                    </div>
                    <div className="mt-1 font-bold text-xs text-ink dark:text-night-text">
                      {t('auth.sellerRoleTitle', 'Seller / Trader')}
                    </div>
                    <div className="text-[10px] text-mute leading-tight mt-0.5">
                      Mandi trading & inventory arbitrage
                    </div>
                  </div>

                  {/* Admin Role (Protected / Restricted) */}
                  <div
                    onClick={() => setAdminNotice(true)}
                    className="cursor-pointer rounded-xl border border-dashed border-line/80 bg-earth/20 p-3 opacity-75 hover:opacity-100 dark:border-night-mute/30 dark:bg-night-lift/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🛡️</span>
                      <span className="text-[9px] font-extrabold uppercase rounded bg-alert/15 px-1.5 py-0.5 text-alert">
                        Restricted
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-xs text-ink dark:text-night-text">
                      {t('auth.adminRoleTitle', 'Administrator')}
                    </div>
                    <div className="text-[10px] text-mute leading-tight mt-0.5">
                      Invitation only
                    </div>
                  </div>
                </div>

                {adminNotice && (
                  <div className="mt-2.5 rounded-xl border border-harvest/40 bg-harvest/10 p-3 text-xs text-ink dark:text-night-text flex items-start gap-2">
                    <ShieldAlert size={16} className="text-harvest shrink-0 mt-0.5" />
                    <div>
                      <strong>Administrator Security Notice:</strong>{' '}
                      {t('auth.adminRestrictedNote', 'Administrator accounts cannot be created through public registration. Please use an authorized administrator invitation.')}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                    {t('auth.fullName', 'Full Name')} *
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-3 text-mute" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Ramesh Reddy"
                      required
                      className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                    {t('auth.email', 'Email Address')} *
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-mute" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      required
                      className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                    {t('auth.phone', 'Phone Number (optional)')}
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-3 text-mute" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                    {t('auth.location', 'Location / District')} *
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-mute" />
                    <input
                      type="text"
                      value={regLocation}
                      onChange={(e) => setRegLocation(e.target.value)}
                      placeholder="e.g. Nalgonda, Telangana"
                      required
                      className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                  </div>
                </div>

                {/* Role-specific optional fields */}
                {regRole === 'farmer' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                        {t('auth.farmName', 'Farm / FPO Name')}
                      </label>
                      <input
                        type="text"
                        value={regOrgName}
                        onChange={(e) => setRegOrgName(e.target.value)}
                        placeholder="e.g. Reddy Agro Farm"
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                        {t('auth.primaryCrop', 'Primary Commodity')}
                      </label>
                      <input
                        type="text"
                        value={regCommodity}
                        onChange={(e) => setRegCommodity(e.target.value)}
                        placeholder="e.g. Tomato, Onion, Chilli"
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                      />
                    </div>
                  </>
                )}

                {regRole === 'buyer' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                        {t('auth.orgName', 'Business Name')}
                      </label>
                      <input
                        type="text"
                        value={regOrgName}
                        onChange={(e) => setRegOrgName(e.target.value)}
                        placeholder="e.g. Deccan Agro Processors"
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                        {t('auth.buyerType', 'Buyer Category')}
                      </label>
                      <select
                        value={regBuyerType}
                        onChange={(e) => setRegBuyerType(e.target.value)}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                      >
                        <option value="retailer">Retailer / Supermarket</option>
                        <option value="processor">Food Processing Enterprise</option>
                        <option value="restaurant">Restaurant / Hotel Kitchen</option>
                        <option value="wholesaler">Distant / Bulk Wholesaler</option>
                        <option value="institutional">Institutional / Hostel</option>
                        <option value="individual">Direct Bulk Consumer</option>
                      </select>
                    </div>
                  </>
                )}

                {regRole === 'seller' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                      {t('auth.tradingName', 'Trading House / Mandi Shop Name')}
                    </label>
                    <input
                      type="text"
                      value={regOrgName}
                      onChange={(e) => setRegOrgName(e.target.value)}
                      placeholder="e.g. Rao Fresh Produce Trading"
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                  </div>
                )}

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                    {t('auth.password', 'Password')} *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-mute" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      className="w-full rounded-xl border border-line bg-white pl-9 pr-10 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2.5 text-mute hover:text-ink"
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                    {t('auth.confirmPassword', 'Confirm Password')} *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-mute" />
                    <input
                      type={showRegConfirm ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full rounded-xl border border-line bg-white pl-9 pr-10 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm(!showRegConfirm)}
                      className="absolute right-3 top-2.5 text-mute hover:text-ink"
                    >
                      {showRegConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Quality Indicator */}
              <div className="rounded-xl bg-earth/40 p-3 text-xs dark:bg-night-lift/40 border border-line/50 dark:border-night-mute/20 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-mute dark:text-night-mute">
                  Security Checklist
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-forest dark:text-harvest font-semibold' : 'text-mute'}`}>
                    {hasMinLength ? <Check size={12} /> : <XIcon size={12} />}
                    <span>{t('auth.passwordReqLength', 'At least 8 characters')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-forest dark:text-harvest font-semibold' : 'text-mute'}`}>
                    {hasLetter ? <Check size={12} /> : <XIcon size={12} />}
                    <span>{t('auth.passwordReqLetter', 'Contains a letter')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-forest dark:text-harvest font-semibold' : 'text-mute'}`}>
                    {hasNumber ? <Check size={12} /> : <XIcon size={12} />}
                    <span>{t('auth.passwordReqNumber', 'Contains a number')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-forest dark:text-harvest font-semibold' : 'text-mute'}`}>
                    {passwordsMatch ? <Check size={12} /> : <XIcon size={12} />}
                    <span>{t('auth.passwordsMatch', 'Passwords match')}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-forest py-2.5 text-sm font-bold text-white transition hover:bg-forest-deep disabled:opacity-50 dark:bg-forest dark:hover:bg-forest-deep shadow-md flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>{t('auth.creatingAccount', 'Creating account…')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('auth.signUp', 'Create Account')}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div className="text-center text-xs text-mute dark:text-night-mute">
                {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-forest hover:underline dark:text-harvest"
                >
                  {t('auth.signIn', 'Sign In')}
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 3: FORGOT PASSWORD / PASSWORD RESET
             ───────────────────────────────────────────────────────────── */}
          {(mode === 'forgot' || mode === 'reset') && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold text-ink dark:text-night-text">
                  {t('auth.resetPasswordTitle', 'Forgot Your Password?')}
                </h2>
                <p className="mt-1 text-xs text-mute dark:text-night-mute">
                  {t('auth.resetPasswordDesc', 'Enter your registered email address to receive password reset instructions.')}
                </p>
              </div>

              {!forgotSuccess ? (
                <form onSubmit={onForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                      {t('auth.email', 'Email Address')}
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-mute" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. farmer@mandimind.demo"
                        required
                        className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-full bg-forest py-2.5 text-sm font-bold text-white transition hover:bg-forest-deep disabled:opacity-50 dark:bg-forest dark:hover:bg-forest-deep shadow-md flex items-center justify-center gap-2"
                  >
                    {busy ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Processing…</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={15} />
                        <span>{t('auth.sendResetLink', 'Generate Reset Link')}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-xs font-bold text-mute hover:text-ink dark:hover:text-night-text"
                    >
                      ← {t('auth.backToSignIn', 'Back to Sign In')}
                    </button>
                  </div>
                </form>
              ) : (
                /* Demo Reset Token Flow */
                <form onSubmit={onResetSubmit} className="space-y-4">
                  <div className="rounded-xl border border-forest/30 bg-forest/5 p-4 dark:border-harvest/30 dark:bg-harvest/5 text-xs space-y-2">
                    <div className="font-bold text-forest dark:text-harvest flex items-center gap-1.5">
                      <Check size={16} /> Password Reset Simulated (Demo Environment)
                    </div>
                    <div className="text-ink dark:text-night-text">
                      In production, a secure one-time link is emailed. For this demo, a reset token has been generated automatically for <strong>{forgotEmail}</strong>.
                    </div>
                    <div className="font-mono text-[11px] bg-white/80 dark:bg-night-card/80 p-2 rounded border border-line/60 dark:border-night-mute/30 break-all text-forest dark:text-harvest">
                      Token: {resetToken}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute dark:text-night-mute mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-forest focus:outline-none dark:border-night-mute/30 dark:bg-night-lift dark:text-night-text"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-full bg-forest py-2.5 text-sm font-bold text-white transition hover:bg-forest-deep disabled:opacity-50 dark:bg-forest dark:hover:bg-forest-deep shadow-md flex items-center justify-center gap-2"
                  >
                    {busy ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Updating…</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        <span>Update Password & Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setMode('signin'); setForgotSuccess(null); }}
                      className="text-xs font-bold text-mute hover:text-ink dark:hover:text-night-text"
                    >
                      ← {t('auth.backToSignIn', 'Back to Sign In')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
