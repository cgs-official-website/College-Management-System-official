import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({});
  const [resolver, setResolver] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setOptions(options);
      setIsOpen(true);
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal 
        isOpen={isOpen} 
        onClose={handleCancel} 
        onConfirm={handleConfirm} 
        title={options.title || "Confirm Action"} 
        message={options.message || "Are you sure you want to proceed?"} 
        isDestructive={options.isDestructive ?? true}
        confirmText={options.confirmText || "Confirm"}
        cancelText={options.cancelText || "Cancel"}
      />
    </ConfirmContext.Provider>
  );
};
