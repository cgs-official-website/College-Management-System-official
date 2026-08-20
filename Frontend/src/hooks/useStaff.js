import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useStaff(collegeId) {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/staff');
        setStaff(response.data || []);
      } catch (error) {
        console.error("Error fetching staff:", error);
        toast.error("Failed to load staff directory");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [collegeId]);

  const addStaff = async (data) => {
    setIsAdding(true);
    try {
      await api.post('/staff', data);
      toast.success("Staff member added successfully!");
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error("Failed to add staff member.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateStaff = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await api.put(`/staff/${id}`, data);
      toast.success("Staff member updated successfully!");
    } catch (error) {
      console.error("Error updating staff:", error);
      toast.error("Failed to update staff member.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteStaff = async (id) => {
    try {
      await api.delete(`/staff/${id}`);
      toast.success("Staff member removed.");
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error("Failed to remove staff member.");
      throw error;
    }
  };

  return { staff, isLoading, isAdding, isUpdating, addStaff, updateStaff, deleteStaff };
}
