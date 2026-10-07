import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { 
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown,
  Calendar, Sparkles, CheckCircle2, AlertCircle, BarChart3, Activity
} from 'lucide-react';

// Custom smooth tooltip for the charts
const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl text-xs text-white min-w-[160px] transition-all">
      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-white/10 text-slate-400 font-medium">
        <Calendar className="w-3.5 h-3.5 text-primary-400" />
        <span>{label}</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-full shadow-sm" 
                style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} 
              />
              <span className="text-slate-300 capitalize">{entry.name}:</span>
            </div>
            <span className="font-bold text-white">
              {entry.name.includes('%') ? `${entry.value}%` : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AttendanceReportChart({ 
  trendData = [], 
  summary = {}, 
  groupedResults = [],
  selectedRange = 30,
  onRangeChange = null
}) {
  const [activeView, setActiveView] = useState('bars'); // 'bars' | 'trend' | 'volume' | 'classes'

  // Aggregate stats from trendData and summary
  const stats = useMemo(() => {
    const totalStudents = summary?.totalStudents || 0;
    const overallPercentage = summary?.overallPercentage !== undefined 
      ? summary.overallPercentage 
      : 0;

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let daysTracked = trendData.length;

    trendData.forEach(d => {
      totalPresent += d.presentCount || 0;
      totalAbsent += d.absentCount || 0;
      totalLate += d.lateCount || 0;
    });

    const totalRecords = totalPresent + totalAbsent + totalLate;
    const avgPresentRate = totalRecords > 0 
      ? Math.round(((totalPresent + totalLate) / totalRecords) * 100) 
      : overallPercentage;

    return {
      totalStudents,
      overallPercentage: avgPresentRate,
      totalPresent,
      totalAbsent,
      totalLate,
      daysTracked,
      isHealthy: avgPresentRate >= 75
    };
  }, [trendData, summary]);

  // Format dates for smooth chart display (e.g., 'Oct 12' or '12/10')
  const formattedTrendData = useMemo(() => {
    return trendData.map(item => {
      let formattedDate = item.date;
      try {
        const d = new Date(item.date);
        formattedDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch {
        // Fallback to original
      }

      const total = (item.presentCount || 0) + (item.absentCount || 0) + (item.lateCount || 0);
      const attendancePct = Number(item.attendancePercentage || 0);
      const absentPct = total > 0 
        ? Number(((item.absentCount / total) * 100).toFixed(1)) 
        : Math.max(0, 100 - attendancePct);

      return {
        ...item,
        displayDate: formattedDate,
        attendancePercentage: attendancePct,
        absentPercentage: absentPct
      };
    });
  }, [trendData]);

  if (!trendData || trendData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center mb-4 shadow-inner">
          <Activity className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          No Attendance Trends Recorded Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Daily attendance records marked by teachers and faculty will automatically stream into this dynamic analytics chart.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* 1. Smooth KPI Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance Rate */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-500/5 via-primary-500/[0.02] to-transparent dark:from-primary-500/10 dark:via-transparent border border-primary-500/20 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              Overall Attendance
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              stats.overallPercentage >= 85 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : stats.overallPercentage >= 75
                ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            }`}>
              {stats.overallPercentage >= 85 ? 'Optimal' : stats.overallPercentage >= 75 ? 'Healthy' : 'Low'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stats.overallPercentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              30-day average
            </span>
          </div>
          <div className="w-full bg-slate-200/80 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-primary-500 h-full rounded-full transition-all duration-700 ease-out" 
              style={{ width: `${Math.min(100, stats.overallPercentage)}%` }}
            />
          </div>
        </div>

        {/* Total Active Students */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Students Tracked
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stats.totalStudents || stats.totalPresent + stats.totalAbsent > 0 ? (stats.totalStudents || stats.daysTracked) : 0}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active student cohort
            </p>
          </div>
        </div>

        {/* Total Present Entries */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Present
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {stats.totalPresent.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Marked present</span>
            </p>
          </div>
        </div>

        {/* Absences / Late */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Absences & Late
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                {stats.totalAbsent.toLocaleString()}
              </span>
              <span className="text-xs text-amber-500 font-semibold">
                + {stats.totalLate} Late
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Requires attention</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* View Mode Toggle */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveView('bars')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
              activeView === 'bars'
                ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Daily Attendance</span>
          </button>
          {groupedResults?.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveView('classes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
                activeView === 'classes'
                  ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Class</span>
            </button>
          )}
        </div>

        {/* Range Selector Pill */}
        {onRangeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1 font-medium">Window:</span>
            {[7, 14, 30].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => onRangeChange(days)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedRange === days
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Smooth Dynamic Chart Container */}
      <div className="h-80 w-full bg-slate-50/40 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 rounded-2xl p-4 sm:p-5">
        <ResponsiveContainer width="100%" height="100%">
          {activeView === 'bars' ? (
            /* Paired Thin Bar Graph: Present (Blue) & Absent (Red) */
            <BarChart 
              data={formattedTrendData} 
              margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
              barGap={4}
            >
              <defs>
                <linearGradient id="presentBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="absentBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="4 4" 
                vertical={false} 
                stroke="currentColor" 
                className="text-slate-200/80 dark:text-white/[0.06]" 
              />
              <XAxis 
                dataKey="displayDate" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <RechartsTooltip content={<CustomChartTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                height={32} 
                iconType="circle"
                formatter={(val) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium ml-1">
                    {val}
                  </span>
                )}
              />
              {/* Thin Present Bar */}
              <Bar 
                dataKey="attendancePercentage" 
                name="Present %" 
                fill="url(#presentBarGrad)"
                radius={[4, 4, 0, 0]} 
                barSize={16}
              />
              {/* Thin Absent Bar (Red) */}
              <Bar 
                dataKey="absentPercentage" 
                name="Absent %" 
                fill="url(#absentBarGrad)"
                radius={[4, 4, 0, 0]} 
                barSize={16}
              />
            </BarChart>
          ) : (
            /* Class Performance Bar Chart */
            <BarChart 
              data={groupedResults} 
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="4 4" 
                horizontal={false} 
                stroke="currentColor" 
                className="text-slate-200/80 dark:text-white/[0.06]" 
              />
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                unit="%" 
                stroke="#94a3b8" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <RechartsTooltip 
                formatter={(val) => [`${val}%`, 'Attendance Rate']}
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Bar 
                dataKey="attendancePercentage" 
                name="Attendance" 
                fill="#3b82f6" 
                radius={[0, 6, 6, 0]} 
                barSize={20}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 4. Smooth Footer Micro-Insights */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Institutional Attendance Telemetry</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{stats.daysTracked} Active Observation Days</span>
          <span>•</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {stats.overallPercentage}% Average Ratio
          </span>
        </div>
      </div>
    </div>
  );
}
