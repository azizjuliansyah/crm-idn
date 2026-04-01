'use client';

import React from 'react';
import { GanttBoard } from '@/components/shared/GanttBoard/GanttBoard';
import { Task, TaskStage, Project } from '@/lib/types';

interface Props {
  tasks: Task[];
  stages: TaskStage[];
  project: Project | null;
  onTaskClick: (task: Task) => void;
}

const getStageColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'todo':
    case 'to do': return 'bg-sky-500';
    case 'in progress':
    case 'working': return 'bg-amber-500';
    case 'done':
    case 'completed': return 'bg-emerald-500';
    case 'on hold': return 'bg-gray-500';
    case 'cancelled': return 'bg-rose-500';
    default: return 'bg-blue-500';
  }
};

export const TasksGanttView: React.FC<Props> = ({
  tasks,
  stages,
  project,
  onTaskClick
}) => {
  return (
    <GanttBoard
      items={tasks as any[]}
      stages={stages.map(s => ({
        id: s.id.toString(),
        name: s.name,
        colorClass: getStageColor(s.name)
      }))}
      projectStartDate={project?.start_date}
      projectEndDate={project?.end_date}
      onTaskClick={onTaskClick}
    />
  );
};
