import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

export default function DemographicsChart({ classData, genderData }) {
  if (!classData?.length && !genderData?.length) {
    return <div className="h-64 flex items-center justify-center text-gray-500">No student data available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-72">
      <div className="h-full">
        <h3 className="text-sm font-semibold text-center mb-2 text-slate-500 dark:text-slate-400">Students per Class</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={classData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#6b7280" />
            <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#6b7280" allowDecimals={false} />
            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} name="Students" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-full">
        <h3 className="text-sm font-semibold text-center mb-2 text-slate-500 dark:text-slate-400">Gender Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={genderData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {genderData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
