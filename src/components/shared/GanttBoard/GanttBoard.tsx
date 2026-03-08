import React, { useMemo, useState, useRef, useEffect } from 'react';
import { KanbanItem } from '../KanbanBoard/KanbanBoard';
import { Badge, Avatar, Subtext } from '@/components/ui';

interface GanttItem extends KanbanItem {
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  assigned_profile?: any;
  stage_id: string;
}

interface GanttBoardProps<T extends GanttItem> {
  items: T[];
  stages: { id: string; name: string; colorClass?: string }[];
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onTaskClick?: (task: T) => void;
}

export function GanttBoard<T extends GanttItem>({ items, stages, projectStartDate, projectEndDate, onTaskClick }: GanttBoardProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (containerRef.current && containerRef.current.scrollTop !== e.currentTarget.scrollTop) {
      containerRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (listRef.current && listRef.current.scrollTop !== e.currentTarget.scrollTop) {
      listRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Default timescale setup based on current time
  const today = new Date();

  // Create an array of days for the timeline header
  const timelineDays = useMemo(() => {
    let minDate: Date | null = projectStartDate ? new Date(projectStartDate) : null;
    let maxDate: Date | null = projectEndDate ? new Date(projectEndDate) : null;
    let hasDates = !!minDate || !!maxDate;

    items.forEach(task => {
      let taskStart = task.start_date ? new Date(task.start_date) : null;
      let taskEnd = task.end_date ? new Date(task.end_date) : null;

      // If one is missing, use the other
      if (taskStart && !taskEnd) taskEnd = new Date(taskStart);
      if (taskEnd && !taskStart) taskStart = new Date(taskEnd);

      if (taskStart && taskEnd) {
        if (!hasDates || (minDate && taskStart < minDate) || !minDate) minDate = new Date(taskStart);
        if (!hasDates || (maxDate && taskEnd > maxDate) || !maxDate) maxDate = new Date(taskEnd);
        hasDates = true;
      }
    });

    if (!minDate) minDate = new Date(today);
    if (!maxDate) maxDate = new Date(minDate);

    const paddingDays = 0; // Added padding so it doesn't look squished

    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - paddingDays + (currentMonthOffset * 30));

    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + paddingDays + (currentMonthOffset * 30));

    const days = [];
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [items, currentMonthOffset, projectStartDate, projectEndDate]);

  const timelineStart = timelineDays.length > 0 ? timelineDays[0].getTime() : 0;

  const getStageColor = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.colorClass || 'bg-blue-500';
  };

  // Use fixed base width but let flexbox handle stretching
  const dayWidth = 40; // minimum width of each day column in px
  const isStretching = containerRef.current && (timelineDays.length * dayWidth) < containerRef.current.clientWidth;

  // Force re-calculate when window resizes
  const [windowWidth, setWindowWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    // Initial trigger to calculate after mount
    setTimeout(() => setWindowWidth(window.innerWidth), 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateTaskStyle = (task: T) => {
    if (!task.start_date && !task.end_date) return null;

    const start = task.start_date ? new Date(task.start_date) : new Date(task.end_date as string);
    const end = task.end_date ? new Date(task.end_date) : new Date(task.start_date as string);

    // Normalize to start of day for accurate pixel calculation
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const startMs = start.getTime();
    const endMs = end.getTime();

    // Check if task is within visible timeline at all
    const timelineEnd = timelineDays.length > 0 ? timelineDays[timelineDays.length - 1].getTime() + (24 * 60 * 60 * 1000) : 0;
    if (endMs < timelineStart || startMs > timelineEnd) return null;

    // Calculate width for both cases
    let taskDurationDays = (endMs - startMs) / (1000 * 60 * 60 * 24);

    // Calculate left position (offset from timeline start)
    // When stretching, we need to calculate based on percentages to match the flex grid
    if (isStretching && containerRef.current) {
      const totalDays = timelineDays.length;
      const leftPercent = ((startMs - timelineStart) / (1000 * 60 * 60 * 24)) / totalDays * 100;
      
      if (startMs < timelineStart) {
        const hiddenDays = (timelineStart - startMs) / (1000 * 60 * 60 * 24);
        taskDurationDays -= hiddenDays;
      }
      taskDurationDays = Math.max(1, Math.min(taskDurationDays, totalDays));
      const widthPercent = (taskDurationDays / totalDays) * 100;

      return {
        left: `calc(${Math.max(0, leftPercent)}% + 5px)`,
        width: `calc(${widthPercent}% - 10px)`,
        display: 'flex'
      };
    }

    // Default calculated pixel positions for scrollable view
    const leftDays = Math.max(0, (startMs - timelineStart) / (1000 * 60 * 60 * 24));
    const leftPx = leftDays * dayWidth;

    // Adjust width if start is before timeline
    if (startMs < timelineStart) {
      const hiddenDays = (timelineStart - startMs) / (1000 * 60 * 60 * 24);
      taskDurationDays -= hiddenDays;
    }

    // Minimum width of 1 day if start == end
    taskDurationDays = Math.max(1, taskDurationDays);
    const widthPx = taskDurationDays * dayWidth;

    return {
      left: `calc(${leftPx}px + 5px)`,
      width: `calc(${widthPx}px - 10px)`,
      display: 'flex'
    };
  };

  // Group days by month for the top header row
  const months = useMemo(() => {
    const m = [];
    let currentMonth = -1;
    let span = 0;

    for (let i = 0; i < timelineDays.length; i++) {
      const mm = timelineDays[i].getMonth();
      if (mm !== currentMonth) {
        if (currentMonth !== -1) {
          m.push({
            label: timelineDays[i - 1].toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            span
          });
        }
        currentMonth = mm;
        span = 1;
      } else {
        span++;
      }
    }
    if (span > 0 && timelineDays.length > 0) {
      m.push({
        label: timelineDays[timelineDays.length - 1].toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        span
      });
    }
    return m;
  }, [timelineDays]);

  // Handle today button click
  const scrollToToday = () => {
    setCurrentMonthOffset(0);
    // Use timeout to wait for re-render if month changed
    setTimeout(() => {
      if (containerRef.current) {
        // Find index of today in timelineDays
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const todayIdx = timelineDays.findIndex(d => {
          d.setHours(0, 0, 0, 0);
          return d.getTime() === todayDate.getTime();
        });

        if (todayIdx !== -1) {
          const scrollLeft = (todayIdx * dayWidth) - (containerRef.current.clientWidth / 2) + (dayWidth / 2);
          containerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      }
    }, 100);
  };

  // Initial scroll to today
  useEffect(() => {
    scrollToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-gray-900 text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonthOffset(prev => prev - 1)}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
          >
            &lt;
          </button>
          <button
            onClick={scrollToToday}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition-colors uppercase"
          >
            Hari Ini
          </button>
          <button
            onClick={() => setCurrentMonthOffset(prev => prev + 1)}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
          >
            &gt;
          </button>
        </div>
        <div className="flex gap-3">
          {stages.slice(0, 4).map(s => (
            <div key={s.id} className="flex items-center gap-1.5 text-[10px] uppercase text-gray-500">
              <div className={`w-2 h-2 rounded-full ${s.colorClass || 'bg-gray-300'}`}></div>
              {s.name}
            </div>
          ))}
          {stages.length > 4 && <div className="text-[10px] uppercase text-gray-400">+{stages.length - 4} stage</div>}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Fixed Task List Column */}
        <div className="w-[300px] flex-shrink-0 border-r border-gray-100 bg-white z-20 flex flex-col shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="h-[73px] flex-shrink-0 border-b border-gray-100 flex flex-col justify-end p-3 uppercase text-xs font-semibold text-gray-500 bg-gray-50 relative z-30">
            Daftar Pekerjaan
          </div>
          {/* List */}
          <div 
             ref={listRef}
             className="overflow-y-auto flex-1 custom-scrollbar scrollbar-hide"
             onScroll={handleListScroll}
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-xs italic">Belum ada task</div>
            ) : (
              items.map(task => (
                <div
                  key={`list-${task.id}`}
                  className="h-16 border-b border-gray-50 flex items-center px-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-gray-800 truncate">{task.title}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {task.assigned_profile ? (
                        <>
                          <Avatar name={task.assigned_profile.full_name} src={task.assigned_profile.avatar_url} size="sm" className="w-4 h-4" />
                          <Subtext className="text-[9px] uppercase">{task.assigned_profile.full_name.split(' ')[0]}</Subtext>
                        </>
                      ) : (
                        <Subtext className="text-[9px] uppercase italic">Unassigned</Subtext>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto custom-scrollbar bg-[#fafafa] relative"
          onScroll={handleGridScroll}
          style={{ display: 'flex' }}
        >
          {/* We wrap everything to grow horizontally based on width */}
          <div className="flex flex-col min-h-full" style={isStretching ? { width: '100%' } : { width: `${timelineDays.length * dayWidth}px`, minWidth: 'max-content' }}>
            
            {/* Timeline Header (Sticky Top) */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
              {/* Months Row */}
              <div className="flex h-8 border-b border-gray-100">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className={`flex items-center px-3 text-xs font-medium text-gray-600 border-r border-gray-100 bg-gray-50 uppercase ${isStretching ? 'flex-[1_1_0%]' : ''}`}
                    style={isStretching ? { width: `${(m.span / timelineDays.length) * 100}%` } : { width: `${m.span * dayWidth}px`, flexShrink: 0 }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              {/* Days Row */}
              <div className="flex h-10">
                {timelineDays.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center border-r border-gray-100 flex-shrink-0
                        ${isToday ? 'bg-emerald-50 text-emerald-700 font-bold' : isWeekend ? 'bg-red-50 text-red-400' : 'text-gray-500'}
                        ${isStretching ? 'flex-1' : ''}
                      `}
                      style={isStretching ? {} : { width: `${dayWidth}px` }}
                    >
                      <span className="text-[9px] uppercase leading-none">{d.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                      <span className="text-xs mt-0.5">{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Grid Background & Task Bars - Vertical Scrolling Container */}
            <div 
              className="flex-1 overflow-y-auto scrollbar-hide relative" 
              style={{ overflowX: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={(e) => {
                // Also sync local grid Y-scroll to the left list
                if (listRef.current && listRef.current.scrollTop !== e.currentTarget.scrollTop) {
                  listRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
            >
              {/* Using full size container inside so rows map 1:1 with headers */}
              <div className="relative min-h-full">
                {/* Vertical grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {timelineDays.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                      <div
                        key={i}
                        className={`h-full border-r border-gray-50/50 flex-shrink-0 ${isWeekend ? 'bg-red-50' : ''} ${isStretching ? 'flex-1' : ''}`}
                        style={isStretching ? {} : { width: `${dayWidth}px` }}
                      />
                    );
                  })}
                </div>

                {/* Task rows */}
                <div className="relative z-10 flex flex-col">
                  {items.map((task) => {
                    const style = calculateTaskStyle(task);
                    return (
                      <div key={`row-${task.id}`} className="h-16 flex-shrink-0 border-b border-gray-100/50 relative group hover:bg-gray-50/30">
                        {style ? (
                          <div
                            className={`absolute top-2.5 h-10 rounded-lg shadow-sm border border-black/5 cursor-pointer flex items-center px-3 overflow-hidden transition-all hover:brightness-110 hover:shadow-md ${getStageColor(task.stage_id)}`}
                            style={{ left: style.left, width: style.width }}
                            onClick={() => onTaskClick?.(task)}
                            title={`${task.title} (${task.start_date || '?'} - ${task.end_date || '?'})`}
                          >
                            <span className="text-white text-[11px] font-medium truncate drop-shadow-sm">{task.title}</span>
                          </div>
                        ) : (
                          <div className="absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Badge variant="ghost" className="text-[9px] uppercase bg-gray-100 text-gray-400">Tidak ada tanggal set</Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
