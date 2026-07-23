import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  title
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="bg-surface border-border text-text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-400">Delete Page</DialogTitle>
          <DialogDescription className="text-text-secondary mt-2">
            Are you sure you want to move "{title}" to Trash?
            You can restore it later from Trash.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isDeleting}
            className="border-border hover:bg-surface-hover text-text-primary"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm} 
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isDeleting ? 'Moving to Trash...' : 'Move to Trash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
