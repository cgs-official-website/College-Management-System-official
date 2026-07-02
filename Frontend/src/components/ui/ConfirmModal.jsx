import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false, isLoading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center py-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400' : 'bg-primary-50 text-primary-500 dark:bg-primary-500/10 dark:text-primary-400'}`}>
          {isDestructive ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex w-full gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1 justify-center" disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm} 
            className={`flex-1 justify-center ${isDestructive ? 'bg-red-600 hover:bg-red-700' : ''}`}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
