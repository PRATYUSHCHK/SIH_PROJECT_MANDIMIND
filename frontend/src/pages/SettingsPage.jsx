import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  async function save(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    await api.patch('/auth/me', { name: form.get('name'), location: form.get('location'), language: form.get('language') });
    toast.push('Profile saved. Reload to see language on farmer screens.');
  }
  return (
    <div>
      <PageHeader title="Settings" />
      <form onSubmit={save} className="max-w-lg space-y-3 rounded-mm border border-line bg-white p-5 dark:bg-night-card">
        <label className="block text-sm">
          Name
          <input name="name" defaultValue={user?.name} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
        </label>
        <label className="block text-sm">
          Location
          <input name="location" defaultValue={user?.location} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
        </label>
        <label className="block text-sm">
          Language
          <select name="language" defaultValue={user?.language || 'en'} className="mt-1 w-full rounded-xl border border-line px-3 py-2">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="te">Telugu</option>
            <option value="ta">Tamil</option>
          </select>
        </label>
        <button className="rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white">Save</button>
      </form>
    </div>
  );
}
