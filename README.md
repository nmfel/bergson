# Bergson

**Bergson** is a privacy-focused, local-first digital workspace. It combines a block-based text editor, mini-database tables, and an infinite whiteboard canvas. All data stays entirely in your browser.

![Bergson Preview](src/assets/bergson-preview-placeholder.png)

---

## Features

### Block-Based Editor (Pages)
- Notion-style blocks: Text, Headings (H1-H3), Lists (Bullet/Numbered/Todo), Quotes, Code Blocks, Dividers.
- Nested pages & whiteboards with drag-and-drop hierarchy.
- Drag & drop block reordering.
- Rich text formatting: Bold, Italic, Strikethrough, inline Code.
- Slash commands (`/`) for quick block insertion.
- Bi-directional linking (`[[`) with automatic backlink tracking.
- Kanban boards with drag-and-drop columns.
- Drag & drop images with built-in cropping.
- Internal page link cards via `/link`.
- Export to PDF.

### Mini-Database Tables
- 3x3 default matrix with middle column/row insertion.
- Typed columns: Text, Number, Date, Checkbox, Tag.
- Auto-calculated footer (sum/count).
- Column sorting & drag-to-resize.

### Calendar, Journaling & Organization
- Visual calendar tracking page creation dates.
- Deadline tags (`#deadline-YYYY-MM-DD`) shown on calendar.
- Emoji icons, status trackers, and custom #tags per page.
- Quick Journal: one-click to create today's journal entry from the dashboard.

### Infinite Whiteboard
- Infinite pan & zoom canvas.
- Drawing tools: Pencil, Eraser, Rectangle, Circle, Line, Diamond, Arrow.
- Sticky notes & text blocks.
- Smart arrows that snap and follow connected objects.
- Auto-generated bookmark cards from URLs (via Microlink).
- Internal page links on the canvas for visual mind-mapping.
- PDF import with per-page or document viewer modes.
- Export as PNG or PDF.

### Dashboard
- Knowledge base filters (Pages / Whiteboards / All).
- Search across all documents with `Ctrl+K` / `Cmd+K`.
- Quick stats showing page and whiteboard counts.
- Quick Journal shortcut to capture daily notes.

### Customization & Theming
- Light, Dark, and System Default themes.
- 5 accent color options.
- Font choices: Sans-serif, Serif, Monospace.
- Centered or full-width editor layout.

### Performance
- Code-split routing with `React.lazy` for pages and the whiteboard editor.
- Storage cleanup uses key-only queries to avoid loading large binary data into RAM.
- LRU blob cache with automatic `URL.revokeObjectURL` cleanup.
- Debounced auto-save for both the editor and whiteboard canvas.

### Data & Privacy
- 100% offline, local-first. Data stored in IndexedDB via Dexie.js.
- Optional Google Drive auto-backup (silent token refresh, `appDataFolder` scope).
- Manual export/import as a single `.json` file.
- Storage metrics & one-click orphaned media cleanup.

> For self-hosting with Google Drive sync, create your own OAuth 2.0 Client ID in [Google Cloud Console](https://console.cloud.google.com/) (enable Google Drive API, scope `https://www.googleapis.com/auth/drive.appdata`) and update `CLIENT_ID` in `src/services/googleDriveSync.ts`.

---

## Tech Stack

- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS + Radix UI
- **Database:** IndexedDB (Dexie.js)
- **Canvas:** Fabric.js
- **State:** Zustand

---

## Quick Start

```bash
git clone https://github.com/nmfel/bergson.git
cd bergson
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

The output is in `dist/`. Deploy to any static host (Vercel, Netlify, GitHub Pages, etc.).

A `vercel.json` is included for React Router SPA rewrites.

---
