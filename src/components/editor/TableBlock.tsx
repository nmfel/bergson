import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Hash, Calendar, CheckSquare, Tag, AlignLeft, ArrowDownUp, ChevronDown, MoreVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Block } from '../../types';
import { cn } from '../../utils';
import { safeParse } from '../../utils/safeParse';

interface TableBlockProps {
  block: Block;
  onUpdate: (id: string, content: string) => void;
}

export type ColumnType = 'text' | 'number' | 'date' | 'checkbox' | 'tag';

export interface TableColumn {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
}

export interface TableRow {
  id: string;
  cells: Record<string, any>;
}

export interface AdvancedTableData {
  version: 2;
  columns: TableColumn[];
  rows: TableRow[];
}

const TYPE_ICONS: Record<ColumnType, React.FC<any>> = {
  text: AlignLeft,
  number: Hash,
  date: Calendar,
  checkbox: CheckSquare,
  tag: Tag
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const TagCombobox = ({ value, options, onChange }: { value: string, options: string[], onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Reset search when opening
  useEffect(() => { if (open) setSearch(''); }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1 w-auto px-2 py-0.5 rounded-full text-xs font-medium border border-transparent bg-surface-hover outline-none hover:border-border transition-colors whitespace-nowrap", value ? "text-accent border-accent/30 bg-accent/10" : "text-text-muted")}>
          {value || 'Add tag'}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2 flex flex-col gap-2" align="start">
        <input 
          autoFocus
          className="w-full text-sm bg-surface-hover border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent"
          placeholder="Type a tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
             if (e.key === 'Enter' && search) {
                onChange(search);
                setOpen(false);
             }
          }}
        />
        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
          {filtered.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className="text-left px-2 py-1.5 text-sm rounded-md hover:bg-surface-hover transition-colors">
              <div className="inline-block px-2 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded-full text-xs font-medium">{opt}</div>
            </button>
          ))}
          {search && !options.find(o => o.toLowerCase() === search.toLowerCase()) && (
            <button onClick={() => { onChange(search); setOpen(false); }} className="text-left px-2 py-1.5 text-sm rounded-md hover:bg-surface-hover transition-colors flex items-center gap-2 text-text-muted">
              <Plus className="w-3 h-3" /> Create "{search}"
            </button>
          )}
          {options.length === 0 && !search && (
            <div className="text-xs text-text-muted p-2 text-center">Type to create a tag</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const TableBlock: React.FC<TableBlockProps> = ({ block, onUpdate }) => {
  const [data, setData] = useState<AdvancedTableData | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    const defaultCols: TableColumn[] = [
      { id: `col_${generateId()}`, name: 'Name', type: 'text' },
      { id: `col_${generateId()}`, name: 'Tags', type: 'tag' },
      { id: `col_${generateId()}`, name: 'Status', type: 'checkbox' }
    ];
    const defaultRows: TableRow[] = [
      { id: `row_${generateId()}`, cells: {} },
      { id: `row_${generateId()}`, cells: {} },
      { id: `row_${generateId()}`, cells: {} }
    ];
    const defaultData: AdvancedTableData = { version: 2, columns: defaultCols, rows: defaultRows };

    const parsedData = safeParse<AdvancedTableData>(block.content, defaultData, (parsed, defaults) => {
      // If it's already version 2, just shallow merge root to be safe
      if (parsed.version === 2) {
        return { ...defaults, ...parsed };
      }
      
      // Migrate from old 2D array format (if it was an array of arrays)
      if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
        const columns = parsed[0].map((header: string, i: number) => ({
          id: `col_${generateId()}_${i}`,
          name: header || `Column ${i + 1}`,
          type: 'text' as ColumnType
        }));
        const rows = parsed.slice(1).map((row: string[], i: number) => {
          const cells: Record<string, any> = {};
          columns.forEach((col: TableColumn, j: number) => {
            cells[col.id] = row[j] || '';
          });
          return { id: `row_${generateId()}_${i}`, cells };
        });
        return { version: 2, columns, rows };
      }
      
      // If it's version 1 or undefined (old schema), migrate it manually to prevent data loss
      const oldColumns = Array.isArray(parsed.columns) ? parsed.columns : defaults.columns;
      const oldRows = Array.isArray(parsed.rows) ? parsed.rows : [];
      
      return {
        version: 2,
        columns: oldColumns.map((c: any) => ({
          id: c.id || `col_${generateId()}`,
          name: c.name || 'Unnamed',
          type: c.type || 'text',
          width: c.width
        })),
        rows: oldRows.map((r: any) => ({
          id: r.id || `row_${generateId()}`,
          cells: r.cells || {}
        }))
      };
    });

    setData(parsedData);
    
    // Only update DB if the schema actually needed migration to prevent endless sync loops
    if (block.content !== JSON.stringify(parsedData)) {
       onUpdate(block.id!, JSON.stringify(parsedData));
    }
  }, [block.content, block.id]);

  const updateState = (newData: AdvancedTableData) => {
    setData(newData);
    onUpdate(block.id!, JSON.stringify(newData));
  };

  const updateCell = (rowId: string, colId: string, value: any) => {
    if (!data) return;
    const newRows = data.rows.map(r => 
      r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
    );
    updateState({ ...data, rows: newRows });
  };



  const insertRow = (rowIndex: number, direction: 'above' | 'below') => {
    if (!data) return;
    const newCells: Record<string, any> = {};
    data.columns.forEach(col => {
      newCells[col.id] = col.type === 'checkbox' ? false : '';
    });
    const newRow = { id: `row_${generateId()}`, cells: newCells };
    const newRows = [...data.rows];
    newRows.splice(direction === 'above' ? rowIndex : rowIndex + 1, 0, newRow);
    updateState({ ...data, rows: newRows });
  };



  const insertColumn = (colIndex: number, direction: 'left' | 'right') => {
    if (!data) return;
    const newColId = `col_${generateId()}`;
    const newCol: TableColumn = { id: newColId, name: `Col ${data.columns.length + 1}`, type: 'text' };
    const newCols = [...data.columns];
    const targetIdx = direction === 'left' ? colIndex : colIndex + 1;
    newCols.splice(targetIdx, 0, newCol);
    const newRows = data.rows.map(r => ({
      ...r,
      cells: { ...r.cells, [newColId]: '' }
    }));
    updateState({ ...data, columns: newCols, rows: newRows });
  };

  const deleteRow = (rowId: string) => {
    if (!data || data.rows.length <= 1) return;
    updateState({ ...data, rows: data.rows.filter(r => r.id !== rowId) });
  };

  const deleteColumn = (colId: string) => {
    if (!data || data.columns.length <= 1) return;
    const newCols = data.columns.filter(c => c.id !== colId);
    const newRows = data.rows.map(r => {
      const newCells = { ...r.cells };
      delete newCells[colId];
      return { ...r, cells: newCells };
    });
    updateState({ ...data, columns: newCols, rows: newRows });
  };

  const updateColumnType = (colId: string, type: ColumnType) => {
    if (!data) return;
    const newCols = data.columns.map(c => c.id === colId ? { ...c, type } : c);
    // Optionally wipe incompatible data
    const newRows = data.rows.map(r => {
      const newCells = { ...r.cells };
      if (type === 'checkbox') newCells[colId] = !!newCells[colId];
      else if (type === 'number') newCells[colId] = Number(newCells[colId]) || '';
      return { ...r, cells: newCells };
    });
    updateState({ ...data, columns: newCols, rows: newRows });
  };

  const updateColumnName = (colId: string, name: string) => {
    if (!data) return;
    updateState({
      ...data,
      columns: data.columns.map(c => c.id === colId ? { ...c, name } : c)
    });
  };

  const sortTable = (colId: string, ascending: boolean = true) => {
    if (!data) return;
    const sortedRows = [...data.rows].sort((a, b) => {
      const valA = a.cells[colId];
      const valB = b.cells[colId];
      if (valA === valB) return 0;
      if (!valA) return ascending ? 1 : -1;
      if (!valB) return ascending ? -1 : 1;
      const res = valA < valB ? -1 : 1;
      return ascending ? res : -res;
    });
    updateState({ ...data, rows: sortedRows });
  };

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    if (!data) return;
    const startX = e.clientX;
    const col = data.columns.find(c => c.id === colId);
    const startWidth = col?.width || 150;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (e.clientX - startX));
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(c => c.id === colId ? { ...c, width: newWidth } : c)
        };
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setData(prev => {
        if (prev) onUpdate(block.id!, JSON.stringify(prev));
        return prev;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!data) return null;

  // Calculate footer totals
  const footers: Record<string, string> = {};
  data.columns.forEach(col => {
    if (col.type === 'number') {
      let sum = 0;
      data.rows.forEach(r => {
        const val = Number(r.cells[col.id]);
        if (!isNaN(val)) sum += val;
      });
      footers[col.id] = `Sum: ${sum}`;
    } else if (col.type === 'text') {
      let count = 0;
      data.rows.forEach(r => {
        if (r.cells[col.id] && String(r.cells[col.id]).trim().length > 0) count++;
      });
      footers[col.id] = count > 0 ? `${count} rows` : '';
    }
  });

  return (
    <div className="relative group/table mb-1 max-w-full overflow-x-auto custom-scrollbar pb-2 pt-2">
      <div className="inline-block border border-transparent group-hover/table:border-border rounded-lg bg-card overflow-visible transition-colors min-w-max">
        <table className="border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {data.columns.map((col, index) => {
                const Icon = TYPE_ICONS[col.type];
                const width = col.width || 150;
                return (
                  <th key={col.id} style={{ width }} className="group/th relative border border-border bg-surface font-medium text-text-secondary p-0 text-left align-middle">
                    <div className={cn("flex items-center gap-2 w-full p-2", index === 0 && "pl-8")}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex-shrink-0 p-1 hover:bg-surface-hover rounded transition-colors outline-none text-text-muted hover:text-text-primary">
                          <Icon className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-popover border-border text-text-primary shadow-lg">
                          <div className="px-2 py-1.5 text-xs font-medium text-text-muted">Column Type</div>
                          {(Object.entries(TYPE_ICONS) as [ColumnType, React.FC<any>][]).map(([type, TypeIcon]) => (
                            <DropdownMenuItem 
                              key={type}
                              onClick={() => updateColumnType(col.id, type as ColumnType)}
                              className={cn(
                                "cursor-pointer gap-2",
                                col.type === type ? "bg-accent/10 text-accent" : "hover:bg-surface-hover focus:bg-surface-hover"
                              )}
                            >
                              <TypeIcon className="w-4 h-4" />
                              <span className="capitalize">{type}</span>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem onClick={() => sortTable(col.id, true)} className="cursor-pointer gap-2 hover:bg-surface-hover focus:bg-surface-hover">
                            <ArrowDownUp className="w-4 h-4" /> Sort Ascending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sortTable(col.id, false)} className="cursor-pointer gap-2 hover:bg-surface-hover focus:bg-surface-hover">
                            <ArrowDownUp className="w-4 h-4" /> Sort Descending
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem onClick={() => insertColumn(index, 'left')} className="cursor-pointer gap-2 hover:bg-surface-hover focus:bg-surface-hover">
                            <ArrowLeft className="w-4 h-4" /> Insert Left
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => insertColumn(index, 'right')} className="cursor-pointer gap-2 hover:bg-surface-hover focus:bg-surface-hover">
                            <ArrowRight className="w-4 h-4" /> Insert Right
                          </DropdownMenuItem>
                          {data.columns.length > 1 && (
                            <>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem onClick={() => deleteColumn(col.id)} className="cursor-pointer gap-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 focus:bg-red-500/10">
                                <Trash2 className="w-4 h-4" /> Delete Column
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumnName(col.id, e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-text-primary font-medium w-full"
                        placeholder="Title"
                      />
                    </div>
                    
                    {/* Resizer Handle */}
                    <div
                      className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-accent z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart(e, col.id)}
                    />
                    
                    <button
                      onClick={() => insertColumn(index, 'right')}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/th:opacity-100 w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover bg-surface/80 backdrop-blur-sm rounded-full shadow-sm z-10 border border-border transition-all"
                      title="Insert Column Right"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={row.id} className="group/row">
                {data.columns.map((col, colIndex) => (
                  <td 
                    key={`${row.id}-${col.id}`} 
                    style={{ width: col.width || 150 }} 
                    className="border border-border relative group/cell p-0 m-0 align-top bg-card hover:bg-surface-hover transition-colors"
                    onMouseEnter={() => setHoveredRow(row.id)} 
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    
                    <div className={cn("w-full h-full min-h-[40px] flex items-start px-3 py-2", colIndex === 0 ? "pl-1" : "pl-3")}>
                      {colIndex === 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn("flex-shrink-0 p-1 mt-0.5 mr-1.5 hover:bg-surface-hover rounded outline-none text-text-muted hover:text-text-primary transition-opacity", hoveredRow === row.id ? "opacity-100" : "opacity-0")}>
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" side="right" className="w-40 bg-popover border-border text-text-primary shadow-lg">
                            <DropdownMenuItem onClick={() => insertRow(rowIndex, 'above')} className="cursor-pointer gap-2 hover:bg-surface-hover">
                              <ArrowUp className="w-4 h-4" /> Insert Above
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertRow(rowIndex, 'below')} className="cursor-pointer gap-2 hover:bg-surface-hover">
                              <ArrowDown className="w-4 h-4" /> Insert Below
                            </DropdownMenuItem>
                            {data.rows.length > 1 && (
                              <>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem onClick={() => deleteRow(row.id)} className="cursor-pointer gap-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 focus:bg-red-500/10">
                                  <Trash2 className="w-4 h-4" /> Delete Row
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {col.type === 'text' && (
                        <TextareaAutosize
                          value={row.cells[col.id] || ''}
                          onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                          className="w-full bg-transparent resize-none outline-none text-text-primary"
                          placeholder=""
                        />
                      )}
                      
                      {col.type === 'number' && (
                        <input
                          type="number"
                          value={row.cells[col.id] || ''}
                          onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder=""
                        />
                      )}

                      {col.type === 'date' && (
                        <input
                          type="date"
                          value={row.cells[col.id] || ''}
                          onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-text-primary cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
                        />
                      )}

                      {col.type === 'checkbox' && (
                        <div className="w-full flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={!!row.cells[col.id]}
                            onChange={(e) => updateCell(row.id, col.id, e.target.checked)}
                            className="w-4 h-4 accent-accent cursor-pointer"
                          />
                        </div>
                      )}

                      {col.type === 'tag' && (
                        <div className="flex items-center">
                          <TagCombobox 
                            value={row.cells[col.id] || ''}
                            options={Array.from(new Set(data.rows.map(r => r.cells[col.id]).filter(v => typeof v === 'string' && v.trim() !== '')))}
                            onChange={(val) => updateCell(row.id, col.id, val)}
                          />
                        </div>
                      )}
                    </div>

                    {colIndex === 0 && rowIndex === data.rows.length - 1 && (
                      <button
                        onClick={() => insertRow(rowIndex, 'below')}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/table:opacity-100 w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover bg-surface/80 backdrop-blur-sm rounded-full shadow-sm z-10 border border-border transition-all"
                        title="Add Row"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            
            {/* Calculation Footer */}
            <tr className="bg-surface/50 font-medium text-text-secondary text-xs">
              {data.columns.map(col => (
                <td key={`footer-${col.id}`} className="border-t border-border px-3 py-2 text-right">
                  {footers[col.id] || ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
