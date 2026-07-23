import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';
import { usePageManagement } from '@/hooks/usePageManagement';
import { getPageUrl } from '@/utils/navigation';
import { cn } from '@/utils';
import type { Page } from '@/types';
import { DayViewModal } from '@/components/calendar/DayViewModal';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { pages, loadPages } = useSidebar();
  const { createPage } = usePageManagement();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const formatDateString = (y: number, m: number, d: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  const calendarData = useMemo(() => {
    const data: Record<string, { createdPages: Page[]; deadlines: { id: string; title: string; type: string }[] }> = {};
    
    pages.forEach(page => {
      // Find created date
      const createdDate = new Date(page.createdAt);
      const createdStr = formatDateString(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      
      if (!data[createdStr]) data[createdStr] = { createdPages: [], deadlines: [] };
      data[createdStr].createdPages.push(page);
      
      // Find deadlines
      if (page.tags) {
        page.tags.forEach(tag => {
          const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
          if (normalizedTag.startsWith('deadline-')) {
            const dateStr = normalizedTag.replace('deadline-', '').trim();
            if (!data[dateStr]) data[dateStr] = { createdPages: [], deadlines: [] };
            data[dateStr].deadlines.push({ id: page.id!, title: page.title, type: page.type });
          }
        });
      }
    });
    
    return data;
  }, [pages]);

  const handleDateClick = (y: number, m: number, d: number) => {
    const dateStr = formatDateString(y, m, d);
    setSelectedDate(dateStr);
  };

  const handleCreate = async (type: 'page' | 'whiteboard') => {
    // If they create from the calendar, the page will naturally have today's createdAt.
    // If we wanted to fake it to the selected date, we'd have to modify createdAt in db,
    // which Dexie supports but we don't have that in createPage right now.
    // We will just create normally.
    const title = 'Untitled ' + (type === 'page' ? 'Page' : 'Whiteboard');
    const newPage = await createPage({ title, type });
    await loadPages();
    navigate(getPageUrl(newPage));
  };

  const handleDeadlineClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    const p = pages.find(x => x.id === pageId);
    if (p) navigate(getPageUrl(p));
  };

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`blank-${i}`} className="min-h-32 border-b border-r border-border/30 bg-surface/30" />);
  
  const todayStr = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = formatDateString(year, month, d);
    const isToday = dateStr === todayStr;
    const dayData = calendarData[dateStr];
    
    return (
      <div 
        key={`day-${d}`} 
        onClick={() => handleDateClick(year, month, d)}
        className={cn(
          "min-h-32 p-2 border-b border-r border-border/30 bg-card hover:bg-surface-hover transition-colors cursor-pointer flex flex-col group relative",
          isToday && "bg-accent/5"
        )}
      >
        <div className="flex items-center justify-between mb-2 shrink-0">
          <span className={cn(
            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
            isToday ? "bg-accent text-accent-foreground" : "text-text-primary group-hover:text-accent transition-colors"
          )}>
            {d}
          </span>
          {dayData?.createdPages?.length > 0 && (
            <span 
              className="text-xs font-semibold text-text-secondary bg-surface rounded-full px-1.5 border border-border/50"
              title={`${dayData.createdPages.length} documents created`}
            >
              {dayData.createdPages.length}
            </span>
          )}
        </div>
        
        <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
          {dayData?.deadlines.map(deadline => (
            <div 
              key={deadline.id}
              onClick={(e) => handleDeadlineClick(e, deadline.id)}
              className="text-xs bg-red-500/10 text-red-400 px-1.5 py-1 rounded truncate border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium shadow-sm"
              title={deadline.title}
            >
              {deadline.title || 'Untitled'}
            </div>
          ))}
        </div>
      </div>
    );
  });

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-semibold text-text-primary">Calendar</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleToday}
            className="px-3 py-1.5 text-sm font-medium text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-md transition-colors"
          >
            Today
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-medium text-text-primary w-40 text-center">
              {monthNames[month]} {year}
            </h2>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="grid border-b border-border bg-surface" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {dayNames.map(day => (
              <div key={day} className="py-3 text-center text-sm font-semibold text-text-secondary border-r border-border/30 last:border-r-0 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {blanks}
            {days}
          </div>
        </div>
      </div>
      
      <DayViewModal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        dateStr={selectedDate || ''}
        createdPages={selectedDate && calendarData[selectedDate]?.createdPages ? calendarData[selectedDate].createdPages : []}
        deadlines={selectedDate && calendarData[selectedDate]?.deadlines ? calendarData[selectedDate].deadlines : []}
        onCreate={handleCreate}
        onNavigate={(id) => {
          const p = pages.find(x => x.id === id);
          if (p) navigate(getPageUrl(p));
        }}
      />
    </div>
  );
};
