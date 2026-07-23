import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Hash } from 'lucide-react';
import { cn } from '../../utils';

interface TagsInputProps {
  tags: string[];
  onChange: (newTags: string[]) => void;
  className?: string;
  isDarkMode?: boolean;
}

const getTagColor = (tag: string, isDark: boolean) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  
  if (isDark) {
    return {
      bg: `hsl(${hue}, 40%, 20%)`,
      text: `hsl(${hue}, 70%, 80%)`,
      border: `hsl(${hue}, 40%, 30%)`
    };
  }
  return {
    bg: `hsl(${hue}, 70%, 95%)`,
    text: `hsl(${hue}, 80%, 30%)`,
    border: `hsl(${hue}, 70%, 85%)`
  };
};

export const TagsInput: React.FC<TagsInputProps> = ({ tags = [], onChange, className, isDarkMode = false }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddTag = () => {
    const newTag = inputValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (newTag && !tags.includes(newTag)) {
      onChange([...tags, newTag]);
    }
    setInputValue('');
    setIsAdding(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setIsAdding(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {tags.map(tag => {
        const colors = getTagColor(tag, isDarkMode);
        return (
          <span 
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.border
            }}
          >
            <Hash className="w-3 h-3 opacity-60" />
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:opacity-100 opacity-60 transition-opacity ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      {isAdding ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddTag}
          className="text-xs px-2 py-1 rounded-md border border-border bg-surface text-text-primary focus:outline-none focus:border-accent w-24 h-6"
          placeholder="New tag..."
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border border-dashed border-border text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add tag
        </button>
      )}
    </div>
  );
};
