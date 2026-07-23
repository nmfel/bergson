import type { Page } from '../types';

export const navigateToPage = (id: string, navigate: (path: string) => void) => {
  navigate(`/app/page/${id}`);
};

export const navigateToWhiteboard = (id: string, navigate: (path: string) => void) => {
  navigate(`/app/whiteboard/${id}`);
};

export const getPageUrl = (page: Page): string => {
  if (page.type === 'whiteboard') {
    return `/app/whiteboard/${page.id}`;
  }
  return `/app/page/${page.id}`;
};
