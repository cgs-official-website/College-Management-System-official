import { useState, useEffect } from 'react';


import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export function useTimetable(collegeId) {
  const { userData } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

// TODO: Migrate to REST API ->     const q = query(
// TODO: Migrate to REST API ->       collection(db, 'timetable'), 
// TODO: Migrate to REST API ->       where('collegeId', '==', collegeId)
    );

// TODO: Migrate to REST API ->     const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      scheduleData.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      setSchedules(scheduleData);
      setIsLoading(false);
    }, (error) => {
    const fetchTimetable = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/mock/timetables');
        setTimetable(response.data || []);
      } catch (error) {
        console.error("Error fetching timetable:", error);
        toast.error("Failed to load timetable");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimetable();
  }, [collegeId, role, uid]);

  const addSlot = async (data) => {
    try {
      await api.post('/timetable/schedule', data);
      toast.success("Slot scheduled successfully!");
    } catch (error) {
      if (error.message.includes('422')) {
        toast.error("Double booking detected for room or teacher");
      } else {
        toast.error("Failed to schedule slot");
      }
      throw error;
    }
  };

  const updateSlot = async ({ id, data }) => {
    try {
      // Mocking update for now
      await new Promise(r => setTimeout(r, 500));
      toast.success("Slot updated successfully!");
    } catch (error) {
      toast.error("Failed to update slot");
      throw error;
    }
  };

  const deleteSlot = async (id) => {
    try {
      // Mocking delete for now
      await new Promise(r => setTimeout(r, 500));
      toast.success("Slot deleted.");
    } catch (error) {
      toast.error("Failed to delete slot");
      throw error;
    }
  };

  return { timetable, isLoading, addSlot, updateSlot, deleteSlot };
}
