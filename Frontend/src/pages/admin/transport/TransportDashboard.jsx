import { useState } from 'react';
import { Bus, MapPin, Users, UserCheck } from 'lucide-react';
import AssignmentsTab from './AssignmentsTab';
import VehiclesTab from './VehiclesTab';
import DriversTab from './DriversTab';
import RoutesTab from './RoutesTab';

const TABS = [
  { key: 'vehicles', label: 'Vehicle Registration', icon: Bus },
  { key: 'drivers', label: 'Driver Registration', icon: Users },
  { key: 'routes', label: 'Routes', icon: MapPin },
  { key: 'assign', label: 'Student Assignment', icon: UserCheck },
];

export default function TransportDashboard() {
  const [tab, setTab] = useState('vehicles');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Transport Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage vehicles, drivers, routes and student assignments.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'vehicles' && <VehiclesTab />}
      {tab === 'drivers' && <DriversTab />}
      {tab === 'routes' && <RoutesTab />}
      {tab === 'assign' && <AssignmentsTab />}
    </div>
  );
}