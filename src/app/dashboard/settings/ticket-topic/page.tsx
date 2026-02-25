'use client';

import { useDashboard } from '@/app/dashboard/DashboardContext';
import { TicketTopicSettingsView } from '@/components/features/settings/TicketTopicSettingsView';

export default function TicketTopicSettingsPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return null;

  return (
    <div className="mx-auto space-y-8">
      <TicketTopicSettingsView company={activeCompany} />
    </div>
  );
}
