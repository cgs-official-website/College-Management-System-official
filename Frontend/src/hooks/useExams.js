import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useExams(collegeId) {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/mock/exams');
        setExams(response.data || []);
      } catch (error) {
        console.error("Error fetching exams:", error);
        toast.error("Failed to load exams");
      } finally {
        setIsLoading(false);
      }
    };
    fetchExams();
  }, [collegeId]);

  const addExam = async (data) => {
    setIsAdding(true);
    try {
      // Mocking successful add
      await new Promise(r => setTimeout(r, 500));
      toast.success("Exam scheduled successfully!");
    } catch (error) {
      toast.error("Failed to schedule exam.");
    } finally {
      setIsAdding(false);
    }
  };

  const updateExam = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      toast.success("Exam updated successfully!");
    } catch (error) {
      toast.error("Failed to update exam.");
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteExam = async (id) => {
    try {
      await new Promise(r => setTimeout(r, 500));
      toast.success("Exam deleted.");
    } catch (error) {
      toast.error("Failed to delete exam.");
    }
  };

  return { exams, isLoading, isAdding, isUpdating, addExam, updateExam, deleteExam };
}
