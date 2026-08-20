import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useNotices(collegeId) {
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const fetchNotices = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/notices');
        setNotices(response.data || []);
      } catch (error) {
        console.error("Error fetching notices:", error);
        toast.error("Failed to load notices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, [collegeId]);

  const addNotice = async (data) => {
    setIsAdding(true);
    try {
      await api.post('/notices', data);
      toast.success("Notice published successfully!");
    } catch (error) {
      console.error("Error adding notice:", error);
      toast.error("Failed to publish notice.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateNotice = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await api.put(`/notices/${id}`, data);
      toast.success("Notice updated successfully!");
    } catch (error) {
      console.error("Error updating notice:", error);
      toast.error("Failed to update notice.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteNotice = async (id) => {
    try {
      await api.delete(`/notices/${id}`);
      toast.success("Notice removed.");
    } catch (error) {
      console.error("Error deleting notice:", error);
      toast.error("Failed to remove notice.");
      throw error;
    }
  };

  return { notices, isLoading, isAdding, isUpdating, addNotice, updateNotice, deleteNotice };
}
