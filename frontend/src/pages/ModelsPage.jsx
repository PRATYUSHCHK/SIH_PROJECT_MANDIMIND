import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';

export default function ModelsPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/models/performance').then((r) => setData(r.data));
  }, []);
  return (
    <div>
      <PageHeader title="Model performance" subtitle={data?.note} actions={<DataStatusBadge status="HISTORICAL" />} />
      <div className="overflow-x-auto rounded-mm border border-line bg-white p-4 dark:bg-night-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-mute">
              <th>Model</th>
              <th>Metric</th>
              <th>Baseline</th>
              <th>MandiMind</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((r) => (
              <tr key={r._id} className="border-t border-line">
                <td className="py-2">{r.modelName}</td>
                <td>{r.metric}</td>
                <td className="tabular">{r.baselineValue}</td>
                <td className="tabular font-bold">{r.mandimindValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
