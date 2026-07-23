import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { CheckCircle2, CircleDashed, AlertCircle, PlayCircle, Circle } from 'lucide-react';

export type PageStatus = 'draft' | 'in-progress' | 'important' | 'completed' | undefined;

interface StatusPickerProps {
  status: PageStatus;
  onSelect: (status: PageStatus) => void;
  className?: string;
}

const statusOptions = [
  { value: undefined, label: 'No Status', icon: Circle, color: 'text-text-muted', bgColor: 'bg-transparent' },
  { value: 'draft', label: 'Draft', icon: CircleDashed, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  { value: 'in-progress', label: 'In Progress', icon: PlayCircle, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { value: 'important', label: 'Important', icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
] as const;

export const StatusPicker: React.FC<StatusPickerProps> = ({ status, onSelect, className = '' }) => {
  const currentStatus = statusOptions.find(opt => opt.value === status) || statusOptions[0];
  const Icon = currentStatus.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors text-sm font-medium ${currentStatus.bgColor} ${currentStatus.color} hover:brightness-125 focus:outline-none ${className}`}
        >
          <Icon className="w-4 h-4" />
          {currentStatus.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-surface border-border">
        {statusOptions.map((opt) => {
          const OptionIcon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.value || 'none'}
              className="cursor-pointer hover:bg-surface-hover focus:bg-surface-hover flex items-center gap-3 py-2"
              onClick={() => onSelect(opt.value)}
            >
              <div className={`p-1 rounded ${opt.bgColor}`}>
                <OptionIcon className={`w-4 h-4 ${opt.color}`} />
              </div>
              <span className="text-text-primary">{opt.label}</span>
              {status === opt.value && <CheckCircle2 className="w-4 h-4 ml-auto text-accent" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
