import React from 'react';

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
};

interface TimelineItemProps {
  children: React.ReactNode;
  isLast?: boolean;
  className?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ children, isLast = false, className = '' }) => {
  return (
    <div className={`relative flex gap-6 ${className}`}>
      {!isLast && <div className="absolute left-[17.5px] top-6 bottom-[-24px] w-px bg-gray-100"></div>}
      {children}
    </div>
  );
};

interface TimelineIconProps {
  children: React.ReactNode;
  className?: string;
}

export const TimelineIcon: React.FC<TimelineIconProps> = ({ children, className = '' }) => {
  return (
    <div className="relative shrink-0">
      <div className={`w-9 h-9 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 z-10 ${className}`}>
        {children}
      </div>
    </div>
  );
};

interface TimelineContentProps {
  children: React.ReactNode;
  className?: string;
}

export const TimelineContent: React.FC<TimelineContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex-1 ${className}`}>
      {children}
    </div>
  );
};
