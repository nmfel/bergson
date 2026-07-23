import { useCallback } from 'react';
import type { Block } from '../types';

export const useMarkdownShortcuts = () => {
  const checkShortcut = useCallback((text: string, currentType: Block['type']): { newType: Block['type'], textContent: string } | null => {
    if (currentType !== 'text') return null; // Only apply shortcuts if current block is text

    const match = text.match(/^((#{1,3})|(-)|(1\.)|(\[\])|(\[x\])|(>)|(```)|(---))\s(.*)/);
    
    if (match) {
      const shortcut = match[1];
      const rest = match[10] || '';

      switch (shortcut) {
        case '#': return { newType: 'heading1', textContent: rest };
        case '##': return { newType: 'heading2', textContent: rest };
        case '###': return { newType: 'heading3', textContent: rest };
        case '-': return { newType: 'bullet', textContent: rest };
        case '1.': return { newType: 'numbered', textContent: rest };
        case '[]': return { newType: 'todo', textContent: rest }; // We might need to store checked state in content or a new field, but let's assume empty todo is "[]" and checked is "[x]" in content, or just let 'todo' handle it.
        case '[x]': return { newType: 'todo', textContent: '[x] ' + rest }; // Hacky, better handled in component
        case '>': return { newType: 'quote', textContent: rest };
        case '```': return { newType: 'code', textContent: rest };
        case '---': return { newType: 'divider', textContent: '' };
        default: return null;
      }
    }
    return null;
  }, []);

  return { checkShortcut };
};
