'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loader} />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  return (
    <div className={styles.appLayout}>
      <Sidebar />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
