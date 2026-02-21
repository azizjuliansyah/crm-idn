'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ProfileEditView } from '@/components/ProfileEditView';

export default function ProfileSettingsPage() {
  const { user } = useDashboard();
  
  if (!user) return null;

  return <ProfileEditView user={user} onUpdate={() => window.location.reload()} />;
}
