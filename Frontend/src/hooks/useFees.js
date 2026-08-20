import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useFees(collegeId) {
  const [fees, setFees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const fetchFees = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/fees');
        setFees(response.data || []);
      } catch (error) {
        console.error("Error fetching fees:", error);
        toast.error("Failed to load fee records");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFees();
  }, [collegeId]);

  const addFee = async (data) => {
    setIsAdding(true);
    try {
      await api.post('/fees', data);
      toast.success("Fee record created successfully!");
    } catch (error) {
      console.error("Error adding fee:", error);
      toast.error("Failed to record fee.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateFee = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await api.put(`/fees/${id}`, data);
      toast.success("Fee record updated successfully!");
    } catch (error) {
      console.error("Error updating fee:", error);
      toast.error("Failed to update fee record.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFee = async (id) => {
    try {
      await api.delete(`/fees/${id}`);
      toast.success("Fee record deleted.");
    } catch (error) {
      console.error("Error deleting fee:", error);
      toast.error("Failed to delete fee record.");
      throw error;
    }
  };

  return { fees, isLoading, isAdding, isUpdating, addFee, updateFee, deleteFee };
}
