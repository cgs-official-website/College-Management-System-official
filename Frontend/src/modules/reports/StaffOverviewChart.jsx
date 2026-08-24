import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function StaffOverviewChart({ deptData }) {
  if (!deptData?.length) {
    return <div className="h-64 flex items-center justify-center text-gray-500">No staff data available</div>;
  }

  const chartHeight = Math.max(300, deptData.length * 45 + 50);

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <h3 className="text-sm font-semibold text-center mb-4 text-slate-500 dark:text-slate-400">Staff per Department</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={deptData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} stroke="#6b7280" allowDecimals={false} />
          <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} stroke="#6b7280" width={160} />
          <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
          <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} name="Staff Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
