import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; type: 'page' | 'whiteboard' }) => void;
  defaultType?: 'page' | 'whiteboard';
}

export const CreatePageModal: React.FC<CreatePageModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreate,
  defaultType = 'page'
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'page' | 'whiteboard'>(defaultType);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setType(defaultType);
    }
  }, [isOpen, defaultType]);

  const handleSubmit = () => {
    if (title.trim()) {
      onCreate({ title: title.trim(), type });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-surface border-border text-text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New {type === 'page' ? 'Page' : 'Whiteboard'}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title..."
            className="bg-background border-border text-text-primary placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/20"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-text-secondary hover:bg-surface-hover hover:text-text-primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} className="btn-primary border-none disabled:opacity-50">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
