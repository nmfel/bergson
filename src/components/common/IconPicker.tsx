import React, { useState } from 'react';
import Picker, { Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface IconPickerProps {
  icon?: string;
  defaultIcon: React.ReactNode;
  onSelect: (icon: string) => void;
  className?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({ icon, defaultIcon, onSelect, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`flex items-center justify-center rounded-md hover:bg-surface-hover transition-colors focus:outline-none ${className}`}
          onClick={() => setIsOpen(true)}
        >
          {icon ? <span className="text-4xl leading-none">{icon}</span> : defaultIcon}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 border-none bg-transparent shadow-none" sideOffset={8}>
        <div className="rounded-lg overflow-hidden shadow-xl border border-border">
          <Picker 
            theme={Theme.DARK} 
            onEmojiClick={(emojiData) => {
              onSelect(emojiData.emoji);
              setIsOpen(false);
            }} 
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
