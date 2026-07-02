import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as studentService from '../services/studentService';
import toast from 'react-hot-toast';

export const useStudents = (collegeId) => {
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: ['students', collegeId],
    queryFn: () => studentService.getStudents(collegeId),
    enabled: !!collegeId,
  });

  const addStudentMutation = useMutation({
    mutationFn: studentService.addStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
      toast.success('Student added successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add student');
    }
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }) => studentService.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
      toast.success('Student updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update student');
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: studentService.deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
      toast.success('Student deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete student');
    }
  });

  return {
    students: studentsQuery.data || [],
    isLoading: studentsQuery.isLoading,
    error: studentsQuery.error,
    addStudent: addStudentMutation.mutateAsync,
    updateStudent: updateStudentMutation.mutateAsync,
    deleteStudent: deleteStudentMutation.mutateAsync,
    isAdding: addStudentMutation.isPending,
    isUpdating: updateStudentMutation.isPending,
    isDeleting: deleteStudentMutation.isPending,
  };
};

export const useStudent = (studentId) => {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getStudentById(studentId),
    enabled: !!studentId,
  });
};
