import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const STATUS_COLORS = {
  'PAID': '#10b981',
  'PENDING': '#f59e0b',
  'OVERDUE': '#f43f5e',
  'PARTIAL': '#3b82f6',
  'UNKNOWN': '#9ca3af'
};

export default function FinancialSummaryChart({ statusData, typeData }) {
  if (!statusData?.length && !typeData?.length) {
    return <div className="h-64 flex items-center justify-center text-gray-500">No financial data available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-72">
      <div className="h-full">
         <h3 className="text-sm font-semibold text-center mb-2 text-slate-500 dark:text-slate-400">Amount by Fee Type</h3>
         <ResponsiveContainer width="100%" height="100%">
          <BarChart data={typeData} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#6b7280" />
            <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#6b7280" tickFormatter={(val) => `₹${val}`} />
            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(val) => `₹${val}`} />
            <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} name="Total Amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-full">
        <h3 className="text-sm font-semibold text-center mb-2 text-slate-500 dark:text-slate-400">Amount by Status</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toUpperCase()] || '#9ca3af'} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(val) => `₹${val}`} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
