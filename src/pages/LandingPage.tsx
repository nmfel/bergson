import React from 'react';
import { ArrowRight, Database, LayoutTemplate, PenTool, Terminal, Copy, Check, Leaf } from 'lucide-react';
import previewImage from '@/assets/bergson-preview-placeholder.png';
import logo from '@/assets/logo.png';

export const LandingPage: React.FC = () => {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('git clone https://github.com/nmfel/bergson.git');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="dark h-[100dvh] overflow-y-auto overflow-x-hidden bg-background text-text-primary flex flex-col font-sans selection:bg-accent/35 selection:text-accent relative">
      
      {/* Subtle organic texture or calming background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent pointer-events-none" />

      {/* Navbar */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Bergson Logo" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-serif font-bold text-lg tracking-tight text-text-primary">Bergson</span>
        </div>
        <a 
          href="https://github.com/nmfel/bergson" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-surface/50 border border-border/40 text-text-primary hover:bg-surface-hover text-xs font-medium h-9 px-4 rounded-xl transition-all shadow-sm"
        >
          GitHub
        </a>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-start pt-16 pb-28 px-6 relative max-w-6xl mx-auto w-full">
        <div className="max-w-3xl w-full text-center space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/40 border border-border/40 text-[11px] font-mono text-text-secondary">
            <Leaf className="w-3.5 h-3.5 text-accent animate-pulse" />
            A local-first environment for your mind
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-text-primary leading-[1.15] font-serif">
            A quiet space for your <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
              notes, thoughts & sketches.
            </span>
          </h1>

          <p className="text-sm md:text-base text-text-muted max-w-xl mx-auto leading-relaxed">
            Bergson combines intuitive structured writing with a freeform infinite canvas. Built to run entirely in your browser, keeping your thoughts private and close to you.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
            <a 
              href="#setup"
              className="inline-flex items-center justify-center bg-accent text-white hover:bg-accent/90 text-sm font-medium h-12 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            >
              Self-Host Bergson
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
            <a 
              href="https://github.com/nmfel/bergson" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center bg-surface/50 border border-border/40 text-text-primary hover:bg-surface-hover text-sm font-medium h-12 px-6 rounded-2xl transition-all w-full sm:w-auto"
            >
              Source Code
            </a>
          </div>

          <div className="flex justify-center pt-2">
            <div 
              onClick={handleCopy}
              className="flex items-center gap-3 px-4 py-2 bg-[#0c0c0c] border border-border/30 rounded-xl shadow-inner hover:border-accent/40 transition-colors group cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <code className="text-xs font-mono text-text-secondary select-all truncate">git clone https://github.com/nmfel/bergson.git</code>
              <div className="pl-3 border-l border-border/30 flex items-center justify-center w-6 shrink-0">
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-green-500 animate-in zoom-in" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 relative z-10">
          <div className="bg-surface/30 backdrop-blur-md border border-border/30 rounded-[20px] p-6 hover:bg-surface/50 transition-all duration-300">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <LayoutTemplate className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base font-bold mb-2 font-serif">Intuitive Block Editor</h3>
            <p className="text-text-muted text-xs leading-relaxed">Write smoothly with structured blocks, keyboard shortcuts, and simple slash commands.</p>
          </div>
          <div className="bg-surface/30 backdrop-blur-md border border-border/30 rounded-[20px] p-6 hover:bg-surface/50 transition-all duration-300">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
              <Database className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-base font-bold mb-2 font-serif">Inline Mini-Databases</h3>
            <p className="text-text-muted text-xs leading-relaxed">Organize tasks, metrics, or logs inside your notes with columns of specific data types.</p>
          </div>
          <div className="bg-surface/30 backdrop-blur-md border border-border/30 rounded-[20px] p-6 hover:bg-surface/50 transition-all duration-300">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
              <PenTool className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-base font-bold mb-2 font-serif">Infinite Whiteboards</h3>
            <p className="text-text-muted text-xs leading-relaxed">Map out concept structures visually with drawing tools, cards, sticky notes, and lines.</p>
          </div>
        </div>

        {/* Product Showcase Image */}
        <div className="w-full mt-20 relative z-10 animate-in fade-in zoom-in-95 duration-1000">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20 pointer-events-none" />
          <div className="relative rounded-[24px] overflow-hidden border border-border/30 shadow-2xl shadow-black/40 bg-surface/10">
            <img 
              src={previewImage} 
              alt="Bergson Workspace" 
              className="relative w-full h-auto block object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
            />
          </div>
        </div>

        {/* Self-Host Instructions Section */}
        <div id="setup" className="w-full max-w-2xl mt-24 border-t border-border/30 pt-16 space-y-6 text-left">
          <h2 className="text-xl font-bold font-serif text-text-primary">Deploy Your Own Instance</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Bergson is built with privacy in mind. Because your data lives entirely in your browser's local memory (via IndexedDB), you can host this app on any static provider without needing a database.
          </p>
          <div className="space-y-6 pt-2">
            <div className="flex gap-4 items-start">
              <div className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">1</div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Clone & Install</h4>
                <p className="text-xs text-text-muted mt-1">Get a copy of the source code and install its dependencies locally.</p>
                <div className="mt-2 bg-[#0c0c0c] border border-border/20 rounded-lg p-2.5 font-mono text-xs text-text-secondary select-all">
                  git clone https://github.com/nmfel/bergson.git<br/>
                  cd bergson<br/>
                  npm install
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">2</div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Run Locally</h4>
                <p className="text-xs text-text-muted mt-1">Run the fast development server with hot-reloading.</p>
                <div className="mt-2 bg-[#0c0c0c] border border-border/20 rounded-lg p-2.5 font-mono text-xs text-text-secondary">
                  npm run dev
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">3</div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Build & Deploy</h4>
                <p className="text-xs text-text-muted mt-1">Build production assets and host on Vercel, Netlify, GitHub Pages, or any web server.</p>
                <div className="mt-2 bg-[#0c0c0c] border border-border/20 rounded-lg p-2.5 font-mono text-xs text-text-secondary">
                  npm run build
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Simply point your hosting provider's build settings to directory <code className="bg-[#0c0c0c] px-1 rounded text-accent font-mono">dist</code> and build command <code className="bg-[#0c0c0c] px-1 rounded text-accent font-mono">npm run build</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Legal */}
      <footer className="w-full py-6 px-6 border-t border-border/30 bg-surface/20 backdrop-blur-sm shrink-0 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Bergson Logo" className="w-5 h-5 rounded-md object-cover" />
            <span className="font-bold text-sm tracking-tight text-text-primary">Bergson</span>
            <span className="text-[11px] text-text-muted hidden md:inline-block border-l border-border/30 pl-2 ml-1">
              A private digital workspace.
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-text-muted/50">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
