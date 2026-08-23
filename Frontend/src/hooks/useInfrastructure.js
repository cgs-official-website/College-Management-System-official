import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useInfrastructure(collegeId) {
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFacilities = useCallback(async () => {
    if (!collegeId) return;
    setIsLoading(true);
    try {
      const response = await api.get('/infrastructure');
      setFacilities(response.data || []);
    } catch (error) {
      console.error("Error fetching infrastructure:", error);
      toast.error("Failed to load facilities");
    } finally {
      setIsLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const addFacility = async (data) => {
    setIsAdding(true);
    try {
      await api.post('/infrastructure', data);
      toast.success("Facility added successfully!");
      await fetchFacilities();
    } catch (error) {
      console.error("Error adding facility:", error);
      toast.error("Failed to add facility.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateFacility = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await api.put(`/infrastructure/${id}`, data);
      toast.success("Facility updated successfully!");
      await fetchFacilities();
    } catch (error) {
      console.error("Error updating facility:", error);
      toast.error("Failed to update facility.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFacility = async (id) => {
    try {
      await api.delete(`/infrastructure/${id}`);
      toast.success("Facility deleted");
      await fetchFacilities();
    } catch (error) {
      console.error("Error deleting facility:", error);
      toast.error("Failed to delete facility");
    }
  };

  return { facilities, isLoading, addFacility, updateFacility, deleteFacility, isAdding, isUpdating, refresh: fetchFacilities };
}
