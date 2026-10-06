import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LabelList
} from 'recharts';
import { Users, Building2 } from 'lucide-react';

const DEPARTMENT_COLORS = [
  '#3b82f6', // Vibrant Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#e11d48', // Crimson
  '#0284c7', // Sky
  '#d946ef', // Fuchsia
];

// Glassmorphism tooltip with full department name & details
const CustomStaffTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const color = payload[0].color || payload[0].fill || '#3b82f6';

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl text-xs text-white min-w-[160px]">
      <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-white/10 font-semibold text-slate-200">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="truncate max-w-[160px]">{data.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-400">Total Staff:</span>
        <span className="font-bold text-white text-sm">{data.count}</span>
      </div>
    </div>
  );
};

export default function StaffOverviewChart({ deptData = [] }) {
  const totalStaff = useMemo(() => {
    return deptData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [deptData]);

  if (!deptData?.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center p-4">
        <Building2 className="w-8 h-8 mb-2 opacity-40" />
        <span className="text-sm font-medium">No department staff data available</span>
      </div>
    );
  }

  // Adjust bar width dynamically based on data points count
  const barSize = deptData.length <= 4 ? 36 : deptData.length <= 8 ? 26 : deptData.length <= 14 ? 20 : 16;

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Micro-header with count badges */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary-500" />
          <span>{deptData.length} Departments</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <Users className="w-3.5 h-3.5 text-emerald-500" />
          <span>{totalStaff} Total Faculty & Staff</span>
        </div>
      </div>

      {/* Upright Vertical Columns Bar Chart with Angled X-Axis Labels */}
      <div className="h-80 sm:h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={deptData} 
            margin={{ top: 20, right: 15, left: -15, bottom: 65 }}
          >
            <CartesianGrid 
              strokeDasharray="4 4" 
              vertical={false} 
              stroke="currentColor" 
              className="text-slate-200/80 dark:text-white/[0.06]" 
            />
            <XAxis 
              dataKey="name" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              stroke="#94a3b8"
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              stroke="#94a3b8" 
              allowDecimals={false}
            />
            <RechartsTooltip content={<CustomStaffTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar 
              dataKey="count" 
              name="Staff Count" 
              radius={[6, 6, 0, 0]} 
              barSize={barSize}
            >
              <LabelList 
                dataKey="count" 
                position="top" 
                fill="#94a3b8" 
                fontSize={11} 
                offset={6} 
              />
              {deptData.map((_, index) => (
                <Cell 
                  key={`cell-dept-${index}`} 
                  fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Responsive Department Color Badges */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
        {deptData.map((d, index) => {
          const color = DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
          return (
            <div 
              key={`pill-${index}`} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 text-[11px]"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {d.name}
              </span>
              <span className="font-bold text-slate-900 dark:text-white ml-0.5 px-1 py-0.2 rounded bg-slate-200/50 dark:bg-white/10">
                {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
