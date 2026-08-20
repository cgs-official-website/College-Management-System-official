import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useInfrastructure(collegeId) {
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const fetchFacilities = async () => {
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
    };

    fetchFacilities();
  }, [collegeId]);

  const addFacility = async (data) => {
    setIsAdding(true);
    try {
      await api.post('/infrastructure', data);
      toast.success("Facility added successfully!");
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
      toast.success("Facility removed.");
    } catch (error) {
      console.error("Error deleting facility:", error);
      toast.error("Failed to remove facility.");
      throw error;
    }
  };

  return { facilities, isLoading, isAdding, isUpdating, addFacility, updateFacility, deleteFacility };
}
