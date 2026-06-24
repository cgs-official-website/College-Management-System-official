import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useLibrary(collegeId) {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'library'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      bookData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setBooks(bookData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching library books:", error);
      toast.error("Failed to load library inventory");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addBook = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'library'), {
        ...data,
        collegeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Book added to inventory!");
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
      await updateDoc(doc(db, 'library', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Book details updated!");
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
      await deleteDoc(doc(db, 'library', id));
      toast.success("Book removed from inventory.");
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error("Failed to remove book.");
      throw error;
    }
  };

  return { books, isLoading, isAdding, isUpdating, addBook, updateBook, deleteBook };
}
