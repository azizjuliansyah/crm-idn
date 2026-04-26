import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Check if the user has the ADMIN platform role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('platform_role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.platform_role !== 'ADMIN') {
    // If not admin, redirect to standard dashboard or an unauthorized page
    redirect('/dashboard');
  }

  return (
    <div className="w-full">
      {children}
    </div>
  );
}
