import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Globe, Check, User, Palette, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { t, lang, setLanguage, languages } = useTranslation();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.target);
    try {
      await api.patch('/auth/me', {
        name: form.get('name'),
        location: form.get('location'),
        language: lang,
      });
      toast.push('Settings and profile saved successfully.');
    } catch (err) {
      toast.push('Failed to save profile settings');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow={t('settings.eyebrow', 'Preferences & Configuration')}
        title={t('settings.title', 'System Settings')}
        subtitle={t('settings.subtitle', 'Customize your language, interface themes, notifications, and profile details.')}
      />

      {/* Language Preference Section */}
      <div className="rounded-mm border border-line bg-white p-6 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
        <div className="flex items-center gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
          <Globe className="text-forest dark:text-harvest" size={20} />
          <div>
            <h3 className="font-bold text-ink dark:text-night-text">{t('settings.languagePref', 'Language & Internationalization')}</h3>
            <p className="text-xs text-mute">{t('settings.languageDesc', 'Choose your preferred language across all dashboards and mandi markets.')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                toast.push(`Language switched to ${l.name} (${l.native})`);
              }}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                lang === l.code
                  ? 'border-forest bg-forest/10 text-forest shadow-sm dark:border-harvest dark:bg-harvest/15 dark:text-harvest'
                  : 'border-line bg-earth/30 hover:border-forest/40 dark:border-night-mute/20 dark:bg-night-lift/30'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm text-ink dark:text-night-text">{l.native}</span>
                {lang === l.code && <Check size={16} className="text-forest dark:text-harvest" />}
              </div>
              <span className="text-[11px] text-mute mt-0.5">{l.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={saveProfile} className="rounded-mm border border-line bg-white p-6 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
        <div className="flex items-center gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
          <User className="text-forest dark:text-harvest" size={20} />
          <div>
            <h3 className="font-bold text-ink dark:text-night-text">{t('settings.profile', 'Profile Information')}</h3>
            <p className="text-xs text-mute">Manage your user details and market registration identity.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Full Name</label>
            <input
              name="name"
              defaultValue={user?.name}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20 font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Primary Market Location</label>
            <input
              name="location"
              defaultValue={user?.location}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20 font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Email Address (Read-only)</label>
            <input
              disabled
              defaultValue={user?.email}
              className="w-full rounded-lg border border-line bg-earth/40 px-3 py-2 text-sm text-mute dark:bg-night-lift/50 dark:border-night-mute/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Platform Role</label>
            <div className="w-full rounded-lg border border-line bg-earth/40 px-3 py-2 text-sm font-bold uppercase text-forest dark:bg-night-lift/50 dark:border-night-mute/20 dark:text-harvest">
              {user?.role}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-xs font-bold text-white hover:bg-forest-deep disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving Settings...' : t('common.save', 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
}
