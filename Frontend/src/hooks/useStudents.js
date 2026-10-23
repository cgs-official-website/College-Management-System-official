import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export function useStudents(collegeId) {
  const queryClient = useQueryClient();

  const { data: response = {}, isLoading, error, refetch } = useQuery({
    queryKey: ['students', collegeId],
    queryFn: () => api.get(`/students?collegeId=${collegeId}`),
    enabled: !!collegeId,
  });

  const students = Array.isArray(response?.data) 
    ? response.data 
    : (Array.isArray(response) ? response : []);

  const addStudent = useMutation({
    mutationFn: (newStudent) => api.post('/students', newStudent),
    onSuccess: () => {
      toast.success('Student added successfully!');
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to add student';
      toast.error(msg);
    }
  });

  const updateStudent = useMutation({
    mutationFn: ({ id, data }) => api.put(`/students/${id}`, data),
    onSuccess: () => {
      toast.success('Student record updated!');
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update student';
      toast.error(msg);
    }
  });

  const deleteStudent = useMutation({
    mutationFn: (id) => api.delete(`/students/${id}`),
    onSuccess: () => {
      toast.success('Student deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete student');
    }
  });

  const bulkImport = useMutation({
    mutationFn: (data) => api.post('/students/bulk', { data }),
    onSuccess: (res) => {
      const stats = res?.data?.data || res?.data || res || {};
      const successCount = stats.successful ?? stats.count ?? 0;
      if (successCount > 0) {
        toast.success(`Imported ${successCount} student${successCount === 1 ? '' : 's'} successfully!`);
      }
      if (stats.failed > 0) {
        if (Array.isArray(stats.errors) && stats.errors.length > 0) {
          stats.errors.slice(0, 5).forEach((errMsg) => {
            toast.error(errMsg, { duration: 6000 });
          });
          if (stats.errors.length > 5) {
            toast.error(`...and ${stats.errors.length - 5} more error(s). Check console for full details.`, { duration: 6000 });
          }
        } else {
          toast.error(`${stats.failed} row(s) failed to import.`);
        }
        console.error('Import errors:', stats.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to import students');
    }
  });

  return {
    students,
    isLoading,
    isAdding: addStudent.isPending,
    isUpdating: updateStudent.isPending,
    isDeleting: deleteStudent.isPending,
    isImporting: bulkImport.isPending,
    error,
    refetch,
    addStudent: addStudent.mutateAsync,
    updateStudent: updateStudent.mutateAsync,
    deleteStudent: deleteStudent.mutateAsync,
    bulkImport: bulkImport.mutateAsync,
  };
}
