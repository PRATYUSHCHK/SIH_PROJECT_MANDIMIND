import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { AlertCard } from '../components/AlertCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export default function AlertsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get('/alerts').then((r) => setItems(r.data.items));
  }, []);
  return (
    <div>
      <PageHeader title="Alerts" />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((a) => (
          <AlertCard key={a._id} alert={a} />
        ))}
      </div>
    </div>
  );
}
