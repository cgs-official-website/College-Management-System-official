import React from 'react';
import { motion } from 'framer-motion';
import { Bus, MapPin, Phone, Loader2, CheckCircle2, Hourglass, User } from 'lucide-react';
import { useStudentTransport } from '../../hooks/useStudentPortal';

const card = 'bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm';

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 pt-3">
    <span className="text-slate-500">{label}</span>
    <span className="font-bold text-slate-900 dark:text-white text-right">{children}</span>
  </div>
);

const StudentTransport = () => {
  const { data, isLoading } = useStudentTransport();
  const t = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const route = t?.route;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transport & Bus Routes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your assigned college bus, driver and route stops.</p>
      </div>

      {t?.state === 'assigned' && route && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={card}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Bus</h3>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Route allocated
                </span>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              <Row label="Route">{route.name}</Row>
              {route.stop && <Row label="Your stop">{route.stop}</Row>}
              {route.fee && (
                <Row label={`Transport fee${route.fee.term ? ` (${route.fee.term})` : ''}`}>
                  ₹{route.fee.amount.toLocaleString('en-IN')}{' '}
                  <span className={route.fee.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                    · {route.fee.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </Row>
              )}
              <Row label="Bus number">
                {route.bus ? <span className="font-mono">{route.bus.vehicleNo}</span> : 'Not assigned yet'}
              </Row>
              {route.bus?.vehicleType && <Row label="Vehicle type">{route.bus.vehicleType}</Row>}
              <Row label="Route status">{route.status}</Row>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={card}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Driver</h3>
            </div>
            {route.driver ? (
              <div className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                <Row label="Name">{route.driver.name}</Row>
                <Row label="Phone">
                  <a href={`tel:${route.driver.phone}`} className="inline-flex items-center gap-1 text-primary-600 hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {route.driver.phone}
                  </a>
                </Row>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No driver has been linked to this bus yet.</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${card} md:col-span-2`}>
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Route Stops</h3>
            </div>
            {route.stops?.length ? (
              <ol className="flex flex-wrap gap-2">
                {route.stops.map((s, i) => (
                  <li key={`${s}-${i}`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                    {i + 1}. {s}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">Stops have not been added for this route yet.</p>
            )}
            <p className="text-xs text-slate-400 mt-4">
              For pickup timings or a change of stop, please contact the transport desk.
            </p>
          </motion.div>
        </div>
      )}

      {t?.state === 'waiting' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${card} p-16 text-center`}>
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hourglass className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">Bus Request Received</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            You've asked for college transport, but a route hasn't been assigned yet. The transport desk will assign one soon.
          </p>
        </motion.div>
      )}

      {(!t || t.state === 'none') && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${card} p-16 text-center`}>
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bus className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Transport Subscription</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            You don't currently use college transport. To start, contact the transport desk or ask the admin office to update your record.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default StudentTransport;