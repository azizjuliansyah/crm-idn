import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastType } from '@/components/ui';

interface KanbanItem {
  id: number;
  kanban_order?: number;
  [key: string]: any;
}

interface UseKanbanReorderOptions {
  table: string;
  statusField?: string;
  user_id?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  logActivity?: boolean;
  activityTable?: string;
  idField?: string;
}

/**
 * Hook to handle kanban reordering logic and Supabase updates.
 * Centralizes the calculation of kanban_order and activity logging.
 */
export function useKanbanReorder<T extends KanbanItem>(options: UseKanbanReorderOptions) {
  const {
    table,
    statusField = 'status',
    user_id,
    onSuccess,
    onError,
    logActivity = false,
    idField = 'id'
  } = options;

  const calculateNewOrder = (
    targetColumnCards: T[],
    draggedId: number,
    index?: number
  ): number => {
    const cardsWithoutDragged = targetColumnCards.filter(c => c.id !== draggedId);
    
    if (cardsWithoutDragged.length === 0) {
      return 1000;
    }

    if (index === undefined || index >= cardsWithoutDragged.length) {
      const lastCard = cardsWithoutDragged[cardsWithoutDragged.length - 1];
      return (lastCard.kanban_order || 0) + 1000;
    }

    if (index <= 0) {
      const firstCard = cardsWithoutDragged[0];
      return (firstCard.kanban_order || 0) - 1000;
    }

    const cardBefore = cardsWithoutDragged[index - 1];
    const cardAfter = cardsWithoutDragged[index];
    return ((cardBefore.kanban_order || 0) + (cardAfter.kanban_order || 0)) / 2;
  };

  const handleReorder = async (
    itemData: T[], // Current local state
    setItemData: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    newStatus: string,
    index?: number,
    oldStatus?: string
  ) => {
    try {
      const targetColumnCards = itemData
        .filter(item => String(item[statusField]) === newStatus)
        .sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

      const newOrder = calculateNewOrder(targetColumnCards, id, index);

      // Optimistic Update
      setItemData(prev => prev.map(item =>
        item.id === id ? { ...item, [statusField]: newStatus, kanban_order: newOrder } : item
      ));

      // Network Update
      const { error } = await supabase
        .from(table)
        .update({ [statusField]: newStatus, kanban_order: newOrder })
        .eq(idField, id);

      if (error) throw error;

      // Log activity if enabled
      if (logActivity && user_id && oldStatus && oldStatus !== newStatus) {
        const activityData: any = {
          user_id,
          content: `Status changed from ${oldStatus} to ${newStatus}`,
          activity_type: 'status_change',
        };
        
        // Add relationship field (e.g., lead_id or deal_id)
        if (table === 'leads') activityData.lead_id = id;
        if (table === 'deals') activityData.deal_id = id;

        await supabase.from('log_activities').insert(activityData);
      }

      onSuccess?.(`Status berhasil diubah ke ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      console.error('Kanban Reorder Error:', err);
      onError?.(err.message || 'Gagal mengubah status');
      // Caller should trigger a refresh/rollback if error occurs
      throw err; 
    }
  };

  return { handleReorder };
}
