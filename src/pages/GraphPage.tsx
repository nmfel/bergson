import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { useDatabase } from '../hooks/useDatabase';
import { buildGraphData } from '../utils/graphParser';
import type { GraphData, GraphNode } from '../utils/graphParser';


export const GraphPage: React.FC = () => {
  const { pageRepository, blockRepository } = useDatabase();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const navigate = useNavigate();
  const fgRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const pages = await pageRepository.getAllPages();
        const blocks = await blockRepository.getAllBlocks();
        const data = buildGraphData(pages, blocks);
        setGraphData(data);
      } catch (err) {
        console.error('Failed to build graph data:', err);
      }
    };
    loadData();
  }, [pageRepository, blockRepository]);

  useEffect(() => {
    const handleResize = () => {
      // Offset by sidebar width if needed. Assuming full width for now.
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    navigate(`/app/${node.type === 'whiteboard' ? 'whiteboard' : 'page'}/${node.id}`);
  }, [navigate]);

  return (
    <div className="w-full h-full flex flex-col bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-text-primary drop-shadow-md">Graph View</h1>
        <p className="text-sm text-text-muted mt-1 drop-shadow-md">
          {graphData.nodes.length} nodes, {graphData.links.length} connections
        </p>
      </div>
      
      <div className="flex-1 w-full h-full cursor-move">
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={(node: any) => {
            return node.type === 'whiteboard' ? '#f59e0b' : '#4d6bfe';
          }}
          nodeRelSize={6}
          linkColor={() => document.documentElement.classList.contains('dark') ? '#555555' : '#cccccc'}
          linkWidth={1.5}
          backgroundColor="rgba(0,0,0,0)"
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Inter, Sans-Serif`;
            
            // Draw Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val * 3 + 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.type === 'whiteboard' ? '#f59e0b' : '#4d6bfe';
            ctx.fill();

            // Draw Text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#e8e8e8' : '#1a1a1a';
            ctx.fillText(label, node.x, node.y + (node.val * 3 + 6) + fontSize);
          }}
          cooldownTicks={100}
        />
      </div>
    </div>
  );
};
