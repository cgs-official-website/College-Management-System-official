import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useLibrary(collegeId) {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBooks = async () => {
    if (!collegeId) return;
    setIsLoading(true);
    try {
      const response = await api.get('/library');
      setBooks(response.data || []);
    } catch (error) {
      console.error("Error fetching library books:", error);
      toast.error("Failed to load library inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [collegeId]);

  const addBook = async (data) => {
    setIsAdding(true);
    try {
      await api.post('/library', data);
      toast.success("Book added to inventory!");
      await fetchBooks();
    } catch (error) {
      console.error("Error adding book:", error);
      toast.error("Failed to add book.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateBook = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await api.put(`/library/${id}`, data);
      toast.success("Book details updated!");
      await fetchBooks();
    } catch (error) {
      console.error("Error updating book:", error);
      toast.error("Failed to update book.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteBook = async (id) => {
    try {
      await api.delete(`/library/${id}`);
      await fetchBooks();
      toast.success("Book removed from inventory.");
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error("Failed to remove book.");
      throw error;
    }
  };

  return { books, isLoading, isAdding, isUpdating, addBook, updateBook, deleteBook };
}
