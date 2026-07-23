import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { cn } from '@/utils';
import { useSettingsStore } from '../../store/settingsStore';

interface TagPickerProps {
  tags?: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

export const TagPicker: React.FC<TagPickerProps> = ({ tags = [], onChange, className }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { theme } = useSettingsStore();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleAddTag = () => {
    let newTag = inputValue.trim().toLowerCase();
    if (newTag.startsWith('#')) {
      newTag = newTag.slice(1);
    }
    if (newTag && !tags.includes(newTag)) {
      onChange([...tags, newTag]);
    }
    setInputValue('');
    setIsEditing(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
    }
  };

  return (
    <div className={cn("flex items-center flex-wrap gap-2 px-2", className)}>
      <Tag className="w-4 h-4 text-text-muted shrink-0" />
      
      {tags.map(tag => {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
          hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        
        let style = {};
        if (isDarkMode) {
          style = {
            backgroundColor: `hsl(${hue}, 40%, 20%)`,
            color: `hsl(${hue}, 70%, 80%)`,
            borderColor: `hsl(${hue}, 40%, 30%)`
          };
        } else {
          style = {
            backgroundColor: `hsl(${hue}, 70%, 92%)`,
            color: `hsl(${hue}, 80%, 25%)`,
            borderColor: `hsl(${hue}, 60%, 80%)`
          };
        }

        return (
          <span 
            key={tag}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border group transition-colors"
            style={style}
          >
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100 focus:outline-none"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      {isEditing ? (
        <div className="flex items-center">
          <span className="text-text-muted text-xs mr-1">#</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAddTag}
            placeholder="new tag"
            className="bg-transparent border-b border-accent outline-none text-xs text-text-primary w-20 py-0.5"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover px-2 py-1 rounded-full transition-colors focus:outline-none"
        >
          <Plus className="w-3 h-3" /> Add tag
        </button>
      )}
    </div>
  );
};
