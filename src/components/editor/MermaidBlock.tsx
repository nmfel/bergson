import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Workflow, Code, Eye, Download, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import type { Block as BlockType } from '../../types';
import { toast } from 'sonner';

interface MermaidBlockProps {
  block: BlockType;
  onUpdate: (id: string, content: string, type?: BlockType['type']) => void;
  onFocus: (id: string) => void;
  contentEditableRef: React.RefObject<HTMLDivElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

const PRESETS = [
  {
    name: 'Flowchart',
    code: `graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]`
  },
  {
    name: 'Mindmap',
    code: `mindmap
  root((Bergson Workspace))
    Documents
      Notes
      Diagrams
    Whiteboards
      Flowcharts
      Mindmaps`
  },
  {
    name: 'Sequence',
    code: `sequenceDiagram
    actor User
    participant System
    User->>System: Send Request
    System-->>User: Return Data`
  },
  {
    name: 'Architecture',
    code: `graph LR
    Client[Web Client] --> API[Backend API]
    API --> DB[(Database)]`
  }
];

export const MermaidBlock: React.FC<MermaidBlockProps> = ({
  block,
  onUpdate,
  onFocus,
  contentEditableRef,
  handleKeyDown
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [code, setCode] = useState<string>(
    block.content || PRESETS[0].code
  );
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [svgContent, setSvgContent] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef<string>(`mermaid_${block.id || Math.random().toString(36).substring(2, 9)}`);

  // Initialize & Re-render Mermaid SVG
  useEffect(() => {
    let isMounted = true;
    setErrorMsg(null);

    const renderDiagram = async () => {
      if (!code.trim()) {
        setSvgContent('');
        return;
      }

      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif'
        });

        const renderId = `${uniqueId.current}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, code);
        if (isMounted) {
          setSvgContent(svg);
          setErrorMsg(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Mermaid render error:', err);
          setErrorMsg(err?.str || err?.message || 'Invalid diagram syntax');
        }
      }
    };

    renderDiagram();


    return () => {
      isMounted = false;
    };
  }, [code, isDarkMode]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onUpdate(block.id!, newCode);
  };

  const handleCopySvg = () => {
    if (!svgContent) return;
    navigator.clipboard.writeText(svgContent);
    setIsCopied(true);
    toast.success('Diagram SVG copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram_${block.id || 'bergson'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded SVG diagram file');
  };

  return (
    <div className="w-full my-3 bg-surface border border-border rounded-xl shadow-sm overflow-hidden text-text-primary transition-all duration-150">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-hover/60 border-b border-border/80 text-xs">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-primary/10 text-primary">
            <Workflow className="w-4 h-4" />
          </div>
          <span className="font-semibold text-text-primary">Mermaid Diagram</span>

          {/* Preset Buttons */}
          <div className="hidden sm:flex items-center space-x-1 ml-2 border-l border-border/60 pl-2">
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleCodeChange(preset.code)}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface hover:bg-border/60 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
                title={`Load ${preset.name} template`}
              >
                <Sparkles className="w-3 h-3 text-primary/80" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Tab Switcher */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>

          {/* Export Buttons */}
          <button
            type="button"
            onClick={handleCopySvg}
            disabled={!svgContent}
            className="p-1.5 rounded hover:bg-border/60 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Copy SVG to Clipboard"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={!svgContent}
            className="p-1.5 rounded hover:bg-border/60 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Download SVG File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'code' ? (
        <div className="p-3 bg-surface font-mono text-xs">
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Type Mermaid diagram syntax here..."
            className="w-full h-40 bg-surface-hover/50 border border-border/80 rounded-lg p-3 text-text-primary font-mono focus:outline-none focus:border-primary resize-y leading-relaxed"
          />
          <p className="text-[10px] text-text-muted mt-2">
            Supports Flowchart (`graph TD`), Mindmap (`mindmap`), Sequence Diagram (`sequenceDiagram`), State Diagram, etc.
          </p>
        </div>
      ) : (
        <div className="p-4 flex flex-col items-center justify-center min-h-[160px] bg-surface relative overflow-auto">
          {errorMsg ? (
            <div className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-xs w-full max-w-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Mermaid Syntax Error</p>
                <p className="mt-1 font-mono text-[11px] opacity-90">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className="mt-2 text-[11px] underline font-medium text-red-600 hover:text-red-700"
                >
                  Edit Code to Fix
                </button>
              </div>
            </div>
          ) : (
            <div 
              ref={containerRef}
              className="w-full flex items-center justify-center overflow-x-auto py-2 [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:object-contain"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      )}

      <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
    </div>
  );
};
