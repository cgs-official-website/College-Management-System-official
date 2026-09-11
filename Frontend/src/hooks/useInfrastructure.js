import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useInfrastructure(collegeId) {
  const [facilities, setFacilities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Fetch facilities
  const fetchFacilities = useCallback(async () => {
    if (!collegeId) return;
    setIsLoading(true);
    try {
      const response = await api.get('/infrastructure');
      setFacilities(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Error fetching infrastructure:", error);
      toast.error("Failed to load facilities");
    } finally {
      setIsLoading(false);
    }
  }, [collegeId]);

  // Fetch booking requests
  const fetchRequests = useCallback(async () => {
    if (!collegeId) return;
    setIsRequestsLoading(true);
    try {
      const response = await api.get('/infrastructure/requests');
      setRequests(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Error fetching infrastructure requests:", error);
    } finally {
      setIsRequestsLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    fetchFacilities();
    fetchRequests();
  }, [fetchFacilities, fetchRequests]);

  const addFacility = async (data) => {
    setIsAdding(true);
    try {
      await api.post('/infrastructure', data);
      toast.success("Facility registered successfully!");
      await fetchFacilities();
    } catch (error) {
      console.error("Error adding facility:", error);
      toast.error(error.response?.data?.error?.message || "Failed to add facility.");
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
      toast.error(error.response?.data?.error?.message || "Failed to update facility.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFacility = async (id) => {
    try {
      await api.delete(`/infrastructure/${id}`);
      toast.success("Facility removed");
      await fetchFacilities();
    } catch (error) {
      console.error("Error deleting facility:", error);
      toast.error(error.response?.data?.error?.message || "Failed to delete facility");
    }
  };

  // HOD / Requester creates a booking request
  const createRequest = async (data) => {
    setIsSubmittingRequest(true);
    try {
      await api.post('/infrastructure/requests', data);
      toast.success("Permission request submitted to Admin!");
      await fetchRequests();
    } catch (error) {
      console.error("Error creating facility request:", error);
      toast.error(error.response?.data?.error?.message || "Failed to submit request.");
      throw error;
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Admin reviews (Approve/Reject)
  const reviewRequest = async ({ id, status, adminRemarks }) => {
    setIsReviewing(true);
    try {
      await api.put(`/infrastructure/requests/${id}/review`, { status, adminRemarks });
      toast.success(`Request ${status === 'approved' ? 'Approved' : 'Rejected'} successfully!`);
      await fetchRequests();
    } catch (error) {
      console.error("Error reviewing facility request:", error);
      toast.error(error.response?.data?.error?.message || "Failed to update request.");
      throw error;
    } finally {
      setIsReviewing(false);
    }
  };

  return { 
    facilities, 
    requests,
    isLoading, 
    isRequestsLoading,
    addFacility, 
    updateFacility, 
    deleteFacility, 
    createRequest,
    reviewRequest,
    isAdding, 
    isUpdating, 
    isSubmittingRequest,
    isReviewing,
    refresh: fetchFacilities,
    refreshRequests: fetchRequests
  };
}
