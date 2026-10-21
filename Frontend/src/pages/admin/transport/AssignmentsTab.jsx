import { useState, useMemo } from 'react';
import { Search, UserPlus, UserMinus, Users } from 'lucide-react';
import { useRoutes, useAllocations, useTerms } from '../../../hooks/useTransportAdmin';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { StatCard, SelectField } from './transportUi';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AssignmentsTab() {
  const confirm = useConfirm();
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const { items: routes, stats } = useRoutes();
  const { items: terms } = useTerms();
  const {
    waiting, waitingTotal, allocated, isLoading, isLoadingAllocated,
    assign, unassign, changeStop, isAssigning, isUnassigning, isChangingStop,
  } = useAllocations(routeId);

  const route = routes.find((r) => r.id === routeId);
  const stop = route?.stops?.find((s) => s.id === stopId);
  const currentTerm = terms.find((t) => t.isCurrent);
  const free = route?.vehicle ? route.seats - route.studentsCount : 0;
  const over = selected.size > free;
  const total = stop ? stop.fee * selected.size : 0;

  const blocker = !routeId
    ? ''
    : !route?.vehicle
    ? 'This route has no bus yet.'
    : !route.stops?.length
    ? 'This route has no stops. Add stops in the Routes tab first.'
    : !currentTerm
    ? 'No current fee term. Set one in the Fee Term tab.'
    : '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return waiting.filter((s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      String(s.admissionNo || '').toLowerCase().includes(q) ||
      String(s.rollNumber || '').toLowerCase().includes(q)
    );
  }, [waiting, search]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) filtered.forEach((s) => next.delete(s.id));
    else filtered.forEach((s) => next.add(s.id));
    setSelected(next);
  };
  const selectFirstFree = () => setSelected(new Set(filtered.slice(0, Math.max(free, 0)).map((s) => s.id)));

  const changeRoute = (id) => { setRouteId(id); setStopId(''); };

  const handleAssign = async () => {
    try {
      await assign({ routeId, stopId, studentIds: [...selected] });
      setSelected(new Set());
    } catch {
      // toast shown by the hook
    }
  };

  const handleUnassign = async (s) => {
    const ok = await confirm({
      title: 'Remove from Route',
      message: `Remove ${s.name} from "${s.routeName}"? An unpaid transport fee will be deleted. A paid fee is kept. They go back to the "needs bus" list.`,
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (ok) {
      try { await unassign([s.id]); } catch { /* toast */ }
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Pick a route and a stop, tick the students for that stop, then assign. Repeat for the next stop.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Needs Bus" value={isLoading ? '...' : waitingTotal} tone="amber" />
        <StatCard title="Assigned" value={stats.studentsAssigned ?? 0} tone="green" />
        <StatCard title="Current Term" value={currentTerm?.label || 'None'} tone={currentTerm ? 'green' : 'amber'} />
        <StatCard title="Seats Left (selected route)" value={route?.vehicle ? free : '-'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs bus queue */}
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4" /> Needs Bus ({waitingTotal})
            </h3>
            <span className="text-xs text-slate-500">{selected.size} selected</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, admission or roll no..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
              Select all shown
            </label>
            {route?.vehicle && free > 0 && (
              <button type="button" onClick={selectFirstFree} className="text-primary-600 font-semibold hover:underline">
                Select first {Math.min(free, filtered.length)}
              </button>
            )}
          </div>

          <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 border border-slate-100 dark:border-white/5 rounded-xl">
            {isLoading ? (
              <p className="py-10 text-center text-slate-400 text-sm">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-slate-400 text-sm">
                {waitingTotal === 0 ? 'No students are waiting for a bus.' : 'No students match your search.'}
              </p>
            ) : filtered.map((s) => (
              <label key={s.id} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                <input type="checkbox" className="mt-1" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.admissionNo}{s.class ? ` · ${s.class}` : ''}{s.section ? ` (${s.section})` : ''}
                  </p>
                  {s.address && <p className="text-xs text-slate-400 truncate">{s.address}</p>}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
          <SelectField label="Route" value={routeId} onChange={(e) => changeRoute(e.target.value)}>
            <option value="">Select a route</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id} disabled={!r.vehicle}>
                {r.name} {r.vehicle ? `(${r.vehicle.vehicleNo}, ${r.studentsCount}/${r.seats})` : '(no bus)'}
              </option>
            ))}
          </SelectField>

          {route && (
            <SelectField label="Stop (semester fee)" value={stopId} onChange={(e) => setStopId(e.target.value)}>
              <option value="">Select a stop</option>
              {(route.stops || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({inr(s.fee)})</option>
              ))}
            </SelectField>
          )}

          {route && (
            <div className="text-xs rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2 text-slate-600 dark:text-slate-300 space-y-0.5">
              <p>Bus: <span className="font-mono">{route.vehicle?.vehicleNo}</span> · {route.studentsCount}/{route.seats} seats used</p>
              {currentTerm && <p>Fee term: {currentTerm.label}</p>}
            </div>
          )}

          {blocker && <p className="text-xs text-amber-600 font-medium">{blocker}</p>}

          {over && route?.vehicle && (
            <p className="text-xs text-rose-600 font-medium">
              {free <= 0
                ? 'This bus is full.'
                : `Only ${free} seat(s) left. Deselect ${selected.size - free} student(s).`}
            </p>
          )}

          {stop && selected.size > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selected.size} × {inr(stop.fee)} = <span className="font-bold">{inr(total)}</span> in transport fees will be created.
            </p>
          )}

          <Button
            onClick={handleAssign}
            isLoading={isAssigning}
            disabled={!routeId || !stopId || selected.size === 0 || over || !!blocker}
            className="w-full flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assign {selected.size > 0 ? selected.size : ''} Student{selected.size === 1 ? '' : 's'}
          </Button>

          <div className="pt-2 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              On this route ({allocated.length})
            </h4>
            {!routeId ? (
              <p className="py-6 text-center text-slate-400 text-sm">Select a route to see its students.</p>
            ) : isLoadingAllocated ? (
              <p className="py-6 text-center text-slate-400 text-sm">Loading...</p>
            ) : allocated.length === 0 ? (
              <p className="py-6 text-center text-slate-400 text-sm">No students on this route yet.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                {allocated.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.admissionNo}{s.feeStatus ? ` · fee ${s.feeStatus}` : ''}
                      </p>
                      <select
                        value={s.stopId}
                        disabled={isChangingStop || s.feeStatus === 'paid'}
                        title={s.feeStatus === 'paid' ? 'Fee is paid, stop cannot be changed' : 'Change stop'}
                        onChange={(e) => changeStop({ studentId: s.id, stopId: e.target.value }).catch(() => {})}
                        className="mt-1 text-xs px-2 py-1 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg disabled:opacity-60"
                      >
                        {(route?.stops || []).map((st) => (
                          <option key={st.id} value={st.id}>{st.name} ({inr(st.fee)})</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleUnassign(s)}
                      disabled={isUnassigning}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg disabled:opacity-50"
                      title="Remove from route"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}