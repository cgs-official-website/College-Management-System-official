import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const AttendanceReportChart = ({ trendData, summary }) => {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500 font-medium">No attendance data for this range</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-6">
      {summary && (
        <div className="flex flex-row space-x-8 bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Students</span>
            <span className="text-2xl font-bold text-gray-800 mt-1">{summary.totalStudents}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Overall Attendance</span>
            <span className="text-2xl font-bold text-gray-800 mt-1">{summary.overallPercentage}%</span>
          </div>
        </div>
      )}

      <div className="h-96 w-full bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10}
            />
            <YAxis 
              yAxisId="left" 
              stroke="#6b7280" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#6b7280" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 500 }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="attendancePercentage" 
              name="Attendance %" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="absentCount" 
              name="Absences" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AttendanceReportChart;
