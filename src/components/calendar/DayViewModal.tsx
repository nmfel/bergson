import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, LayoutDashboard, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import type { Page } from '../../types';

interface DayViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  createdPages: Page[];
  deadlines: { id: string; title: string; type: string }[];
  onCreate: (type: 'page' | 'whiteboard') => void;
  onNavigate: (id: string) => void;
}

export const DayViewModal: React.FC<DayViewModalProps> = ({ 
  isOpen, 
  onClose, 
  dateStr,
  createdPages,
  deadlines,
  onCreate,
  onNavigate
}) => {
  // Format the date string nicely (e.g. 21 July 2026)
  // Ensure dateStr is treated as local time
  const [y, m, d] = dateStr ? dateStr.split('-').map(Number) : [2000, 1, 1];
  const displayDate = dateStr ? new Date(y, m - 1, d).toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-surface border-border text-text-primary sm:max-w-[500px] max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="w-5 h-5 text-accent" />
            {displayDate}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Deadlines Section */}
          {deadlines.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                Deadlines
              </h3>
              <div className="flex flex-col gap-2">
                {deadlines.map(doc => (
                  <div 
                    key={`dl-${doc.id}`}
                    onClick={() => { onNavigate(doc.id); onClose(); }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-colors"
                  >
                    {doc.type === 'whiteboard' ? (
                      <LayoutDashboard className="w-4 h-4 text-red-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-medium text-text-primary">{doc.title || 'Untitled'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Created Documents Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-400" />
              Created on this day
            </h3>
            
            {createdPages.length > 0 ? (
              <div className="flex flex-col gap-2">
                {createdPages.map(doc => (
                  <div 
                    key={`cr-${doc.id}`}
                    onClick={() => { onNavigate(doc.id!); onClose(); }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background hover:border-accent/50 cursor-pointer transition-all group"
                  >
                    {doc.type === 'whiteboard' ? (
                      <LayoutDashboard className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                    ) : (
                      <FileText className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                    )}
                    <span className="font-medium text-text-primary">{doc.title || 'Untitled'}</span>
                    <span className="ml-auto text-xs text-text-muted">
                      {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-text-muted italic py-2">
                No documents were created on this day.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border/50 bg-background/50 flex items-center justify-end gap-3 shrink-0">
          <Button 
            variant="outline" 
            className="border-border text-text-primary hover:bg-surface-hover hover:text-text-primary h-9"
            onClick={() => { onCreate('page'); onClose(); }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Add Page
          </Button>
          <Button 
            className="btn-primary h-9"
            onClick={() => { onCreate('whiteboard'); onClose(); }}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Add Whiteboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
