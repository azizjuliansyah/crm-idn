import React, { useState } from 'react';
import { Label } from '@/components/ui';

export interface KanbanStage {
    id: string | number;
    name: string;
    colorClass?: string;
}

export interface KanbanItem {
    id: number;
    status: string;
    kanban_order?: number;
}

interface KanbanBoardProps<T extends KanbanItem> {
    stages: KanbanStage[];
    itemsByStatus: Record<string, T[]>;
    renderCard: (item: T, isDragged: boolean) => React.ReactNode;
    onReorder: (itemId: number, newStatus: string, newIndex?: number) => void;
}

export function KanbanBoard<T extends KanbanItem>({
    stages,
    itemsByStatus,
    renderCard,
    onReorder
}: KanbanBoardProps<T>) {
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<{ stage: string, index?: number } | null>(null);

    const draggedItem = draggedId ? Object.values(itemsByStatus).flat().find(i => i.id === draggedId) : null;

    const handleDragStart = (e: React.DragEvent, id: number) => {
        setDraggedId(id);

        // Attempt to set custom ghost drag image if element exists (requires card implementation to provide this id)
        const ghostEl = document.getElementById('kanban-drag-ghost');
        if (ghostEl) {
            e.dataTransfer.setDragImage(ghostEl, 20, 20);
        }
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDropTarget(null);
    };

    const handleDragOver = (e: React.DragEvent, stageName: string, index?: number) => {
        e.preventDefault();
        setDropTarget({ stage: stageName, index });
    };

    const handleDrop = (e: React.DragEvent, stageName: string, index?: number) => {
        e.preventDefault();
        setDropTarget(null);
        if (draggedId) {
            onReorder(draggedId, stageName, index);
            setDraggedId(null);
        }
    };

    return (
        <>
            {/* Hidden ghost element wrapper for custom drag images */}
            <div className="absolute top-0 left-[-9999px]">
                <div id="kanban-drag-ghost" className="w-[260px]">
                    {draggedItem && renderCard(draggedItem as T, false)}
                </div>
            </div>

            <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
                {stages.map((stage) => {
                    // Try to map by string id first (since we passed stage.name.toLowerCase() as id in some views), fallback to strict stringified id
                    const sKey = typeof stage.id === 'string' ? stage.id : stage.id.toString();

                    const columnItems = itemsByStatus[sKey] || [];

                    return (
                        <div
                            key={stage.id}
                            onDragOver={(e) => {
                                e.preventDefault();
                                // Only drop on column if we are not dropping on a specific card
                                if (!(e.target as HTMLElement).closest('.kanban-card')) {
                                    handleDragOver(e, sKey);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (!(e.target as HTMLElement).closest('.kanban-card')) {
                                    handleDrop(e, sKey);
                                }
                            }}
                            className="flex flex-col gap-3 min-w-[260px] w-[260px] h-full transition-all"
                        >
                            <div className={`p-4 ${stage.colorClass || 'bg-blue-500'} rounded-xl shadow-md flex items-center justify-between`}>
                                <Label className="text-[10px] uppercase tracking-tight text-white">{stage.name}</Label>
                                <Label className="text-[10px] text-white bg-white/20 px-2.5 py-0.5 rounded-full">{columnItems.length}</Label>
                            </div>

                            <div className={`flex-1 p-2 rounded-2xl border-2 border-dashed transition-all overflow-y-auto custom-scrollbar ${dropTarget?.stage === sKey && dropTarget?.index === undefined ? 'bg-blue-50/50 border-blue-300' : 'bg-gray-50/50 border-gray-200'}`}>

                                {/* Ensure an empty column has a min height to drop onto */}
                                {columnItems.length === 0 && (
                                    <div className="min-h-[100px] w-full"></div>
                                )}

                                {columnItems.map((item, index) => (
                                    <div key={item.id} className="relative kanban-card mb-2">
                                        {/* Drop Indicator Above */}
                                        {dropTarget?.stage === sKey && dropTarget?.index === index && (
                                            <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-50 pointer-events-none"></div>
                                        )}

                                        <div
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item.id)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();

                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const isTopHalf = (e.clientY - rect.top) < (rect.height / 2);
                                                const targetIndex = isTopHalf ? index : index + 1;

                                                handleDragOver(e, sKey, targetIndex);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();

                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const isTopHalf = (e.clientY - rect.top) < (rect.height / 2);
                                                const targetIndex = isTopHalf ? index : index + 1;

                                                handleDrop(e, sKey, targetIndex);
                                            }}
                                        >
                                            {renderCard(item, draggedId === item.id)}
                                        </div>

                                        {/* Drop Indicator Below Last Item */}
                                        {dropTarget?.stage === sKey && dropTarget?.index === index + 1 && index === columnItems.length - 1 && (
                                            <div className="absolute -bottom-0.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-50 pointer-events-none"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
