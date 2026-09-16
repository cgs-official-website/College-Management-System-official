import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParentProfile } from '../hooks/useParentPortal';

const ParentChildContext = createContext(null);

export const ParentChildProvider = ({ children }) => {
  const { data: profileData, isLoading, refetch: refetchProfile } = useParentProfile();
  const linkedStudents = profileData?.linkedStudents || [];
  
  const [activeChildId, setActiveChildId] = useState(null);

  useEffect(() => {
    if (linkedStudents.length > 0) {
      if (!activeChildId || !linkedStudents.some(s => s.id === activeChildId)) {
        setActiveChildId(linkedStudents[0].id);
      }
    }
  }, [linkedStudents, activeChildId]);

  const activeChild = linkedStudents.find(s => s.id === activeChildId) || linkedStudents[0] || null;

  return (
    <ParentChildContext.Provider
      value={{
        activeChildId: activeChild?.id || null,
        setActiveChildId,
        activeChild,
        linkedStudents,
        isLoading,
        refetchProfile
      }}
    >
      {children}
    </ParentChildContext.Provider>
  );
};

export const useParentChild = () => {
  const context = useContext(ParentChildContext);
  if (!context) {
    throw new Error('useParentChild must be used within a ParentChildProvider');
  }
  return context;
};

export default ParentChildContext;
