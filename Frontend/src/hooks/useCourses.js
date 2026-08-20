import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useCourses(collegeId) {
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['courses', collegeId],
    queryFn: () => api.get(`/courses?collegeId=${collegeId}`),
    enabled: !!collegeId,
  });

  const addCourse = useMutation({
    mutationFn: (newCourse) => api.post('/courses', newCourse),
    onSuccess: () => queryClient.invalidateQueries(['courses', collegeId]),
  });

  const updateCourse = useMutation({
    mutationFn: ({ id, data }) => api.put(`/courses/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries(['courses', collegeId]),
  });

  const deleteCourse = useMutation({
    mutationFn: (id) => api.delete(`/courses/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['courses', collegeId]),
  });

  return {
    courses,
    loading: isLoading,
    error,
    addCourse: addCourse.mutateAsync,
    updateCourse: updateCourse.mutateAsync,
    deleteCourse: deleteCourse.mutateAsync,
  };
}
