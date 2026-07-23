import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Database, LayoutTemplate, PenTool, Terminal, Copy, Check } from 'lucide-react';
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
    <div className="dark h-[100dvh] overflow-y-auto overflow-x-hidden bg-background text-text-primary flex flex-col font-sans selection:bg-accent/30 selection:text-accent relative">
      
      {/* Navbar */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Bergson Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-accent/20 object-cover" />
          <span className="font-bold text-xl tracking-tight">Bergson</span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-start pt-20 pb-32 px-6 relative">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl w-full text-center space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-medium text-text-secondary mb-4">
            <Shield className="w-3 h-3 text-green-400" /> Local-First & Privacy Focused
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-text-primary leading-[1.1]">
            Your digital brain,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500">
              securely on your device.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Bergson combines the structured power of a block-based text editor with the freeform flexibility of an infinite whiteboard canvas. No servers, no tracking.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="https://github.com/nmfel/bergson" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-text-primary text-background hover:bg-text-primary/90 text-base h-14 px-8 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all w-full sm:w-auto group font-medium">
              View on GitHub
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="flex justify-center mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <div 
              onClick={handleCopy}
              className="flex items-center gap-3 px-4 py-2.5 bg-[#0d0d0d] border border-border/50 rounded-lg shadow-inner hover:border-accent/50 transition-colors group cursor-pointer ring-1 ring-white/5"
            >
              <Terminal className="w-4 h-4 text-text-muted shrink-0" />
              <code className="text-sm font-mono text-text-secondary select-all truncate">git clone https://github.com/nmfel/bergson.git</code>
              <div className="pl-3 border-l border-border/50 flex items-center justify-center w-8 shrink-0">
                {isCopied ? (
                  <Check className="w-4 h-4 text-green-500 animate-in zoom-in" />
                ) : (
                  <Copy className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150">
          <div className="bg-surface border border-border rounded-2xl p-6 hover:bg-surface-hover transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <LayoutTemplate className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Block Editor</h3>
            <p className="text-text-secondary text-sm">Write fluidly with Notion-style blocks, slash commands, and seamless formatting.</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 hover:bg-surface-hover transition-colors">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold mb-2">Mini-Databases</h3>
            <p className="text-text-secondary text-sm">Create smart tables with typed columns, formulas, and visual categorization.</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 hover:bg-surface-hover transition-colors">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
              <PenTool className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Infinite Whiteboards</h3>
            <p className="text-text-secondary text-sm">Map out ideas visually with shapes, sticky notes, and drawing tools.</p>
          </div>
        </div>

        {/* Product Showcase Image */}
        <div className="w-full max-w-6xl mt-24 relative z-10 animate-in fade-in zoom-in-95 duration-1000 delay-300">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20 pointer-events-none" />
          <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden border border-border/50 shadow-2xl shadow-black/50 ring-1 ring-white/10">
            <div className="absolute inset-0 bg-accent/5 backdrop-blur-3xl" />
            <img 
              src={previewImage} 
              alt="Bergson Interface Preview" 
              className="relative w-full h-auto block object-cover opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </main>

      {/* Footer / Legal */}
      <footer className="w-full py-6 px-6 border-t border-border bg-surface shrink-0 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Bergson Logo" className="w-5 h-5 rounded-md object-cover" />
            <span className="font-bold text-sm tracking-tight text-text-primary">Bergson</span>
            <span className="text-xs text-text-muted hidden md:inline-block border-l border-border pl-2 ml-1">
              A privacy-first digital workspace.
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/privacy" className="text-text-secondary hover:text-accent transition-colors">Privacy Policy</Link>
            <span className="text-border">|</span>
            <Link to="/terms" className="text-text-secondary hover:text-accent transition-colors">Terms of Service</Link>
            <span className="text-text-muted/50 ml-2">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
