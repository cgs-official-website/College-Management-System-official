import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useFees(collegeId) {
  const [fees, setFees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFees = useCallback(async () => {
    if (!collegeId) return;

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
  }, [collegeId]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const addFee = async (data) => {
    setIsAdding(true);
    try {
      const response = await api.post('/fees', data);
      toast.success("Fee record created successfully!");
      await fetchFees();
      return response;
    } catch (error) {
      console.error("Error adding fee:", error);
      const message = error?.message || "Failed to record fee.";
      toast.error(message);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateFee = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      const response = await api.put(`/fees/${id}`, data);
      toast.success("Fee record updated successfully!");
      await fetchFees();
      return response;
    } catch (error) {
      console.error("Error updating fee:", error);
      const message = error?.message || "Failed to update fee record.";
      toast.error(message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFee = async (id) => {
    try {
      const response = await api.delete(`/fees/${id}`);
      toast.success("Fee record deleted.");
      await fetchFees();
      return response;
    } catch (error) {
      console.error("Error deleting fee:", error);
      const message = error?.message || "Failed to delete fee record.";
      toast.error(message);
      throw error;
    }
  };

  return { fees, isLoading, isAdding, isUpdating, addFee, updateFee, deleteFee, refetch: fetchFees };
}
