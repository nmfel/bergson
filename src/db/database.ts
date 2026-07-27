import Dexie, { type Table } from 'dexie';
import type { Page, Block, Image, PdfFile, Wikipedia, Preference } from '../types';

export class BergsonDatabase extends Dexie {
  pages!: Table<Page, string>;
  blocks!: Table<Block, string>;
  images!: Table<Image, string>;
  pdfs!: Table<PdfFile, string>;
  wikipedia!: Table<Wikipedia, string>;
  preferences!: Table<Preference, string>;

  constructor() {
    super('BergsonDatabase');
    
    // Version 3: Initial schema
    this.version(3).stores({
      pages: '++id, title, parentId, type, createdAt, updatedAt, isFavorite, isDeleted, status',
      blocks: '++id, pageId, type, content, order',
      images: '++id, hash, data, size, width, height, createdAt',
      wikipedia: '++id, title, snippet, thumbnail, url, insertedAt',
      preferences: '++id, key, value'
    });

    // Version 4: Added tags array index to pages
    this.version(4).stores({
      pages: '++id, title, parentId, type, createdAt, updatedAt, isFavorite, isDeleted, status, *tags'
    });

    // Version 5: Added pdfs table for PDF annotation & viewer
    this.version(5).stores({
      pdfs: '++id, hash, name, size, pageCount, createdAt'
    });
  }
}

export const db = new BergsonDatabase();

export async function seedData() {
  const pageCount = await db.pages.count();
  
  if (pageCount === 0) {
    const pageId = crypto.randomUUID();
    await db.pages.add({
      id: pageId,
      title: 'Welcome to Bergson',
      parentId: null,
      type: 'page',
      content: '[]',
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: true
    });

    await db.blocks.bulkAdd([
      { id: crypto.randomUUID(), pageId, type: 'heading1', content: 'Welcome to Bergson', order: 0 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'Bergson is your private, local-first digital brain. All your data lives securely in your own browser.', order: 1 },
      
      { id: crypto.randomUUID(), pageId, type: 'heading2', content: 'How to Use Bergson', order: 2 },
      
      { id: crypto.randomUUID(), pageId, type: 'heading3', content: 'Writing & Blocks', order: 3 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'Everything in Bergson is a block. You can type normally, and when you want to add something special (like a table, image, or list), just type the slash command: /', order: 4 },
      
      { id: crypto.randomUUID(), pageId, type: 'heading3', content: 'Mini-Database Tables', order: 5 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'Create a table and click on the column headers to change their data types. You can use Checkboxes for habits, Numbers for finances, or Dates for planning. The bottom row will automatically calculate the totals!', order: 6 },
      
      { id: crypto.randomUUID(), pageId, type: 'heading3', content: 'Organization (Tags & Status)', order: 7 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'Look at the top of this page! You can assign an Emoji Icon, a Status (like In Progress or Done), and multiple Tags. You can also drag-and-drop pages in the sidebar to organize them into folders.', order: 8 },
      
      { id: crypto.randomUUID(), pageId, type: 'heading3', content: 'Calendar, Journaling, & Deadlines', order: 9 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'Click on the Calendar icon in the sidebar. Any document you create will show up on the date it was created. This is perfect for daily journals or meeting notes.', order: 10 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'If you want to set a deadline for a document, simply add a tag in the format: #deadline-YYYY-MM-DD (e.g., #deadline-2024-12-31). It will automatically appear as a red deadline marker on that date in your calendar.', order: 11 },
      
      { id: crypto.randomUUID(), pageId, type: 'heading3', content: 'Whiteboards', order: 12 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'Need to draw or map out ideas? Create a Whiteboard instead of a regular Document. You can add sticky notes, shapes, arrows, and freehand drawings.', order: 13 },
      
      { id: crypto.randomUUID(), pageId, type: 'heading3', content: 'Privacy & Backup', order: 14 },
      { id: crypto.randomUUID(), pageId, type: 'text', content: 'Bergson does not store your notes on our servers. However, you can connect your Google Drive in the Settings to automatically sync and backup your data privately.', order: 15 }
    ]);

    const whiteboardId = crypto.randomUUID();
    await db.pages.add({
      id: whiteboardId,
      title: 'Architecture Board',
      parentId: null,
      type: 'whiteboard',
      content: '[]',
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false
    });
  }
}

// Automatically seed data when db is opened
db.on('ready', function () {
  return seedData();
});
