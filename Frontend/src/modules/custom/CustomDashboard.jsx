import React from 'react';
import { useCustomRecords, useCreateCustomRecord, useDeleteCustomRecord } from './useCustom';
import { Button } from '../../components/ui/Button'; 
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CustomDashboard() {
  const { data: recordsData, isLoading, isError } = useCustomRecords();
  const createMutation = useCreateCustomRecord();
  const deleteMutation = useDeleteCustomRecord();

  const handleCreate = () => {
    createMutation.mutate(
      { name: 'New Custom Entry', description: 'Generated via UI', status: 'ACTIVE' },
      {
        onSuccess: () => toast.success('Record created successfully!'),
        onError: () => toast.error('Failed to create record.')
      }
    );
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Record deleted successfully!'),
      onError: () => toast.error('Failed to delete record.')
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Custom Module Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your custom records here.
          </p>
        </div>
        <Button onClick={handleCreate} isLoading={createMutation.isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
        {isLoading ? (
          <div className="text-center text-slate-500 py-8">Loading records...</div>
        ) : isError ? (
          <div className="text-center text-red-500 py-8">Failed to load records. Ensure the backend route is registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recordsData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  recordsData?.data?.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{record.name}</td>
                      <td className="px-6 py-4 text-slate-500">{record.description}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(record.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
