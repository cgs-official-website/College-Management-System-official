import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useAdmissions(collegeId) {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!collegeId) return;

    const fetchAdmissions = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/mock/students'); // Mocking with students for now
        setApplications(response.data || []);
      } catch (error) {
        console.error("Error fetching admissions:", error);
        toast.error("Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdmissions();
  }, [collegeId]);

  const addApplication = async (data) => {
    try {
      await api.post('/admin/admissions/apply', data);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit application");
      throw error;
    }
  };

  const updateStatus = async (id, status) => {
    try {
      if (status === 'seat_allotted') {
        await api.post('/admin/admissions/allot', { admissionId: id });
      } else {
        // Mock standard update
        await new Promise(r => setTimeout(r, 500));
      }
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
    } catch (error) {
      toast.error("Failed to update status");
      throw error;
    }
  };

  const deleteAdmission = async (id) => {
    try {
      await api.delete(`/admin/admissions/${id}`);
      toast.success("Application record removed.");
    } catch (error) {
      console.error("Error deleting admission:", error);
      toast.error("Failed to remove record.");
      throw error;
    }
  };

  return { admissions, isLoading, isAdding, isUpdating, addAdmission, updateAdmission, deleteAdmission };
}
