'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ProfileEditView } from '@/components/features/auth/ProfileEditView';

export default function ProfileSettingsPage() {
  const { user } = useAppStore();
  
  if (!user) return null;

  return <ProfileEditView user={user} onUpdate={() => window.location.reload()} />;
}
