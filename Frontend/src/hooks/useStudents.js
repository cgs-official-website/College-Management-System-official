import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useStudents(collegeId) {
  const queryClient = useQueryClient();

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['students', collegeId],
    queryFn: () => api.get(`/students?collegeId=${collegeId}`),
    enabled: !!collegeId,
  });

  const addStudent = useMutation({
    mutationFn: (newStudent) => api.post('/students', newStudent),
    onSuccess: () => queryClient.invalidateQueries(['students', collegeId]),
  });

  const updateStudent = useMutation({
    mutationFn: ({ id, data }) => api.put(`/students/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries(['students', collegeId]),
  });

  const deleteStudent = useMutation({
    mutationFn: (id) => api.delete(`/students/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['students', collegeId]),
  });

  return {
    students,
    loading: isLoading,
    error,
    addStudent: addStudent.mutateAsync,
    updateStudent: updateStudent.mutateAsync,
    deleteStudent: deleteStudent.mutateAsync,
  };
}
