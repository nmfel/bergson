export interface Page {
  id?: string;
  title: string;
  parentId: string | null;
  type: 'page' | 'whiteboard';
  icon?: string;
  status?: 'draft' | 'in-progress' | 'important' | 'completed';
  isDeleted?: boolean;
  deletedAt?: Date | null;
  coverImage?: string;
  content: string; // JSON string for blocks if needed
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  tags?: string[];
}

export type BlockType = 'text' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'code' | 'image' | 'divider' | 'link' | 'page-link' | 'table' | 'kanban' | 'columns';

export interface Block {
  id?: string;
  pageId: string;
  type: BlockType;
  content: string;
  order: number;
}

export interface Image {
  id?: string;
  hash: string;
  data: string;
  size: number;
  width: number;
  height: number;
  createdAt: Date;
}

export interface Wikipedia {
  id?: string;
  title: string;
  snippet: string;
  thumbnail: string | null;
  url: string;
  insertedAt: Date;
}

export interface Preference {
  id?: string;
  key: string;
  value: string; // JSON string
}
