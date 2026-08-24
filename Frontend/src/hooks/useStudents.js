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
      toast.error(err.message || 'Failed to add student');
    }
  });

  const updateStudent = useMutation({
    mutationFn: ({ id, data }) => api.put(`/students/${id}`, data),
    onSuccess: () => {
      toast.success('Student record updated!');
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update student');
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
      const stats = res.data?.data || {};
      toast.success(`Imported ${stats.successful || 0} students successfully!`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} failed.`);
        console.error('Import errors:', stats.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to bulk import students');
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
