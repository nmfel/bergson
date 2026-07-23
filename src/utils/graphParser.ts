import type { Page, Block } from '../types';

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export function buildGraphData(pages: Page[], blocks: Block[]): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphEdge[] = [];
  
  const titleToIdMap = new Map<string, string>();
  const idToPageMap = new Map<string, Page>();
  
  pages.forEach(page => {
    if ((page.type === 'page' || page.type === 'whiteboard') && !page.isDeleted) {
      nodes.push({
        id: page.id!,
        name: page.title || 'Untitled',
        val: 1, // Base size
        type: page.type
      });
      titleToIdMap.set((page.title || '').toLowerCase().trim(), page.id!);
      idToPageMap.set(page.id!, page);
    }
  });

  const seenLinks = new Set<string>();

  blocks.forEach(block => {
    if (!idToPageMap.has(block.pageId)) return;

    if (block.type === 'page-link') {
      try {
        const metadata = JSON.parse(block.content);
        if (metadata && metadata.pageId && idToPageMap.has(metadata.pageId)) {
          const linkId = `${block.pageId}->${metadata.pageId}`;
          if (!seenLinks.has(linkId)) {
            links.push({ source: block.pageId, target: metadata.pageId });
            seenLinks.add(linkId);
            
            const targetNode = nodes.find(n => n.id === metadata.pageId);
            if (targetNode) targetNode.val += 0.5;
          }
        }
      } catch (e) {
        // Ignore parse error
      }
    } else if (typeof block.content === 'string') {
      // Inline [[Title]] mentions
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(block.content)) !== null) {
        const title = match[1].trim();
        const targetId = titleToIdMap.get(title.toLowerCase());
        
        if (targetId && idToPageMap.has(targetId)) {
          const linkId = `${block.pageId}->${targetId}`;
          if (!seenLinks.has(linkId)) {
            links.push({ source: block.pageId, target: targetId });
            seenLinks.add(linkId);
            
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode) targetNode.val += 0.5;
          }
        }
      }
    }
  });

  // Extract links from whiteboards
  pages.forEach(page => {
    if (page.type === 'whiteboard' && page.content && typeof page.content === 'string') {
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(page.content)) !== null) {
        const title = match[1].trim();
        const targetId = titleToIdMap.get(title.toLowerCase());
        
        if (targetId && idToPageMap.has(targetId)) {
          const linkId = `${page.id}->${targetId}`;
          if (!seenLinks.has(linkId)) {
            links.push({ source: page.id!, target: targetId });
            seenLinks.add(linkId);
            
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode) targetNode.val += 0.5;
          }
        }
      }
    }
  });

  return { nodes, links };
}
