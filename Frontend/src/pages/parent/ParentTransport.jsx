import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bus, 
  Clock, 
  Phone, 
  AlertCircle, 
  MapPin, 
  User, 
  Radio, 
  CheckCircle2, 
  Navigation,
  Loader2
} from 'lucide-react';
import { useParentTransport } from '../../hooks/useParentPortal';
import { useParentChild } from '../../contexts/ParentChildContext';

export default function ParentTransport() {
  const { activeChildId, activeChild } = useParentChild();
  const { data, isLoading, isError } = useParentTransport(activeChildId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading child's transport route & bus data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unable to Load Transport Info</h2>
        <p className="text-slate-500 text-sm">Failed to retrieve transport route allocation. Please try again later.</p>
      </div>
    );
  }

  const isAssigned = data?.isAssigned;
  const route = data?.routeDetails;
  const vehicle = data?.vehicleDetails;

  const routeStops = [
    { name: route?.startLocation || 'City Center Main Depot', time: '07:30 AM', status: 'completed' },
    { name: 'North Avenue Sector 4 Junction', time: '07:45 AM', status: 'completed' },
    { name: 'Green Park Metro Station Gate 2', time: '08:05 AM', status: 'in-transit' },
    { name: 'Central Boulevard Roundabout', time: '08:20 AM', status: 'upcoming' },
    { name: route?.endLocation || 'College Main Campus Gate 1', time: '08:40 AM', status: 'upcoming' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Child's Transport & Route
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time transit monitoring and bus allocation details for{' '}
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {activeChild?.name || 'your child'}
            </span>.
          </p>
        </div>

        {isAssigned && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Active Transit Monitoring
          </div>
        )}
      </div>

      {!isAssigned || !route ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bus className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Transport Route Assigned</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {activeChild?.name || 'Your child'} is currently listed as a Day Scholar without institutional bus service. Contact the college transport desk if you wish to apply for bus service.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Route Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 lg:p-8 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Bus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{route.routeName}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Institutional Transit Line • Morning & Evening Shift</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-extrabold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Estimated Pickup: 07:45 AM
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Boarding / Start Point</p>
                  <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{route.startLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Campus Destination</p>
                  <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{route.endLocation}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Vehicle and Driver Info */}
          {vehicle && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                    <Bus className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Assigned College Vehicle</p>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{vehicle.vehicleNumber}</h3>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">GPS Tracking Active</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Designated Driver</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{vehicle.driverName}</h3>
                    <p className="text-xs text-slate-400 font-medium">Certified Transit Staff</p>
                  </div>
                </div>
                <a
                  href={`tel:${vehicle.driverPhone}`}
                  className="px-4 py-2.5 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {vehicle.driverPhone}
                </a>
              </motion.div>
            </div>
          )}

          {/* Stoppage Timeline */}
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 lg:p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Route Stoppage Timeline</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Scheduled boarding halts and estimated arrival milestones</p>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
              {routeStops.map((stop, idx) => {
                const isCompleted = stop.status === 'completed';
                const isInTransit = stop.status === 'in-transit';

                return (
                  <div key={idx} className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className={`absolute -left-6 w-4 h-4 rounded-full border-2 bg-white dark:bg-[#0A0F1C] flex items-center justify-center ${
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-500'
                          : isInTransit
                          ? 'border-teal-500 ring-4 ring-teal-500/20 bg-teal-500'
                          : 'border-slate-300 dark:border-white/20'
                      }`} />
                      <div>
                        <h4 className={`text-sm font-bold ${
                          isCompleted || isInTransit 
                            ? 'text-slate-900 dark:text-white' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {stop.name}
                        </h4>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Scheduled: {stop.time}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : isInTransit
                          ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 animate-pulse'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                      }`}>
                        {isInTransit ? 'In Transit' : isCompleted ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
