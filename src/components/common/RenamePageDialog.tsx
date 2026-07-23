import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RenamePageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newTitle: string) => Promise<void>;
  currentTitle: string;
}

export const RenamePageDialog: React.FC<RenamePageDialogProps> = ({ 
  isOpen, 
  onClose, 
  onRename,
  currentTitle
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      // Auto-select text after a tiny delay for dialog to mount
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, currentTitle]);

  const handleSubmit = async () => {
    if (title.trim() && title.trim() !== currentTitle) {
      setIsSaving(true);
      try {
        await onRename(title.trim());
        onClose();
      } finally {
        setIsSaving(false);
      }
    } else {
      onClose(); // Just close if unchanged or empty
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="bg-surface border-border text-text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background border-border text-text-primary focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            disabled={isSaving}
          />
        </div>
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isSaving}
            className="text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving || !title.trim()} 
            className="btn-primary border-none disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
