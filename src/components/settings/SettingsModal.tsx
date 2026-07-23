import React, { useState, useRef, useEffect } from 'react';
import { X, Palette, Database, Layout, Download, Upload, Monitor, Moon, Sun, Type, AlertTriangle, Cloud } from 'lucide-react';
import { useSettingsStore, ACCENT_COLORS } from '../../store/settingsStore';
import { useSyncStore } from '../../store/syncStore';
import { googleDriveSync } from '../../services/googleDriveSync';
import { exportDatabase, importDatabase, wipeDatabase } from '../../utils/exportImport';
import { cleanupOrphanedImages } from '../../utils/storageCleanup';
import { cn } from '../../utils';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'appearance' | 'editor' | 'whiteboard' | 'data' | 'sync';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const { 
    accentColor, fullWidth, theme, fontFamily, panOnEmptyClick,
    setAccentColor, setFullWidth, setTheme, setFontFamily, setPanOnEmptyClick
  } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingUI, setIsSyncingUI] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ usage: 0, quota: 1 });
  const [isCleaning, setIsCleaning] = useState(false);

  const { accessToken, isConnected, lastSyncedAt, disconnect } = useSyncStore();

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (activeTab === 'data' && isOpen) {
      const calculatePreciseUsage = async () => {
        try {
          if (navigator.storage && navigator.storage.estimate) {
            const { quota, usage } = await navigator.storage.estimate();
            setStorageUsage({ 
              usage: usage || 0, 
              quota: quota || 1 
            });
          }
        } catch (error) {
          console.error('Failed to calculate storage:', error);
        }
      };
      
      calculatePreciseUsage();
      intervalId = setInterval(calculatePreciseUsage, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, isOpen, isCleaning]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDatabase();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCleanup = async () => {
    if (confirm('Are you sure you want to clean up unused data? This will permanently remove orphaned blocks and images not used in any pages.')) {
      setIsCleaning(true);
      try {
        const result = await cleanupOrphanedImages();
        const mbFreed = (result.freedBytes / 1024 / 1024).toFixed(2);
        toast.success(`Storage Cleaned! Removed ${result.deletedCount} unused images and ${result.deletedBlocksCount} orphaned blocks. Freed ${mbFreed} MB!`);
      } catch (e) {
        console.error(e);
        toast.error('Failed to clean up storage.');
      } finally {
        setIsCleaning(false);
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Warn user before import
    if (!window.confirm('WARNING: Restoring a backup will OVERWRITE your current data. Are you sure you want to proceed?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      await importDatabase(file);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-3xl h-[600px] max-h-[90vh] rounded-xl shadow-2xl flex overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-64 bg-surface border-r border-border flex flex-col p-4">
          <div className="mb-6 px-2">
            <h2 className="text-xl font-semibold text-text-primary">Settings</h2>
          </div>
          
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'appearance' 
                  ? "bg-accent/10 text-accent" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Palette className="w-4 h-4" /> Appearance
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'editor' 
                  ? "bg-accent/10 text-accent" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Layout className="w-4 h-4" /> Editor
            </button>
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'whiteboard' 
                  ? "bg-accent/10 text-accent" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Layout className="w-4 h-4" /> Whiteboard
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'data' 
                  ? "bg-accent/10 text-accent" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Database className="w-4 h-4" /> Data & Storage
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === 'sync' 
                  ? "bg-accent/10 text-accent" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Cloud className="w-4 h-4" /> Cloud Sync
            </button>
          </nav>

          <div className="mt-auto pt-6 px-3 flex flex-col gap-2 text-xs text-text-muted">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline transition-colors w-fit">
              Privacy Policy
            </a>
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline transition-colors w-fit">
              Terms of Service
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-background relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto p-8">
            
            {activeTab === 'appearance' && (
              <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">Appearance</h3>
                  <p className="text-sm text-text-muted mb-6">Customize how Bergson looks on your device.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-text-primary block mb-3">Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setAccentColor(color.value)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                            accentColor === color.value ? "ring-2 ring-offset-2 ring-offset-background ring-text-primary" : ""
                          )}
                          style={{ backgroundColor: `hsl(${color.value})` }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-border">
                    <label className="text-sm font-medium text-text-primary block mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                       <button
                         onClick={() => setTheme('light')}
                         className={cn(
                           "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                           theme === 'light' ? "border-accent bg-accent/5 text-accent" : "border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                         )}
                       >
                         <Sun className="w-5 h-5" />
                         <span className="text-sm font-medium">Light</span>
                       </button>
                       <button
                         onClick={() => setTheme('dark')}
                         className={cn(
                           "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                           theme === 'dark' ? "border-accent bg-accent/5 text-accent" : "border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                         )}
                       >
                         <Moon className="w-5 h-5" />
                         <span className="text-sm font-medium">Dark</span>
                       </button>
                       <button
                         onClick={() => setTheme('system')}
                         className={cn(
                           "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                           theme === 'system' ? "border-accent bg-accent/5 text-accent" : "border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                         )}
                       >
                         <Monitor className="w-5 h-5" />
                         <span className="text-sm font-medium">System</span>
                       </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <label className="text-sm font-medium text-text-primary block mb-3">Typography</label>
                    <div className="flex flex-col gap-3">
                       <button
                         onClick={() => setFontFamily('sans')}
                         className={cn(
                           "flex items-center justify-between p-3 rounded-lg border transition-colors font-sans",
                           fontFamily === 'sans' ? "border-accent bg-accent/5 text-accent" : "border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                         )}
                       >
                         <div className="flex items-center gap-3">
                           <Type className="w-4 h-4" />
                           <span className="text-sm font-medium">Sans-serif (Inter)</span>
                         </div>
                       </button>
                       <button
                         onClick={() => setFontFamily('serif')}
                         className={cn(
                           "flex items-center justify-between p-3 rounded-lg border transition-colors font-serif",
                           fontFamily === 'serif' ? "border-accent bg-accent/5 text-accent" : "border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                         )}
                       >
                         <div className="flex items-center gap-3">
                           <Type className="w-4 h-4" />
                           <span className="text-sm font-medium">Serif (Merriweather)</span>
                         </div>
                       </button>
                       <button
                         onClick={() => setFontFamily('mono')}
                         className={cn(
                           "flex items-center justify-between p-3 rounded-lg border transition-colors font-mono",
                           fontFamily === 'mono' ? "border-accent bg-accent/5 text-accent" : "border-border text-text-secondary hover:bg-surface hover:text-text-primary"
                         )}
                       >
                         <div className="flex items-center gap-3">
                           <Type className="w-4 h-4" />
                           <span className="text-sm font-medium">Monospace (JetBrains)</span>
                         </div>
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">Editor Preferences</h3>
                  <p className="text-sm text-text-muted mb-6">Customize your reading and writing experience.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div>
                      <h4 className="font-medium text-text-primary mb-1">Full Width Mode</h4>
                      <p className="text-sm text-text-muted">Use the entire screen width for your notes.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={fullWidth}
                        onChange={(e) => setFullWidth(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'whiteboard' && (
              <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">Whiteboard Settings</h3>
                  <p className="text-sm text-text-muted mb-6">Customize the behavior of the interactive whiteboard.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div>
                      <h4 className="font-medium text-text-primary mb-1">Pan on Empty Click</h4>
                      <p className="text-sm text-text-muted">
                        Allow panning by dragging on an empty space instead of holding Space or using Hand tool.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={panOnEmptyClick}
                          onChange={(e) => setPanOnEmptyClick(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sync' && (
              <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">Google Drive Sync</h3>
                  <p className="text-sm text-text-muted mb-6">Backup your data to your personal Google Drive account.</p>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col p-5 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-text-primary mb-1">Status</h4>
                        <p className="text-sm text-text-muted">
                          {isConnected || accessToken ? 'Connected to Google Drive' : 'Not connected'}
                        </p>
                      </div>
                      <Cloud className={cn("w-6 h-6", (isConnected || accessToken) ? "text-accent" : "text-text-muted")} />
                    </div>

                    {!isConnected && !accessToken ? (
                      <Button 
                        onClick={async () => {
                          try {
                            setIsSyncingUI(true);
                            await googleDriveSync.login();
                            toast.success('Successfully connected to Google Drive');
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to connect to Google Drive');
                          } finally {
                            setIsSyncingUI(false);
                          }
                        }}
                        disabled={isSyncingUI}
                        className="w-full"
                      >
                        Connect Google Drive
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-sm text-text-muted bg-surface p-3 rounded-lg">
                          Last Synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
                        </div>
                        
                        <div className="flex gap-3">
                          <Button 
                            onClick={async () => {
                              try {
                                setIsSyncingUI(true);
                                toast.loading('Backing up to Drive...', { id: 'sync' });
                                await googleDriveSync.backup();
                                toast.success('Backup completed successfully', { id: 'sync' });
                              } catch (err) {
                                console.error(err);
                                toast.error(err instanceof Error ? err.message : 'Failed to backup', { id: 'sync' });
                              } finally {
                                setIsSyncingUI(false);
                              }
                            }}
                            disabled={isSyncingUI}
                            className="flex-1"
                          >
                            <Upload className="w-4 h-4 mr-2" /> Backup Now
                          </Button>

                          <Button 
                            onClick={async () => {
                              if (!window.confirm('WARNING: Restoring will overwrite all local data. Continue?')) return;
                              try {
                                setIsSyncingUI(true);
                                toast.loading('Restoring from Drive...', { id: 'sync' });
                                await googleDriveSync.restore();
                                toast.success('Restore completed successfully', { id: 'sync' });
                              } catch (err) {
                                console.error(err);
                                toast.error('Failed to restore. Make sure a backup exists.', { id: 'sync' });
                              } finally {
                                setIsSyncingUI(false);
                              }
                            }}
                            disabled={isSyncingUI}
                            variant="outline"
                            className="flex-1 border-border"
                          >
                            <Download className="w-4 h-4 mr-2" /> Restore
                          </Button>
                        </div>

                        <Button 
                          onClick={disconnect}
                          variant="ghost"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">Data & Storage</h3>
                  <p className="text-sm text-text-muted mb-6">Manage your local database, backups, and storage.</p>
                </div>

                <div className="space-y-6">
                  
                  {/* Storage Usage */}
                  <div className="flex flex-col p-5 rounded-xl border border-border bg-card">
                    <h4 className="font-medium text-text-primary mb-1">Storage Usage</h4>
                    <p className="text-sm text-text-muted mb-4">
                      Bergson stores everything locally in your browser. 
                    </p>
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-accent" />
                      <div>
                        <span className="text-xl font-bold text-text-primary">
                          {(storageUsage.usage / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <span className="text-sm text-text-muted ml-2">used</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Up Storage */}
                  <div className="flex items-start justify-between p-5 rounded-xl border border-border bg-card">
                    <div className="pr-6">
                      <h4 className="font-medium text-text-primary mb-1">Clean Up Storage</h4>
                      <p className="text-sm text-text-muted leading-relaxed">
                        Permanently delete orphaned images that are no longer used in any documents to free up space.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleCleanup}
                      disabled={isCleaning}
                      className="border-border min-w-[120px]"
                    >
                      {isCleaning ? 'Cleaning...' : 'Clean Up'}
                    </Button>
                  </div>

                  {/* Export */}
                  <div className="flex items-start justify-between p-5 rounded-xl border border-border bg-card">
                    <div className="pr-6">
                      <h4 className="font-medium text-text-primary mb-1">Export Backup</h4>
                      <p className="text-sm text-text-muted leading-relaxed">
                        Download all your pages, whiteboards, and images into a single file. 
                        Keep this file safe to prevent data loss.
                      </p>
                    </div>
                    <Button 
                      onClick={handleExport}
                      disabled={isExporting}
                      className="shrink-0 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> 
                      {isExporting ? 'Exporting...' : 'Export'}
                    </Button>
                  </div>

                  {/* Import */}
                  <div className="flex items-start justify-between p-5 rounded-xl border border-border bg-card">
                    <div className="pr-6">
                      <h4 className="font-medium text-text-primary mb-1">Restore Backup</h4>
                      <p className="text-sm text-text-muted leading-relaxed">
                        Restore your data from a previously exported Bergson backup file. 
                        <span className="text-yellow-500 font-medium ml-1">This will overwrite current data.</span>
                      </p>
                    </div>
                    <div>
                      <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleImport} 
                        className="hidden" 
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        variant="outline"
                        className="shrink-0 flex items-center gap-2 border-border hover:bg-surface-hover"
                      >
                        <Upload className="w-4 h-4" /> 
                        {isImporting ? 'Restoring...' : 'Restore'}
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <h3 className="text-sm font-bold text-destructive uppercase tracking-wider mb-4">Danger Zone</h3>
                    <div className="flex items-start justify-between p-5 rounded-xl border border-destructive/20 bg-destructive/5">
                      <div className="pr-6">
                        <h4 className="font-medium text-destructive mb-1">Factory Reset</h4>
                        <p className="text-sm text-text-muted leading-relaxed">
                          Permanently delete all your notes, folders, and whiteboards from this browser.
                          This action cannot be undone.
                        </p>
                      </div>
                      <Button 
                        onClick={() => {
                          if(window.confirm('CRITICAL WARNING: This will permanently delete ALL data in Bergson. Type "OK" to confirm.')) {
                            wipeDatabase();
                          }
                        }}
                        variant="destructive"
                        className="shrink-0 flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" /> 
                        Wipe Data
                      </Button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
