import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useCourses(collegeId) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'courses'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setCourses(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addCourse = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'courses'), {
        ...data,
        collegeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Course created successfully!");
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateCourse = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      const batch = writeBatch(db);
      const courseRef = doc(db, 'courses', id);
      batch.update(courseRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      if (data.name) {
        const tQuery = query(collection(db, 'timetable'), where('courseId', '==', id));
        const tSnap = await getDocs(tQuery);
        tSnap.forEach(tDoc => {
          batch.update(tDoc.ref, { courseName: data.name });
        });
      }

      await batch.commit();
      toast.success("Course updated successfully!");
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error("Failed to update course.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCourse = async (id) => {
    try {
      const batch = writeBatch(db);
      const courseRef = doc(db, 'courses', id);
      batch.delete(courseRef);

      const tQuery = query(collection(db, 'timetable'), where('courseId', '==', id));
      const tSnap = await getDocs(tQuery);
      tSnap.forEach(tDoc => {
        batch.delete(tDoc.ref);
      });

      await batch.commit();
      toast.success("Course deleted.");
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course.");
      throw error;
    }
  };

  return { courses, isLoading, isAdding, isUpdating, addCourse, updateCourse, deleteCourse };
}
