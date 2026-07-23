import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageManagement } from '../hooks/usePageManagement';
import { toast } from 'sonner';

export const useShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deletePage, createPage } = usePageManagement();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+N: New Page (Note: Browsers may block overriding this)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyN') {
        e.preventDefault();
        try {
          const page = await createPage({ title: 'Untitled Page', type: 'page' });
          navigate(`/app/page/${page.id}`);
        } catch (err) {
          // ignore
        }
      }
      
      // Ctrl+Shift+N: New Whiteboard (Note: Browsers may block overriding this)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyN') {
        e.preventDefault();
        try {
          const page = await createPage({ title: 'Untitled Whiteboard', type: 'whiteboard' });
          navigate(`/app/whiteboard/${page.id}`);
        } catch (err) {
          // ignore
        }
      }
      
      // Ctrl+E: Edit Title
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyE') {
        e.preventDefault();
        const titleInput = document.querySelector('textarea[placeholder="Untitled"], textarea[placeholder="Untitled Whiteboard"]') as HTMLTextAreaElement;
        if (titleInput) {
          titleInput.focus();
        }
      }

      // Ctrl+S: Save (auto-save)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        toast.success('Auto-saved successfully');
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location, deletePage, createPage]);
};
