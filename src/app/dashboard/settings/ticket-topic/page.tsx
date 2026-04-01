'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { TicketTopicSettingsView } from '@/components/features/settings/TicketTopicSettingsView';

export default function TicketTopicSettingsPage() {
  const { activeCompany } = useAppStore();

  if (!activeCompany) return null;

  return (
    <div className="mx-auto space-y-8">
      <TicketTopicSettingsView company={activeCompany} />
    </div>
  );
}
